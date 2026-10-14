import pandas as pd
import pytest

from etl import modelo
from etl.tratar import r2_textos, r6_vazios, tratar

CADASTRO = pd.Series({1: "Venda direta", 2: "João Silva", 3: "José Silva", 4: "Maria Souza", 5: "Elisa Dias"})


@pytest.mark.parametrize("texto, esperado", [
    ("joão  silva", 2),     # igual depois de padronizar
    ("ELISA DIAS ", 5),
    ("M. Souza", 4),        # inicial + sobrenome, uma candidata só
    ("Joao Slva", 2),       # parecido o bastante (difflib), um vencedor só
    ("Venda direta", 1),
])
def test_casamento_de_nome_de_corretor(texto, esperado):
    assert r2_textos.casar_corretor(texto, CADASTRO) == (esperado, [])


def test_nome_ambiguo_ou_desconhecido_nao_casa():
    assert r2_textos.casar_corretor("J. Silva", CADASTRO) == (None, ["João Silva", "José Silva"])
    assert r2_textos.casar_corretor("Fulano de Tal", CADASTRO) == (None, [])


@pytest.mark.parametrize("email, valido", [
    ("a@b.com", True), ("ana.paula_22@yahoo.com.br", True),
    ("a@b", False), ("a @b.com", False), ("a@@b.com", False),
])
def test_email_valido(email, valido):
    assert r6_vazios.email_valido(pd.Series([email])).iloc[0] == valido


@pytest.fixture(scope="module")
def tratado(lidos):
    return tratar(lidos)


def _registro(tratado, regra, origem, acao):
    return next(r for r in tratado.registros if (r.regra, r.origem, r.acao) == (regra, origem, acao))


def _casos(gabarito, regra, arquivo, campo, desfecho):
    return [c for c in gabarito["regras"][regra]["casos"]
            if (c["arquivo"], c["campo"], c["desfecho"]) == (arquivo, campo, desfecho)]


def test_r6_bate_com_o_gabarito(tratado, gabarito):
    venda = tratado.tabelas["venda"].set_index("id")
    lead = tratado.tabelas["lead"].set_index("id")

    casos = _casos(gabarito, "R6", "comercial_espelho.xlsx", "Corretor", "corrigido")
    assert set(_registro(tratado, "R6", "comercial_espelho.xlsx", "corrigido").ids) == {c["id"] for c in casos}
    assert (venda.loc[[c["id"] for c in casos], "corretor_id"] == 1).all()

    casos = _casos(gabarito, "R6", "crm_leads.csv", "E-mail", "nulo")
    assert set(_registro(tratado, "R6", "crm_leads.csv", "nulo").ids) == {c["id"] for c in casos}
    assert lead.loc[[c["id"] for c in casos], "email"].isna().all()


def test_r2_bate_com_o_gabarito(tratado, gabarito):
    emp = tratado.tabelas["empreendimento"].set_index("id")
    casos = _casos(gabarito, "R2", "comercial_espelho.xlsx", "Bairro", "corrigido")
    registro = next(r for r in tratado.registros if r.regra == "R2" and "Bairro" in r.descricao)
    assert set(registro.ids) == {c["id"] for c in casos}
    for c in casos:
        assert emp.loc[c["id"], "bairro"] == c["verdade"]

    for arquivo, tabela in [("crm_leads.csv", "lead"), ("comercial_espelho.xlsx", "venda")]:
        df = tratado.tabelas[tabela].set_index("id")
        casos = _casos(gabarito, "R2", arquivo, "Corretor", "corrigido")
        registro = next(r for r in tratado.registros
                        if (r.regra, r.origem, r.acao) == ("R2", arquivo, "corrigido") and "corretor" in r.descricao)
        assert set(registro.ids) == {c["id"] for c in casos}, arquivo
        for c in casos:
            assert df.loc[c["id"], "corretor_id"] == c["corretor_id"], (arquivo, c)


def test_r2_ambiguos_vao_para_a_quarentena(tratado, gabarito):
    ambiguos = {c["id"] for c in _casos(gabarito, "R2", "crm_leads.csv", "Corretor", "quarentena")}
    na_quarentena = {q["registro"]["id"] for q in tratado.quarentena if q["regra"] == "R2"}
    assert na_quarentena == ambiguos
    assert not ambiguos & set(tratado.tabelas["lead"]["id"])
    q = next(q for q in tratado.quarentena if q["regra"] == "R2")
    assert q["motivo"] == "nome de corretor ambíguo: J. Silva → João Silva, José Silva"


def test_todo_corretor_casado_e_o_da_verdade(tratado, verdade):
    for tabela in ["lead", "venda"]:
        df = tratado.tabelas[tabela].set_index("id")
        assert list(df.reset_index().columns) == modelo.COLUNAS[tabela]
        certo = verdade[tabela].set_index("id")["corretor_id"]
        comuns = df.index.intersection(certo.index)
        assert df.loc[comuns, "corretor_id"].fillna(0).tolist() == certo.loc[comuns].fillna(0).tolist(), tabela
