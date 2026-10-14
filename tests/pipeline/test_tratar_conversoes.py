import pandas as pd
import pytest

from etl.tratar import comum, r4_datas, r5_valores, tratar


@pytest.fixture(scope="module")
def convertido(lidos):
    return tratar(lidos)


def test_os_dois_formatos_do_crm_viram_a_mesma_data():
    textos = pd.Series(["05/03/2024 14:22", "2024-03-05 14:22:00", None])
    datas, alternativas = r4_datas.data_hora_crm(textos)
    assert datas[0] == datas[1] == pd.Timestamp("2024-03-05 14:22")
    assert pd.isna(datas[2])
    assert alternativas.tolist() == [False, True, False]


def test_dinheiro_do_erp_vira_numero():
    valores = r5_valores.dinheiro(pd.Series(["R$ 1.234,56", "R$ 0,07", "R$ 1.000.000,00"]))
    assert valores.tolist() == [1234.56, 0.07, 1_000_000.0]


def test_normalizar_texto():
    assert comum.normalizar_texto("  João   SILVA ") == "joao silva"
    assert comum.normalizar_texto("Jd. Oceânia") == "jd. oceania"


def test_formato_alternativo_registrado_e_exatamente_o_do_gabarito(convertido, gabarito):
    registro = next(r for r in convertido.registros if r.regra == "R4" and r.acao == "corrigido")
    esperados = {c["id"] for c in gabarito["regras"]["R4"]["casos"]
                 if c["desfecho"] == "corrigido" and c["campo"] == "Data de entrada"}
    assert set(registro.ids) == esperados
    assert registro.linhas_afetadas == len(esperados)


def test_datas_e_valores_convertidos_batem_com_a_verdade(convertido, verdade, gabarito):
    lead = convertido.tabelas["lead"].set_index("id")
    certo = verdade["lead"].set_index("id")
    # ficam de fora as duplicatas do R1 (não existem na verdade) e os leads mantidos, cujas datas de
    # visita e proposta foram para a duplicata: quem as recupera é a mesclagem do R1 (tarefa 3.3)
    mantidos = {c["mantido"] for c in gabarito["regras"]["R1"]["casos"]}
    comuns = certo.index.difference(sorted(mantidos)).intersection(lead.index)  # sem os que foram para a quarentena
    for coluna in ["data_entrada", "data_visita", "data_proposta"]:
        vazio = pd.Timestamp(0)
        assert (lead.loc[comuns, coluna].fillna(vazio) == certo.loc[comuns, coluna].fillna(vazio)).all(), coluna

    pagamento = convertido.tabelas["pagamento"].set_index("id")
    certo = verdade["pagamento"].set_index("id")
    assert (pagamento["valor_pago"] == certo["valor_pago"]).all()
    assert (pagamento["data_pagamento"] == certo["data_pagamento"]).all()

    parcela = convertido.tabelas["parcela"].set_index("id")
    certo = verdade["parcela"].set_index("id")
    assert (parcela["valor"] == certo["valor"]).all()


def test_conversao_de_dinheiro_registrada_em_todas_as_linhas_do_erp(convertido, lidos):
    r5 = {r.origem: r for r in convertido.registros if r.regra == "R5" and r.acao == "convertido"}
    assert r5["erp_parcelas.csv"].linhas_afetadas == len(lidos["parcela"])
    assert r5["erp_baixas.csv"].linhas_afetadas == len(lidos["pagamento"])
    # converter formato não barra linha nenhuma; quem barra são as regras de quarentena (tarefa 3.6)
    assert r4_datas.converter(lidos).quarentena == [] and r5_valores.converter(lidos).quarentena == []
