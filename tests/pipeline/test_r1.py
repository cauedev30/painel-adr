import pandas as pd
import pytest

from etl import modelo
from etl.tratar import r1_duplicatas, tratar

COLUNAS_LEAD = ["corretor_nome" if c == "corretor_id" else c for c in modelo.COLUNAS["lead"]]


def _lead(id_, telefone, email, entrada, etapa="novo", visita=None, proposta=None, corretor=None, motivo=None):
    return {"id": id_, "nome": f"Pessoa {id_}", "telefone": telefone, "email": email, "cidade": "João Pessoa",
            "canal": "Site", "empreendimento_id": 1, "corretor_nome": corretor,
            "data_entrada": pd.Timestamp(entrada), "data_visita": pd.Timestamp(visita) if visita else pd.NaT,
            "data_proposta": pd.Timestamp(proposta) if proposta else pd.NaT, "etapa": etapa, "motivo_perda": motivo}


def _tratar(linhas):
    lead = pd.DataFrame(linhas, columns=COLUNAS_LEAD)
    return r1_duplicatas.tratar({"lead": lead})


def test_telefone_vira_e164():
    telefones = pd.Series(["(83) 99999-0000", "83999990000", "+55 83 99999-0000", "083 99999 0000",
                           "+5583999990000", "9999-0000", None])
    assert r1_duplicatas.telefone_e164(telefones).tolist()[:5] == ["+5583999990000"] * 5
    assert r1_duplicatas.telefone_e164(telefones)[5:].isna().all()


def test_duplicata_pelo_telefone_fica_o_mais_antigo_com_o_andamento_do_mais_avancado():
    resultado = _tratar([
        _lead(1, "(83) 99999-0000", "a@x.com", "2024-01-01 09:00", etapa="perdido", motivo="sem retorno"),
        _lead(2, "+5583999990000", None, "2024-01-05 10:00", etapa="proposta",
              visita="2024-01-10", proposta="2024-01-20", corretor="Elisa Dias"),
        _lead(3, "83911112222", "c@x.com", "2024-02-01 08:00"),
        _lead(4, "83933334444", "d@x.com", "2024-02-02 08:00", etapa="visita", visita="2024-02-09"),
    ])
    lead = resultado.tabelas["lead"].set_index("id")
    assert lead.index.tolist() == [1, 3, 4]
    mantido = lead.loc[1]
    assert (mantido["email"], mantido["data_entrada"]) == ("a@x.com", pd.Timestamp("2024-01-01 09:00"))
    assert (mantido["etapa"], mantido["corretor_nome"]) == ("proposta", "Elisa Dias")
    assert mantido["data_proposta"] == pd.Timestamp("2024-01-20") and pd.isna(mantido["motivo_perda"])
    assert lead.loc[4, "etapa"] == "visita" and lead.loc[3, "telefone"] == "+5583911112222"
    mesclado = next(r for r in resultado.registros if r.acao == "mesclado")
    assert (mesclado.ids, mesclado.linhas_afetadas) == ([2], 1)


def test_grupo_encadeado_por_telefone_e_email_vira_um_lead():
    resultado = _tratar([
        _lead(1, "83999990000", "a@x.com", "2024-01-01 09:00"),
        _lead(2, "(83) 99999-0000", "b@x.com", "2024-01-02 09:00"),  # casa com 1 pelo telefone
        _lead(3, "83977776666", " B@X.com", "2024-01-03 09:00"),  # casa com 2 pelo e-mail
    ])
    assert resultado.tabelas["lead"]["id"].tolist() == [1]


@pytest.fixture(scope="module")
def tratado(lidos):
    return tratar(lidos)


def test_duplicatas_removidas_sao_exatamente_as_do_gabarito(tratado, lidos, gabarito):
    casos = gabarito["regras"]["R1"]["casos"]
    removidos = set(lidos["lead"]["id"]) - set(tratado.tabelas["lead"]["id"])
    assert removidos == {c["id"] for c in casos}
    mesclado = next(r for r in tratado.registros if r.regra == "R1" and r.acao == "mesclado")
    assert set(mesclado.ids) == removidos and mesclado.linhas_afetadas == len(casos)


def test_lead_mantido_fica_igual_a_verdade(tratado, verdade, gabarito):
    lead = tratado.tabelas["lead"].set_index("id")
    certo = verdade["lead"].set_index("id")
    nome_do_corretor = verdade["corretor"].set_index("id")["nome"]
    mantidos = sorted({c["mantido"] for c in gabarito["regras"]["R1"]["casos"]})
    for coluna in ["telefone", "email", "data_entrada", "etapa", "motivo_perda"]:
        assert lead.loc[mantidos, coluna].fillna("").tolist() == certo.loc[mantidos, coluna].fillna("").tolist(), coluna
    for coluna in ["data_visita", "data_proposta"]:
        vazio = pd.Timestamp(0)
        assert (lead.loc[mantidos, coluna].fillna(vazio) == certo.loc[mantidos, coluna].fillna(vazio)).all(), coluna
    assert (lead.loc[mantidos, "corretor_nome"].fillna("").tolist()
            == certo.loc[mantidos, "corretor_id"].map(nome_do_corretor).fillna("").tolist())


def test_todo_telefone_vira_o_da_verdade(tratado, verdade):
    lead = tratado.tabelas["lead"].set_index("id")["telefone"]
    certo = verdade["lead"].set_index("id")["telefone"]
    assert lead.loc[certo.index].tolist() == certo.tolist()
