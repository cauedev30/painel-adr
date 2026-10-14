import numpy as np
import pandas as pd
import pytest
from faker import Faker

from etl import modelo
from etl.config import DATA_CORTE, INICIO_JANELA, SEMENTE
from etl.gerar import catalogo, leads, parceiros, unidades, vendas


@pytest.fixture(scope="module")
def funil():
    rng = np.random.default_rng(SEMENTE)
    fake = Faker("pt_BR")
    fake.seed_instance(SEMENTE)
    u = unidades.gerar_unidades(rng)
    c = parceiros.gerar_corretores(rng, fake)
    s = vendas.simular_vendas(u, c, rng)
    lead, cliente = leads.gerar_leads(s["venda"], u, c, s["cliente_base"], fake, rng)
    return u, s["venda"], lead, cliente


def test_colunas_e_ids_na_ordem_de_entrada(funil):
    _, _, lead, cliente = funil
    assert list(lead.columns) == modelo.COLUNAS["lead"]
    assert list(cliente.columns) == modelo.COLUNAS["cliente"]
    assert lead["id"].tolist() == list(range(1, len(lead) + 1))
    assert lead["data_entrada"].is_monotonic_increasing
    assert lead["data_entrada"].min() >= pd.Timestamp(INICIO_JANELA)
    assert lead["data_entrada"].max() <= pd.Timestamp(DATA_CORTE) + pd.Timedelta(days=1)


def test_toda_venda_tem_o_seu_lead(funil):
    u, v, lead, cliente = funil
    assert cliente["id"].tolist() == v["cliente_id"].tolist()
    assert cliente["lead_id"].is_unique
    l = lead.set_index("id").loc[cliente["lead_id"]].reset_index()
    assert (l["etapa"] == "venda").all()
    assert (l["empreendimento_id"].values == v["unidade_id"].map(u.set_index("id")["empreendimento_id"]).values).all()
    assert (l["corretor_id"].values == v["corretor_id"].values).all()
    assert (l["data_entrada"].dt.normalize().values <= l["data_visita"].values).all()
    assert (l["data_visita"].values <= l["data_proposta"].values).all()
    assert (l["data_proposta"].values <= v["data_venda"].values).all()
    assert (lead["etapa"] == "venda").sum() == len(v)


def test_funil_decrescente_com_taxas_perto_do_alvo(funil):
    _, _, lead, _ = funil
    n_leads = len(lead)
    n_visitas = lead["data_visita"].notna().sum()
    n_propostas = lead["data_proposta"].notna().sum()
    n_vendas = (lead["etapa"] == "venda").sum()
    assert n_leads > n_visitas > n_propostas > n_vendas
    assert abs(n_visitas / n_leads - catalogo.TAXA_VISITA) < 0.03
    assert abs(n_propostas / n_visitas - catalogo.TAXA_PROPOSTA) < 0.03
    assert abs(n_vendas / n_propostas - catalogo.TAXA_VENDA) < 0.03
    # quem tem proposta tem visita
    assert lead.loc[lead["data_proposta"].notna(), "data_visita"].notna().all()


def test_telefone_e_email_unicos(funil):
    _, _, lead, _ = funil
    assert lead["telefone"].is_unique
    assert lead["telefone"].str.fullmatch(r"\+55\d{11}").all()
    emails = lead["email"].dropna()
    assert emails.is_unique
    assert emails.str.fullmatch(r"[a-z0-9._]+@[a-z.]+").all()
    assert 0.05 < lead["email"].isna().mean() < 0.15


def test_dominios_e_motivo_de_perda(funil):
    _, _, lead, cliente = funil
    assert set(lead["etapa"]) <= modelo.DOMINIOS["etapa"]
    assert set(lead["canal"]) <= modelo.DOMINIOS["canal"]
    assert set(cliente["perfil"]) <= modelo.DOMINIOS["perfil"]
    assert (lead["motivo_perda"].notna() == (lead["etapa"] == "perdido")).all()
    assert set(lead["motivo_perda"].dropna()) <= set(catalogo.MOTIVOS_PERDA)


def test_pre_lancamento_so_tem_topo_de_funil(funil):
    _, _, lead, _ = funil
    pre = [e["id"] for e in catalogo.EMPREENDIMENTOS if e["status"] == "pre_lancamento"]
    da_lista = lead[lead["empreendimento_id"].isin(pre)]
    assert len(da_lista) > 500
    assert da_lista["data_visita"].isna().all()
    assert da_lista["corretor_id"].isna().all()
    assert set(da_lista["etapa"]) <= {"novo", "perdido"}
