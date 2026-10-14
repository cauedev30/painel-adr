"""R1 · Leads duplicados: a mesma pessoa entrou duas vezes no CRM (pelo site e pelo WhatsApp, por exemplo).

1. Padroniza o telefone para E.164 (D3.8) e o e-mail para minúsculas sem espaço.
2. Junta num grupo os leads com o mesmo telefone ou o mesmo e-mail. O grupo pode ser uma corrente
   (A casa com B pelo telefone, B com C pelo e-mail), por isso a junção é um union-find simples.
3. Em cada grupo fica o lead de entrada mais antiga, com os dados de contato dele. O andamento (etapa,
   visita, proposta, corretor e motivo) vem da linha mais avançada no funil; no empate, da mais antiga.
"""

import pandas as pd

from etl.tratar.comum import Registro, Resultado

ORIGEM = "crm_leads.csv"
ANDAMENTO = ["etapa", "data_visita", "data_proposta", "corretor_nome", "motivo_perda"]


def telefone_e164(textos: pd.Series) -> pd.Series:
    """Só os dígitos, sem o 0 inicial: 11 dígitos (DDD + 9 + 8) ganham +55; 13 começando em 55 ganham +.
    Fora disso, nulo."""
    digitos = textos.str.replace(r"\D", "", regex=True).str.lstrip("0")
    onze = digitos.str.len().eq(11)
    treze = digitos.str.len().eq(13) & digitos.str.startswith("55")
    return ("+55" + digitos).where(onze, ("+" + digitos).where(treze))


def _email_para_casar(emails: pd.Series) -> pd.Series:
    """Só para comparar: a coluna e-mail não muda aqui (o e-mail inválido é do R6)."""
    return emails.str.lower().str.replace(r"\s", "", regex=True)


def _profundidade(lead: pd.DataFrame) -> pd.Series:
    """Até onde o lead andou no funil: 3 venda, 2 proposta, 1 visita, 0 o resto."""
    profundidade = pd.Series(0, index=lead.index)
    profundidade[lead["data_visita"].notna()] = 1
    profundidade[lead["data_proposta"].notna()] = 2
    profundidade[lead["etapa"].eq("venda")] = 3
    return profundidade


def _grupos(*chaves: pd.Series) -> list[int]:
    """Union-find: posições que compartilham qualquer chave acabam com a mesma raiz."""
    pai = list(range(len(chaves[0])))

    def raiz(i: int) -> int:
        while pai[i] != i:
            pai[i] = pai[pai[i]]
            i = pai[i]
        return i

    for chave in chaves:
        for posicoes in chave.reset_index(drop=True).groupby(chave.reset_index(drop=True)).indices.values():
            primeira = raiz(int(posicoes[0]))
            for p in posicoes[1:]:
                pai[raiz(int(p))] = primeira
    return [raiz(i) for i in range(len(pai))]


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    lead = t["lead"].reset_index(drop=True).copy()

    telefone = telefone_e164(lead["telefone"])
    sem_formato = lead.loc[lead["telefone"].notna() & telefone.isna(), "id"].tolist()
    lead["telefone"] = telefone

    grupo = pd.Series(_grupos(telefone, _email_para_casar(lead["email"])), index=lead.index)
    profundidade = _profundidade(lead)
    repetidos = grupo[grupo.duplicated(keep=False)]
    ordem = lead.loc[repetidos.index].sort_values(["data_entrada", "id"]).index

    duplicatas = []
    for _, linhas in repetidos.loc[ordem].groupby(repetidos.loc[ordem], sort=True):
        mantido = linhas.index[0]
        mais_avancado = profundidade.loc[linhas.index].idxmax()  # a primeira com o máximo: a mais antiga
        for coluna in ANDAMENTO:
            lead.at[mantido, coluna] = lead.at[mais_avancado, coluna]
        duplicatas += lead.loc[linhas.index[1:], "id"].tolist()

    t["lead"] = lead[~lead["id"].isin(duplicatas)].sort_values("id").reset_index(drop=True)
    duplicatas = sorted(duplicatas)
    registros = [Registro("R1", ORIGEM, "Leads duplicados (mesmo telefone ou e-mail) mesclados no mais antigo",
                          len(duplicatas), "mesclado", duplicatas)]
    if sem_formato:
        registros.append(Registro("R1", ORIGEM, "Telefone fora dos formatos conhecidos", len(sem_formato),
                                  "nulo", sem_formato))
    return Resultado(t, registros)
