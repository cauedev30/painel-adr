"""R6 · Vazios: o campo que veio em branco ou inválido.

- Venda sem corretor na planilha do comercial é venda direta (sem corretor nem imobiliária).
- E-mail que não tem a forma `algo@dominio.ext` vira nulo: e-mail errado é pior que nenhum.
"""

import pandas as pd

from etl.tratar.comum import Registro, Resultado

VENDA_DIRETA = "Venda direta"
FORMA_DE_EMAIL = r"[^@\s]+@[^@\s]+\.[^@\s]+"


def email_valido(emails: pd.Series) -> pd.Series:
    return emails.str.fullmatch(FORMA_DE_EMAIL, na=False)


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)

    venda = t["venda"].copy()
    sem_corretor = venda["corretor_nome"].isna()
    ids_venda = venda.loc[sem_corretor, "id"].tolist()
    venda.loc[sem_corretor, "corretor_nome"] = VENDA_DIRETA
    t["venda"] = venda

    lead = t["lead"].copy()
    invalido = lead["email"].notna() & ~email_valido(lead["email"])
    ids_lead = lead.loc[invalido, "id"].tolist()
    lead.loc[invalido, "email"] = None
    t["lead"] = lead

    return Resultado(t, [
        Registro("R6", "comercial_espelho.xlsx", "Venda sem corretor preenchida com Venda direta",
                 len(ids_venda), "corrigido", ids_venda),
        Registro("R6", "crm_leads.csv", "E-mail inválido apagado", len(ids_lead), "nulo", ids_lead),
    ])
