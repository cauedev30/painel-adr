import shutil
from collections import Counter

import pandas as pd
import pytest

import pipeline
from etl import modelo, validar


@pytest.fixture(scope="module")
def resumo(pasta_brutos, tmp_path_factory):
    return pipeline.executar(pasta_brutos, tmp_path_factory.mktemp("limpos"), montar_banco=False)


def _verdade_menos_a_quarentena(verdade, gabarito, tabela):
    """O que o pipeline deve entregar: a verdade sem as linhas em quarentena e com as perdas aceitas
    (e-mail inválido vira nulo, canal desconhecido vira outro)."""
    certo = verdade[tabela].copy()
    certo = certo[~certo["id"].isin(gabarito["quarentena_esperada"].get(tabela, []))] if "id" in certo else certo
    if tabela == "lead":
        regras = gabarito["regras"]
        sem_email = [c["id"] for c in regras["R6"]["casos"] if c["desfecho"] == "nulo"]
        outro = [c["id"] for c in regras["R3"]["casos"] if c["desfecho"] == "outro"]
        certo.loc[certo["id"].isin(sem_email), "email"] = None
        certo.loc[certo["id"].isin(outro), "canal"] = "outro"
    return certo


def _comparavel(df):
    """Mesma ordem e mesma unidade de tempo nas datas, para comparar valor com valor."""
    df = df.sort_values(list(df.columns[:2])).reset_index(drop=True)
    datas = {c: "datetime64[us]" for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])}
    return df.astype(datas)


@pytest.mark.parametrize("tabela", modelo.TABELAS_ADR)
def test_limpos_sao_a_verdade_menos_a_quarentena(resumo, verdade, gabarito, tabela):
    limpo = resumo.tabelas[tabela][modelo.COLUNAS[tabela]]
    certo = _verdade_menos_a_quarentena(verdade, gabarito, tabela)[modelo.COLUNAS[tabela]]
    pd.testing.assert_frame_equal(_comparavel(limpo), _comparavel(certo), check_dtype=False,
                                  check_exact=False, atol=0.005, rtol=0, obj=tabela)


def test_relatorio_bate_com_o_gabarito(resumo, gabarito):
    tratado = Counter()
    for r in resumo.registros:
        if r.acao not in {"convertido", "relatado", "cascata"}:  # formato e cascata não são sujeira plantada
            tratado[(r.regra, r.acao)] += r.linhas_afetadas
    plantado = Counter((regra, c["desfecho"]) for regra, r in gabarito["regras"].items() for c in r["casos"])
    assert +tratado == plantado


def test_resumo_traz_as_4_etapas(resumo, gabarito):
    assert resumo.lidas["crm_leads.csv"] == 16_479
    assert resumo.checagens == validar.CHECAGENS
    assert set(resumo.carregadas) == set(modelo.TABELAS_ADR) | {"relatorio_qualidade", "quarentena"}
    esperado = sum(len(ids) for ids in gabarito["quarentena_esperada"].values())
    assert resumo.carregadas["quarentena"] == esperado
    assert resumo.tamanho_banco is None  # montar_banco=False


def test_fk_quebrada_para_o_pipeline_sem_gravar_nada(pasta_brutos, tmp_path):
    brutos = tmp_path / "brutos"
    shutil.copytree(pasta_brutos, brutos)
    parcelas = (brutos / "erp_parcelas.csv").read_bytes().decode("latin-1").split("\n")
    campos = parcelas[1].split(";")
    campos[1] = "999999"  # cod_contrato de um contrato que não existe
    parcelas[1] = ";".join(campos)
    (brutos / "erp_parcelas.csv").write_bytes("\n".join(parcelas).encode("latin-1"))

    limpos = tmp_path / "limpos"
    with pytest.raises(validar.ErroDeValidacao) as erro:
        pipeline.executar(brutos, limpos, montar_banco=False)
    assert any(f.startswith("chave estrangeira existe: parcela.venda_id") for f in erro.value.falhas)
    assert not limpos.exists()
