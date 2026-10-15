import csv
import json
import re

import pytest

from etl import carregar, modelo
from etl.tratar import tratar

TABELAS = modelo.TABELAS_ADR + ["relatorio_qualidade", "quarentena"]
re_data = re.compile(r"\d{4}-\d{2}-\d{2}")
re_timestamp = re.compile(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}")


@pytest.fixture(scope="module")
def gravados(lidos, tmp_path_factory):
    resultado = tratar(lidos)
    pasta = tmp_path_factory.mktemp("limpos")
    linhas = carregar.gravar_limpos(resultado.tabelas, resultado.registros, resultado.quarentena, pasta)
    return pasta, linhas, resultado


def _ler(pasta, tabela):
    with open(pasta / f"{tabela}.csv", encoding="utf-8", newline="") as f:
        return list(csv.reader(f))


def test_um_csv_por_tabela_com_o_cabecalho_do_modelo_e_sem_cr(gravados):
    pasta, linhas, _ = gravados
    assert set(linhas) == set(TABELAS)
    for tabela in TABELAS:
        conteudo = (pasta / f"{tabela}.csv").read_bytes()
        assert b"\r" not in conteudo, tabela
        cabecalho, *dados = _ler(pasta, tabela)
        assert cabecalho == modelo.COLUNAS[tabela], tabela
        assert len(dados) == linhas[tabela], tabela


def _coluna(pasta, tabela, coluna):
    cabecalho, *dados = _ler(pasta, tabela)
    posicao = cabecalho.index(coluna)
    return [linha[posicao] for linha in dados]


def test_formatos_que_o_copy_do_postgres_le(gravados):
    pasta, _, _ = gravados
    assert all(re_timestamp.fullmatch(v) for v in _coluna(pasta, "lead", "data_entrada"))
    assert all(v == "" or re_data.fullmatch(v) for v in _coluna(pasta, "lead", "data_visita"))
    assert all(v == "" or re_data.fullmatch(v) for v in _coluna(pasta, "venda", "data_distrato"))
    assert all(v == "" or v.isdigit() for v in _coluna(pasta, "lead", "corretor_id"))  # inteiro, sem ".0"
    assert set(_coluna(pasta, "unidade", "vista_mar")) == {"true", "false"}


def test_auditoria_traz_o_relatorio_e_a_quarentena_inteira(gravados):
    pasta, linhas, resultado = gravados
    assert linhas["relatorio_qualidade"] == len(resultado.registros)
    assert linhas["quarentena"] == len(resultado.quarentena)
    cabecalho, *dados = _ler(pasta, "quarentena")
    primeira = dict(zip(cabecalho, dados[0]))
    assert primeira["id"] == "1"
    assert json.loads(primeira["registro"])["id"] == resultado.quarentena[0]["registro"]["id"]
    assert primeira["origem"] == f"{resultado.quarentena[0]['origem']} · {resultado.quarentena[0]['tabela']}"
