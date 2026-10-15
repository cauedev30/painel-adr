import json

import openpyxl
import pandas as pd
import pytest

from etl.gerar import exportar, sujeira

CSVS = {sujeira.CRM: "utf-8-sig", sujeira.ERP_PARCELAS: "latin-1", sujeira.ERP_BAIXAS: "latin-1"}
XLSXS = [sujeira.ESPELHO, sujeira.PARCEIROS, sujeira.METAS]


def _como_texto(df: pd.DataFrame) -> pd.DataFrame:
    """O que um CSV guarda: cada célula como texto, vazio no lugar de nulo."""
    return df.astype(object).where(df.notna(), "").astype(str)


@pytest.fixture(scope="module")
def gravado(sujo, tmp_path_factory):
    brutos, gabarito = sujo
    pasta = tmp_path_factory.mktemp("dados")
    linhas = exportar.gravar(brutos, gabarito, pasta / "brutos", pasta / "gabarito.json")
    return pasta, linhas


def test_csvs_lidos_de_volta_dao_o_mesmo_conteudo(sujo, gravado):
    brutos, _ = sujo
    pasta, linhas = gravado
    for arquivo, codificacao in CSVS.items():
        lido = pd.read_csv(pasta / "brutos" / arquivo, sep=";", encoding=codificacao,
                           dtype=str, keep_default_na=False)
        pd.testing.assert_frame_equal(lido, _como_texto(brutos[arquivo]), check_dtype=False)
        assert linhas[arquivo] == len(brutos[arquivo])
    parcelas = (pasta / "brutos" / sujeira.ERP_PARCELAS).read_bytes().decode("latin-1")
    assert "Balão anual" in parcelas


def test_nenhum_arquivo_de_texto_tem_cr(gravado):
    pasta, _ = gravado
    for caminho in [*(pasta / "brutos" / a for a in CSVS), pasta / "gabarito.json"]:
        assert b"\r" not in caminho.read_bytes(), caminho.name


def test_xlsx_tem_as_abas_e_o_mesmo_conteudo(sujo, gravado):
    brutos, _ = sujo
    pasta, linhas = gravado
    for arquivo in XLSXS:
        lido = pd.read_excel(pasta / "brutos" / arquivo, sheet_name=None)
        assert list(lido) == list(brutos[arquivo])
        for aba, df in brutos[arquivo].items():
            # o Excel devolve as datas em outra unidade de tempo; a data é a mesma
            datas = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
            lido_aba = lido[aba].astype({c: df[c].dtype for c in datas})
            pd.testing.assert_frame_equal(lido_aba, df, check_dtype=False)
        assert linhas[arquivo] == sum(len(df) for df in brutos[arquivo].values())


def test_xlsx_mostra_data_e_desconto_no_formato_brasileiro(gravado):
    pasta, _ = gravado
    espelho = openpyxl.load_workbook(pasta / "brutos" / sujeira.ESPELHO)
    assert espelho["Empreendimentos"]["F2"].number_format == "DD/MM/YYYY"  # Lançamento
    assert espelho["Vendas"]["J2"].number_format == "DD/MM/YYYY"  # Data da venda
    assert espelho["Vendas"]["L2"].number_format == "0.00"  # Desconto (%), já em pontos: 0,15 é 0,15%
    corretores = openpyxl.load_workbook(pasta / "brutos" / sujeira.PARCEIROS)["Corretores"]
    assert corretores["E2"].number_format == "DD/MM/YYYY"  # Início


def test_gabarito_lido_de_volta_e_igual(sujo, gravado):
    _, gabarito = sujo
    pasta, _ = gravado
    assert json.loads((pasta / "gabarito.json").read_text(encoding="utf-8")) == gabarito


def test_gravar_duas_vezes_da_os_mesmos_bytes(sujo, gravado, tmp_path):
    brutos, gabarito = sujo
    pasta, _ = gravado
    exportar.gravar(brutos, gabarito, tmp_path / "brutos", tmp_path / "gabarito.json")
    for arquivo in CSVS:
        assert (tmp_path / "brutos" / arquivo).read_bytes() == (pasta / "brutos" / arquivo).read_bytes()
    assert (tmp_path / "gabarito.json").read_bytes() == (pasta / "gabarito.json").read_bytes()
