"""R4 · Datas: o texto dos sistemas vira data, e a data em outro formato é contada como sujeira.

O CRM grava `dd/mm/aaaa hh:mm` na entrada e `dd/mm/aaaa` na visita e na proposta; um lote importado
de outra ferramenta veio como `aaaa-mm-dd hh:mm:ss`. O ERP grava `aaaa-mm-dd`.
As datas do .xlsx já chegam como data e não passam por aqui.
"""

import pandas as pd

from etl.tratar.comum import Registro, Resultado

FORMATO_CRM = "%d/%m/%Y %H:%M"
FORMATO_CRM_ALTERNATIVO = "%Y-%m-%d %H:%M:%S"
FORMATO_CRM_DIA = "%d/%m/%Y"
FORMATO_ERP = "%Y-%m-%d"


def data_hora_crm(textos: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Devolve (datas, quais vieram no formato alternativo)."""
    padrao = pd.to_datetime(textos, format=FORMATO_CRM, errors="coerce")
    alternativa = pd.to_datetime(textos, format=FORMATO_CRM_ALTERNATIVO, errors="coerce")
    return padrao.fillna(alternativa), padrao.isna() & alternativa.notna()


def _sem_formato(textos: pd.Series, datas: pd.Series) -> pd.Series:
    """Texto que nenhum formato reconheceu (fica nulo e é contado)."""
    return textos.notna() & datas.isna()


def converter(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    registros = []
    nao_lidas: dict[str, list[int]] = {}

    lead = t["lead"].copy()
    entrada, alternativa = data_hora_crm(lead["data_entrada"])
    nao_lidas["crm_leads.csv"] = lead.loc[_sem_formato(lead["data_entrada"], entrada), "id"].tolist()
    for coluna in ["data_visita", "data_proposta"]:
        dia = pd.to_datetime(lead[coluna], format=FORMATO_CRM_DIA, errors="coerce")
        nao_lidas["crm_leads.csv"] += lead.loc[_sem_formato(lead[coluna], dia), "id"].tolist()
        lead[coluna] = dia
    lead["data_entrada"] = entrada
    t["lead"] = lead
    ids = lead.loc[alternativa, "id"].tolist()
    registros.append(Registro("R4", "crm_leads.csv", "Data de entrada no formato aaaa-mm-dd hh:mm:ss",
                              len(ids), "corrigido", ids))

    for tabela, coluna, origem in [("parcela", "vencimento", "erp_parcelas.csv"),
                                   ("pagamento", "data_pagamento", "erp_baixas.csv")]:
        df = t[tabela].copy()
        datas = pd.to_datetime(df[coluna], format=FORMATO_ERP, errors="coerce")
        nao_lidas[origem] = df.loc[_sem_formato(df[coluna], datas), "id"].tolist()
        df[coluna] = datas
        t[tabela] = df

    for origem, ids in nao_lidas.items():
        if ids:
            registros.append(Registro("R4", origem, "Data que nenhum formato conhecido lê", len(ids), "nulo", ids))
    return Resultado(t, registros)
