"""R5 · Valores: o dinheiro em texto do ERP (`R$ 1.234,56`) vira número."""

import pandas as pd

from etl.tratar.comum import Registro, Resultado, quarentenar


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


CERCA = 3.0  # × IQR (D2.10): com 1,5, preço alto natural (vista mar, duplex) cairia aqui por engano


def corrigir_outliers(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    """Valor da venda digitado errado. Calcula o preço por m² de cada venda e a cerca de 3 × IQR do
    empreendimento. Fora da cerca: se ÷ 10 cai dentro, foi um zero a mais e é corrigido; senão, a
    venda vai para a quarentena (não dá para saber o valor certo)."""
    t = dict(tabelas)
    venda = t["venda"].copy()
    unidade = t["unidade"].set_index("id")
    area = venda["unidade_id"].map(unidade["area_privativa_m2"])
    predio = venda["unidade_id"].map(unidade["empreendimento_id"])
    m2 = venda["valor_venda"] / area

    q1 = m2.groupby(predio).transform(lambda s: s.quantile(0.25))
    q3 = m2.groupby(predio).transform(lambda s: s.quantile(0.75))
    baixo, alto = q1 - CERCA * (q3 - q1), q3 + CERCA * (q3 - q1)
    fora = (m2 < baixo) | (m2 > alto)
    um_zero_a_mais = fora & (m2 / 10).between(baixo, alto)

    ids_corrigidos = venda.loc[um_zero_a_mais, "id"].tolist()
    venda.loc[um_zero_a_mais, "valor_venda"] = (venda.loc[um_zero_a_mais, "valor_venda"] / 10).round(2)
    sem_conserto = fora & ~um_zero_a_mais
    ids_barrados = venda.loc[sem_conserto, "id"].tolist()
    t["venda"], quarentena = quarentenar(venda, sem_conserto, "venda", "R5",
                                         "preço/m² fora da faixa do empreendimento e ÷ 10 não resolve")
    return Resultado(t, [
        Registro("R5", "comercial_espelho.xlsx", "Valor da venda com um zero a mais, dividido por 10",
                 len(ids_corrigidos), "corrigido", ids_corrigidos),
        Registro("R5", "comercial_espelho.xlsx", "Valor da venda fora da faixa que ÷ 10 não resolve",
                 len(ids_barrados), "quarentena", ids_barrados),
    ], quarentena)
