"""Os padrões plantados da seção 3.2 da spec, cada um com margem.

Se um deles falhar, o ajuste é no parâmetro do catálogo, nunca no teste.
"""

import pandas as pd
import pytest

from etl.config import DATA_CORTE
from etl.gerar import catalogo

CORTE = pd.Timestamp(DATA_CORTE)


@pytest.fixture(scope="module")
def vendas(tabelas):
    """Cada venda com empreendimento, área, vista mar e preço/m²."""
    u = tabelas["unidade"].set_index("id")
    v = tabelas["venda"].copy()
    v["empreendimento_id"] = v["unidade_id"].map(u["empreendimento_id"])
    v["vista_mar"] = v["unidade_id"].map(u["vista_mar"])
    v["preco_m2"] = v["valor_venda"] / v["unidade_id"].map(u["area_privativa_m2"])
    return v


@pytest.fixture(scope="module")
def vencidas(tabelas, vendas):
    """Parcelas vencidas até o corte, com quanto foi pago e quando foram quitadas."""
    p = tabelas["parcela"][tabelas["parcela"]["vencimento"] <= CORTE].copy()
    pg = tabelas["pagamento"].sort_values("data_pagamento")
    p["pago"] = p["id"].map(pg.groupby("parcela_id")["valor_pago"].sum()).fillna(0)
    pg = pg.assign(acumulado=pg.groupby("parcela_id")["valor_pago"].cumsum())
    pg = pg.merge(p[["id", "valor"]], left_on="parcela_id", right_on="id", suffixes=("", "_parcela"))
    quitacao = pg[pg["acumulado"] >= pg["valor"] - 0.001].groupby("parcela_id")["data_pagamento"].min()
    p["quitada_em"] = p["id"].map(quitacao)
    return p.merge(vendas[["id", "status", "empreendimento_id", "desconto_pct", "data_distrato"]],
                   left_on="venda_id", right_on="id", suffixes=("", "_venda"))


def _inadimplencia(parcelas: pd.DataFrame) -> float:
    return (parcelas["valor"] - parcelas["pago"]).sum() / parcelas["valor"].sum()


def test_canal_de_maior_volume_nao_e_o_de_maior_conversao(tabelas):
    lead = tabelas["lead"]
    por_canal = lead.groupby("canal").agg(leads=("id", "size"), vendas=("etapa", lambda e: (e == "venda").sum()))
    por_canal["conversao"] = por_canal["vendas"] / por_canal["leads"]
    assert por_canal["leads"].idxmax() == "instagram"
    assert por_canal["conversao"].idxmax() in {"indicacao", "imobiliaria"}
    # e a diferença é grande o bastante para aparecer no gráfico
    assert por_canal.loc["indicacao", "conversao"] > 3 * por_canal.loc["instagram", "conversao"]


def test_vendas_concentradas_nos_melhores_corretores(vendas):
    com_corretor = vendas[vendas["corretor_id"] != 1]
    top5 = com_corretor["corretor_id"].value_counts().head(5).sum()
    assert top5 / len(com_corretor) >= 0.40


def test_vista_mar_vale_mais_e_vende_mais_rapido(tabelas, vendas):
    preco = vendas.groupby("vista_mar")["preco_m2"].mean()
    assert preco[True] >= 1.08 * preco[False]

    # Velocidade: a parte de TODAS as unidades vendida nos 6 primeiros meses. A mediana de dias
    # só das vendidas teria viés de sobrevivência: as sem vista que não venderam ficariam de fora.
    lancamento = {e["id"]: pd.Timestamp(e["data_lancamento"]) for e in catalogo.EMPREENDIMENTOS if e["unidades"]}
    u = tabelas["unidade"]
    primeira = vendas.sort_values("data_venda").drop_duplicates("unidade_id").set_index("unidade_id")["data_venda"]
    dias = (u["id"].map(primeira) - u["empreendimento_id"].map(lancamento)).dt.days
    em_6_meses = (dias <= 182).groupby(u["vista_mar"]).mean()
    assert em_6_meses[True] >= 1.3 * em_6_meses[False]


def test_inadimplencia_concentrada_no_seaside_e_no_desconto_alto(vencidas):
    ativas = vencidas[vencidas["status"] == "ativa"]
    por_emp = ativas.groupby("empreendimento_id").apply(_inadimplencia)
    outros = por_emp.drop(catalogo.ID_SEASIDE)
    assert por_emp.idxmax() == catalogo.ID_SEASIDE
    assert por_emp[catalogo.ID_SEASIDE] >= 1.5 * outros.mean()

    alto = ativas["desconto_pct"] >= catalogo.DESCONTO_ALTO
    assert _inadimplencia(ativas[alto]) >= 1.5 * _inadimplencia(ativas[~alto])


def test_distrato_precedido_de_atraso_acima_de_60_dias(vencidas, vendas):
    distratadas = vendas[vendas["status"] == "distratada"]
    p = vencidas[vencidas["status"] == "distratada"]
    marco = p["vencimento"] + pd.Timedelta(days=61)
    atrasou = (marco <= p["data_distrato"]) & (p["quitada_em"].isna() | (p["quitada_em"] >= marco))
    com_atraso = p.loc[atrasou, "venda_id"].nunique()
    assert len(distratadas) > 0
    assert com_atraso / len(distratadas) >= 0.80


def test_nenhum_preco_m2_natural_alem_de_3_iqr(vendas):
    """Guarda do D2.10: o R5 só pode pegar o que a sujeira plantou."""
    for _, grupo in vendas.groupby("empreendimento_id"):
        q1, q3 = grupo["preco_m2"].quantile([0.25, 0.75])
        iqr = q3 - q1
        assert grupo["preco_m2"].between(q1 - 3 * iqr, q3 + 3 * iqr).all()
