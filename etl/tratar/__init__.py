"""Tratar: as regras R1 a R7, na ordem do D3.1.

Conversões (R4 datas, R5 dinheiro) → R1 → R6 → R2 → R3 → R4 impossíveis → R5 outliers → R7 → cascata.
Cada regra recebe as tabelas que a anterior devolveu; os registros e a quarentena se acumulam.
"""

from collections.abc import Callable

import pandas as pd

from etl.tratar import r4_datas, r5_valores
from etl.tratar.comum import Resultado

Regra = Callable[[dict[str, pd.DataFrame]], Resultado]

REGRAS: list[Regra] = [
    r4_datas.converter,
    r5_valores.converter,
]


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    final = Resultado(dict(tabelas))
    for regra in REGRAS:
        passo = regra(final.tabelas)
        final = Resultado(passo.tabelas, final.registros + passo.registros, final.quarentena + passo.quarentena)
    return final
