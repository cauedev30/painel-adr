import pandas as pd

from etl import modelo
from etl.config import DATA_CORTE, INICIO_JANELA, SEMENTE
from etl.gerar import verdade

CORTE = pd.Timestamp(DATA_CORTE)
INICIO = pd.Timestamp(INICIO_JANELA)

# (tabela, coluna) → (tabela referenciada, coluna referenciada), como na seção 3.3 da spec
FKS = {
    ("unidade", "empreendimento_id"): ("empreendimento", "id"),
    ("corretor", "imobiliaria_id"): ("imobiliaria", "id"),
    ("lead", "empreendimento_id"): ("empreendimento", "id"),
    ("lead", "corretor_id"): ("corretor", "id"),
    ("cliente", "lead_id"): ("lead", "id"),
    ("venda", "unidade_id"): ("unidade", "id"),
    ("venda", "cliente_id"): ("cliente", "id"),
    ("venda", "corretor_id"): ("corretor", "id"),
    ("parcela", "venda_id"): ("venda", "id"),
    ("pagamento", "parcela_id"): ("parcela", "id"),
    ("meta_mensal", "empreendimento_id"): ("empreendimento", "id"),
}

PKS = {
    "parcela": ["venda_id", "numero"],  # além do id
    "meta_mensal": ["empreendimento_id", "mes"],
}


def test_dez_tabelas_com_as_colunas_do_modelo(tabelas):
    assert list(tabelas) == modelo.TABELAS_ADR
    for nome, tabela in tabelas.items():
        assert list(tabela.columns) == modelo.COLUNAS[nome], nome


def test_chaves_primarias_unicas(tabelas):
    for nome, tabela in tabelas.items():
        if "id" in tabela.columns:
            assert tabela["id"].is_unique, nome
        if nome in PKS:
            assert not tabela.duplicated(PKS[nome]).any(), nome


def test_chaves_estrangeiras_existem(tabelas):
    for (tabela, coluna), (referencia, coluna_ref) in FKS.items():
        valores = tabelas[tabela][coluna].dropna()
        assert valores.isin(tabelas[referencia][coluna_ref]).all(), f"{tabela}.{coluna}"


def test_datas_dentro_da_janela(tabelas):
    lead, venda, pagamento = tabelas["lead"], tabelas["venda"], tabelas["pagamento"]
    assert lead["data_entrada"].min() >= INICIO
    assert lead["data_entrada"].max() < CORTE + pd.Timedelta(days=1)
    assert lead["data_proposta"].max() <= CORTE
    assert venda["data_venda"].between(INICIO, CORTE).all()
    assert venda["data_distrato"].dropna().le(CORTE).all()
    assert pagamento["data_pagamento"].between(INICIO, CORTE).all()
    assert tabelas["parcela"]["vencimento"].min() >= INICIO  # vencimentos futuros vão até a entrega
    assert tabelas["meta_mensal"]["mes"].dt.day.eq(1).all()


def test_volumes_perto_do_alvo(tabelas):
    venda = tabelas["venda"]
    assert len(tabelas["unidade"]) == 390
    assert 260 <= len(venda) <= 310
    assert 14_000 <= len(tabelas["lead"]) <= 18_000
    assert 0.03 <= (venda["status"] == "distratada").mean() <= 0.08
    assert len(tabelas["empreendimento"]) == 7


def test_mesma_semente_mesmo_resultado(tabelas):
    de_novo = verdade.gerar(SEMENTE)
    for nome in modelo.TABELAS_ADR:
        pd.testing.assert_frame_equal(tabelas[nome], de_novo[nome], obj=nome)
