"""R5 · Valores: o dinheiro em texto do ERP (`R$ 1.234,56`) vira número."""

import pandas as pd

from etl.tratar.comum import Registro, Resultado


def dinheiro(textos: pd.Series) -> pd.Series:
    """'R$ 1.234,56' vira 1234.56; o que não tem esse formato vira nulo."""
    numeros = (textos.str.removeprefix("R$").str.strip()
               .str.replace(".", "", regex=False).str.replace(",", ".", regex=False))
    return pd.to_numeric(numeros.where(numeros.str.fullmatch(r"-?\d+(\.\d{1,2})?", na=False)), errors="coerce")


def converter(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    registros = []
    for tabela, coluna, origem in [("parcela", "valor", "erp_parcelas.csv"),
                                   ("pagamento", "valor_pago", "erp_baixas.csv")]:
        df = t[tabela].copy()
        valores = dinheiro(df[coluna])
        nao_lidos = df.loc[df[coluna].notna() & valores.isna(), "id"].tolist()
        df[coluna] = valores
        t[tabela] = df
        registros.append(Registro("R5", origem, "Valor em texto (R$ 1.234,56) convertido para número",
                                  len(df), "convertido"))
        if nao_lidos:
            registros.append(Registro("R5", origem, "Valor que não está no formato R$ 1.234,56",
                                      len(nao_lidos), "nulo", nao_lidos))
    return Resultado(t, registros)
