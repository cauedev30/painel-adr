import pandas as pd
import pytest

from etl.tratar import comum, r5_valores, tratar


def _vendas_de_um_predio(valores):
    unidade = pd.DataFrame({"id": range(1, len(valores) + 1), "empreendimento_id": 1, "area_privativa_m2": 50.0})
    venda = pd.DataFrame({"id": range(1, len(valores) + 1), "unidade_id": range(1, len(valores) + 1),
                          "cliente_id": range(1, len(valores) + 1), "valor_venda": valores})
    return {"unidade": unidade, "venda": venda}


def test_r5_um_zero_a_mais_e_corrigido():
    valores = [500_000.0 + 10_000 * i for i in range(9)] + [5_400_000.0]
    resultado = r5_valores.corrigir_outliers(_vendas_de_um_predio(valores))
    assert resultado.tabelas["venda"]["valor_venda"].iloc[-1] == 540_000.0
    assert resultado.quarentena == []
    assert next(r for r in resultado.registros if r.acao == "corrigido").ids == [10]


def test_r5_um_digito_a_menos_vai_para_a_quarentena():
    valores = [500_000.0 + 10_000 * i for i in range(9)] + [54_000.0]
    resultado = r5_valores.corrigir_outliers(_vendas_de_um_predio(valores))
    assert 10 not in set(resultado.tabelas["venda"]["id"])
    assert [q["registro"]["id"] for q in resultado.quarentena] == [10]


def test_cascata_leva_so_o_que_depende_da_venda():
    tabelas = {
        "lead": pd.DataFrame({"id": [1, 2]}),
        "cliente": pd.DataFrame({"id": [10, 20], "lead_id": [1, 2]}),
        "venda": pd.DataFrame({"id": [200], "cliente_id": [20]}),  # a venda 100 já saiu
        "parcela": pd.DataFrame({"id": [1, 2, 3, 4], "venda_id": [100, 100, 100, 200]}),
        "pagamento": pd.DataFrame({"id": [1, 2, 3], "parcela_id": [1, 2, 4]}),
    }
    quarentena = [{"tabela": "venda", "origem": "comercial_espelho.xlsx", "regra": "R5",
                   "registro": {"id": 100, "cliente_id": 10}, "motivo": "valor fora da faixa"}]
    resultado = comum.propagar_quarentena(tabelas, quarentena)
    assert comum.ids_em_quarentena(resultado.quarentena, "cliente") == [10]
    assert comum.ids_em_quarentena(resultado.quarentena, "parcela") == [1, 2, 3]
    assert comum.ids_em_quarentena(resultado.quarentena, "pagamento") == [1, 2]
    assert resultado.tabelas["parcela"]["id"].tolist() == [4]
    assert resultado.tabelas["pagamento"]["id"].tolist() == [3]
    assert {q["regra"] for q in resultado.quarentena} == {"R5"}
    assert resultado.quarentena[0]["motivo"] == "depende de venda 100 em quarentena"


@pytest.fixture(scope="module")
def tratado(lidos):
    return tratar(lidos)


def test_quarentena_e_exatamente_a_esperada(tratado, gabarito):
    for tabela, ids in gabarito["quarentena_esperada"].items():
        assert comum.ids_em_quarentena(tratado.quarentena, tabela) == ids, tabela
        assert not set(ids) & set(tratado.tabelas[tabela]["id"]), tabela


def test_cada_regra_barra_os_casos_dela(tratado, gabarito):
    for regra in ["R4", "R5", "R7"]:
        esperados = {(c["arquivo"], c["id"]) for c in gabarito["regras"][regra]["casos"] if c["desfecho"] == "quarentena"}
        barrados = {(q["origem"], q["registro"]["id"]) for q in tratado.quarentena
                    if q["regra"] == regra and not q["motivo"].startswith("depende de")}
        assert barrados == esperados, regra


def test_r5_corrigidos_voltam_ao_valor_da_verdade(tratado, gabarito):
    venda = tratado.tabelas["venda"].set_index("id")
    casos = [c for c in gabarito["regras"]["R5"]["casos"] if c["desfecho"] == "corrigido"]
    assert [round(venda.loc[c["id"], "valor_venda"], 2) for c in casos] == [c["verdade"] for c in casos]


def test_o_que_sobra_bate_com_a_verdade(tratado, verdade):
    for tabela in ["venda", "parcela", "pagamento"]:
        limpo = tratado.tabelas[tabela].set_index("id").sort_index()
        certo = verdade[tabela].set_index("id").loc[limpo.index]
        # a mesma data pode vir em unidades de tempo diferentes (segundo, microssegundo)
        datas = {c: "datetime64[us]" for c in certo.columns if pd.api.types.is_datetime64_any_dtype(certo[c])}
        pd.testing.assert_frame_equal(limpo[certo.columns].astype(datas), certo.astype(datas),
                                      check_dtype=False, obj=tabela)
