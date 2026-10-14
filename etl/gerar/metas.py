"""A meta mensal de vendas que a diretoria definiu para cada empreendimento lançado."""

from datetime import date

import pandas as pd

from etl import modelo
from etl.gerar import catalogo as cat

ULTIMO_MES_COM_META = date(2026, 12, 1)  # o orçamento vai até o fim do ano
META_LANCAMENTO = 0.08  # das unidades, por mês, nos primeiros meses
META_DEPOIS = 0.025


def gerar_metas() -> pd.DataFrame:
    linhas = []
    for emp in cat.EMPREENDIMENTOS:
        if not emp["unidades"]:
            continue
        ano, mes = emp["data_lancamento"].year, emp["data_lancamento"].month
        acumulado, idade = 0, 0
        while date(ano, mes, 1) <= ULTIMO_MES_COM_META and acumulado < emp["unidades"]:
            fracao = META_LANCAMENTO if idade < cat.MESES_DE_LANCAMENTO else META_DEPOIS
            meta = min(max(1, round(emp["unidades"] * fracao)), emp["unidades"] - acumulado)
            linhas.append({"empreendimento_id": emp["id"], "mes": date(ano, mes, 1), "meta_unidades": meta})
            acumulado += meta
            idade += 1
            ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    metas = pd.DataFrame(linhas)
    metas["mes"] = pd.to_datetime(metas["mes"])
    return metas[modelo.COLUNAS["meta_mensal"]]
