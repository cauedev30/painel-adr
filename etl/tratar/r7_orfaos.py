"""R7 · Órfãos: pagamento (baixa do ERP) apontando para uma parcela que não existe.

Roda antes da cascata, então a parcela de uma venda barrada ainda está na tabela e o pagamento dela
não conta como órfão: ele vai para a quarentena pela cascata, com o motivo certo.
"""

import pandas as pd

from etl.tratar.comum import Registro, Resultado, quarentenar


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    pagamento = t["pagamento"]
    orfao = ~pagamento["parcela_id"].isin(t["parcela"]["id"])
    ids = pagamento.loc[orfao, "id"].tolist()
    t["pagamento"], quarentena = quarentenar(pagamento, orfao, "pagamento", "R7",
                                             lambda p: f"parcela {p['parcela_id']} não existe no ERP")
    return Resultado(t, [Registro("R7", "erp_baixas.csv", "Pagamento ligado a parcela inexistente",
                                  len(ids), "quarentena", ids)], quarentena)
