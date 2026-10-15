import pandas as pd
import pytest

from etl import validar
from etl.tratar import tratar


@pytest.fixture(scope="module")
def limpos(lidos):
    return tratar(lidos).tabelas


def _copia(tabelas):
    return {nome: df.copy() for nome, df in tabelas.items()}


def test_os_limpos_passam_em_todas_as_checagens(limpos):
    assert validar.validar(limpos) == validar.CHECAGENS


def _duplicar_pk(t):
    t["lead"] = pd.concat([t["lead"], t["lead"].head(1)], ignore_index=True)


def _fk_quebrada(t):
    t["parcela"].loc[0, "venda_id"] = 999_999


def _fora_do_dominio(t):
    t["lead"].loc[0, "canal"] = "insta"


def _valor_negativo(t):
    t["venda"].loc[0, "valor_venda"] = -1.0


def _data_depois_do_corte(t):
    t["venda"].loc[0, "data_venda"] = pd.Timestamp("2027-01-01")


def _duas_ativas_na_mesma_unidade(t):
    ativas = t["venda"].index[t["venda"]["status"] == "ativa"]
    t["venda"].loc[ativas[1], "unidade_id"] = t["venda"].loc[ativas[0], "unidade_id"]


def _distrato_em_venda_ativa(t):
    ativa = t["venda"].index[t["venda"]["status"] == "ativa"][0]
    t["venda"].loc[ativa, "data_distrato"] = pd.Timestamp("2025-01-01")


def _pago_acima_da_parcela(t):
    t["pagamento"].loc[0, "valor_pago"] = t["pagamento"].loc[0, "valor_pago"] * 10


def _dois_clientes_no_mesmo_lead(t):
    t["cliente"].loc[1, "lead_id"] = t["cliente"].loc[0, "lead_id"]


def _telefone_fora_do_e164(t):
    t["lead"].loc[0, "telefone"] = "(83) 99999-0000"


def _coluna_faltando(t):
    t["unidade"] = t["unidade"].drop(columns="vista_mar")


@pytest.mark.parametrize("estragar, checagem", [
    (_duplicar_pk, "chave primária única"),
    (_fk_quebrada, "chave estrangeira existe"),
    (_fora_do_dominio, "valor dentro do domínio"),
    (_valor_negativo, "valor dentro da faixa"),
    (_data_depois_do_corte, "valor dentro da faixa"),
    (_duas_ativas_na_mesma_unidade, "uma venda ativa por unidade"),
    (_distrato_em_venda_ativa, "distrato só em venda distratada"),
    (_pago_acima_da_parcela, "pagamento até o valor da parcela"),
    (_dois_clientes_no_mesmo_lead, "um cliente por lead"),
    (_telefone_fora_do_e164, "telefone em E.164"),
    (_coluna_faltando, "colunas do modelo"),
])
def test_dado_quebrado_e_barrado_pela_checagem_certa(limpos, estragar, checagem):
    t = _copia(limpos)
    estragar(t)
    with pytest.raises(validar.ErroDeValidacao) as erro:
        validar.validar(t)
    assert any(f.startswith(checagem) for f in erro.value.falhas), erro.value.falhas
