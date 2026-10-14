import numpy as np
import pandas as pd
import pytest
from faker import Faker

from etl import modelo
from etl.config import SEMENTE
from etl.gerar import catalogo, parceiros, unidades


def _gerar(semente=SEMENTE):
    rng = np.random.default_rng(semente)
    fake = Faker("pt_BR")
    fake.seed_instance(semente)
    return unidades.gerar_unidades(rng), parceiros.gerar_imobiliarias(), parceiros.gerar_corretores(rng, fake)


@pytest.fixture(scope="module")
def gerados():
    return _gerar()


def test_390_unidades_com_codigo_unico(gerados):
    u, _, _ = gerados
    assert list(u.columns) == modelo.COLUNAS["unidade"]
    assert len(u) == 390
    assert u["id"].tolist() == list(range(1, 391))
    assert u["codigo"].is_unique
    por_emp = u.groupby("empreendimento_id").size().to_dict()
    assert por_emp == {e["id"]: e["unidades"] for e in catalogo.EMPREENDIMENTOS if e["unidades"]}


def test_faixa_de_area_igual_a_do_site(gerados):
    u, _, _ = gerados
    for e in catalogo.EMPREENDIMENTOS:
        if not e["unidades"]:
            continue
        areas = u.loc[u["empreendimento_id"] == e["id"], "area_privativa_m2"]
        assert areas.min() == e["area_min"]
        assert areas.max() == e["area_max"]


def test_tipologias_e_vista_mar(gerados):
    u, _, _ = gerados
    assert set(u["tipologia"]) <= modelo.DOMINIOS["tipologia"]
    # Seaview (18,50 a 21,81 m²) só tem studios
    assert set(u.loc[u["empreendimento_id"] == 3, "tipologia"]) == {"studio"}
    # o último andar do Bessa (6 unidades) é de duplex
    bessa = u[u["empreendimento_id"] == 4]
    assert set(bessa.loc[bessa["andar"] == bessa["andar"].max(), "tipologia"]) == {"duplex"}
    assert 0.30 < u["vista_mar"].mean() < 0.36


def test_preco_de_tabela_com_premio_de_vista_mar(gerados):
    u, _, _ = gerados
    assert (u["preco_tabela"] > 0).all()
    studios = u[u["tipologia"] == "studio"].assign(m2=lambda d: d["preco_tabela"] / d["area_privativa_m2"])
    medias = studios.groupby(["empreendimento_id", "andar", "vista_mar"])["m2"].mean().unstack()
    razao = (medias[True] / medias[False]).mean()
    assert 1.10 < razao < 1.14


def test_imobiliarias_e_corretores(gerados):
    _, imob, cor = gerados
    assert list(imob.columns) == modelo.COLUNAS["imobiliaria"]
    assert list(cor.columns) == modelo.COLUNAS["corretor"]
    assert len(imob) == 8
    assert len(cor) == 36
    assert cor.loc[0, "nome"] == "Venda direta"
    assert pd.isna(cor.loc[0, "creci"]) and pd.isna(cor.loc[0, "imobiliaria_id"])
    assert cor["creci"].dropna().is_unique
    assert cor["nome"].is_unique
    assert set(catalogo.CORRETORES_AMBIGUOS) <= set(cor["nome"])
    assert cor["imobiliaria_id"].notna().sum() == 28
    assert cor["imobiliaria_id"].dropna().isin(imob["id"]).all()


def test_so_o_par_plantado_e_ambiguo(gerados):
    _, _, cor = gerados
    chaves = parceiros.chave_de_abreviacao(cor["nome"].iloc[1:])
    repetidas = sorted(cor["nome"].iloc[1:][chaves.duplicated(keep=False)])
    assert repetidas == sorted(catalogo.CORRETORES_AMBIGUOS)


def test_mesma_semente_mesmo_resultado(gerados):
    for a, b in zip(gerados, _gerar()):
        pd.testing.assert_frame_equal(a, b)
