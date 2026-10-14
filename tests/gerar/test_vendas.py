import numpy as np
import pandas as pd
import pytest
from faker import Faker

from etl import modelo
from etl.config import DATA_CORTE, SEMENTE
from etl.gerar import catalogo, parceiros, unidades, vendas


@pytest.fixture(scope="module")
def simulado():
    rng = np.random.default_rng(SEMENTE)
    fake = Faker("pt_BR")
    fake.seed_instance(SEMENTE)
    u = unidades.gerar_unidades(rng)
    c = parceiros.gerar_corretores(rng, fake)
    return u, c, vendas.simular_vendas(u, c, rng)


def test_colunas_do_modelo(simulado):
    _, _, s = simulado
    for tabela in ("venda", "parcela", "pagamento"):
        assert list(s[tabela].columns) == modelo.COLUNAS[tabela]
        assert s[tabela]["id"].tolist() == list(range(1, len(s[tabela]) + 1))
    assert list(s["cliente_base"].columns) == ["id", "perfil"]


def test_uma_venda_ativa_por_unidade_e_nada_antes_do_lancamento(simulado):
    u, _, s = simulado
    v = s["venda"]
    assert v.loc[v["status"] == "ativa", "unidade_id"].is_unique
    lancamento = {e["id"]: pd.Timestamp(e["data_lancamento"]) for e in catalogo.EMPREENDIMENTOS if e["unidades"]}
    emp = v["unidade_id"].map(u.set_index("id")["empreendimento_id"])
    assert (v["data_venda"] >= emp.map(lancamento)).all()
    assert (v["data_venda"] <= pd.Timestamp(DATA_CORTE)).all()


def test_parcelas_somam_o_valor_da_venda(simulado):
    _, _, s = simulado
    v, p = s["venda"].set_index("id"), s["parcela"]
    soma = (p.groupby("venda_id")["valor"].sum() * 100).round()
    valor = (v["valor_venda"] * 100).round()
    ativas = v.index[v["status"] == "ativa"]
    assert (soma[ativas] == valor[ativas]).all()

    distratadas = v.index[v["status"] == "distratada"]
    assert (soma[distratadas] <= valor[distratadas]).all()
    ultimo_vencimento = p.groupby("venda_id")["vencimento"].max()
    assert (ultimo_vencimento[distratadas] <= v.loc[distratadas, "data_distrato"]).all()
    assert (p.groupby("venda_id")["numero"].apply(lambda n: n.tolist() == list(range(1, len(n) + 1)))).all()


def test_distrato_preenchido_se_e_so_se_distratada(simulado):
    _, _, s = simulado
    v = s["venda"]
    assert set(v["status"]) <= modelo.DOMINIOS["status_venda"]
    assert (v["data_distrato"].notna() == (v["status"] == "distratada")).all()
    assert (v["data_distrato"].dropna() > v.loc[v["data_distrato"].notna(), "data_venda"]).all()


def test_revenda_so_depois_do_distrato(simulado):
    _, _, s = simulado
    for _, grupo in s["venda"].sort_values("data_venda").groupby("unidade_id"):
        anteriores = grupo.iloc[:-1]
        assert (anteriores["status"] == "distratada").all()
        assert (grupo["data_venda"].iloc[1:].values > anteriores["data_distrato"].values).all()


def test_pagamentos_ate_o_corte_e_sem_passar_da_parcela(simulado):
    _, _, s = simulado
    pg, p = s["pagamento"], s["parcela"].set_index("id")
    assert (pg["data_pagamento"] <= pd.Timestamp(DATA_CORTE)).all()
    assert (pg["valor_pago"] > 0).all()
    pago = pg.groupby("parcela_id")["valor_pago"].sum()
    assert (pago <= p.loc[pago.index, "valor"] + 0.001).all()
    assert pg["parcela_id"].isin(p.index).all()


def test_corretor_ja_trabalhava_na_data_da_venda(simulado):
    _, c, s = simulado
    inicio = s["venda"]["corretor_id"].map(c.set_index("id")["data_inicio"])
    assert (s["venda"]["data_venda"] >= inicio).all()
