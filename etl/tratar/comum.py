"""O que toda regra de tratamento compartilha: o registro do que ela fez e o resultado que devolve.

Cada regra recebe as tabelas e devolve um Resultado: as tabelas tratadas, os registros (que viram o
relatório de qualidade) e as linhas que mandou para a quarentena, com o motivo.
"""

import json
import unicodedata
from dataclasses import dataclass, field

import pandas as pd

# de que bruto vem cada tabela (para o relatório e a quarentena)
ORIGEM_DA_TABELA = {
    "lead": "crm_leads.csv",
    "empreendimento": "comercial_espelho.xlsx", "unidade": "comercial_espelho.xlsx",
    "venda": "comercial_espelho.xlsx", "cliente": "comercial_espelho.xlsx",
    "imobiliaria": "comercial_parceiros.xlsx", "corretor": "comercial_parceiros.xlsx",
    "parcela": "erp_parcelas.csv", "pagamento": "erp_baixas.csv",
    "meta_mensal": "diretoria_metas.xlsx",
}


@dataclass
class Registro:
    """Uma linha do relatório de qualidade. `ids` serve aos testes e não vai para o banco."""

    regra: str
    origem: str
    descricao: str
    linhas_afetadas: int
    acao: str  # corrigido, convertido, mesclado, nulo, outro, relatado, quarentena, cascata
    ids: list[int] = field(default_factory=list)


@dataclass
class Resultado:
    tabelas: dict[str, pd.DataFrame]
    registros: list[Registro] = field(default_factory=list)
    quarentena: list[dict] = field(default_factory=list)  # tabela, origem, regra, registro (dict), motivo


def quarentenar(df: pd.DataFrame, barrar: pd.Series, tabela: str, regra: str,
                motivo) -> tuple[pd.DataFrame, list[dict]]:
    """Tira da tabela as linhas marcadas em `barrar` e devolve (tabela sem elas, itens da quarentena).

    A linha vai inteira para a quarentena, como JSON (D3.4). `motivo` é um texto, ou uma função
    que recebe a linha e devolve o texto.
    """
    itens = []
    for _, linha in df[barrar].iterrows():
        itens.append({"tabela": tabela, "origem": ORIGEM_DA_TABELA[tabela], "regra": regra,
                      "registro": json.loads(linha.to_json(date_format="iso")),
                      "motivo": motivo(linha) if callable(motivo) else motivo})
    return df[~barrar].reset_index(drop=True), itens


def ids_em_quarentena(quarentena: list[dict], tabela: str) -> list[int]:
    return sorted(int(q["registro"]["id"]) for q in quarentena if q["tabela"] == tabela)


# (filha, coluna da filha, pai, coluna do pai): a filha cujo valor está entre os do pai barrado vai junto
LIGACOES = [
    ("cliente", "lead_id", "lead", "id"),        # lead em quarentena leva o cliente
    ("venda", "cliente_id", "cliente", "id"),    # cliente leva a venda
    ("cliente", "id", "venda", "cliente_id"),    # venda leva o cliente da mesma linha
    ("parcela", "venda_id", "venda", "id"),      # venda leva as parcelas
    ("pagamento", "parcela_id", "parcela", "id"),  # parcela leva os pagamentos
]


def propagar_quarentena(tabelas: dict[str, pd.DataFrame], quarentena: list[dict]) -> Resultado:
    """A cascata (D2.1): o que depende de uma linha em quarentena vai junto, para o banco não ficar com
    filho sem pai. Repete as LIGACOES até nada mudar. A linha que vai junto herda a regra de quem a levou.
    """
    t = dict(tabelas)
    barrados = list(quarentena)
    novos: list[dict] = []
    mudou = True
    while mudou:
        mudou = False
        for filha, coluna, pai, coluna_pai in LIGACOES:
            # valor da coluna do pai → o item do pai barrado
            pais = {q["registro"][coluna_pai]: q for q in barrados if q["tabela"] == pai}
            barrar = t[filha][coluna].isin(list(pais))
            if not barrar.any():
                continue
            quem_levou = {int(linha["id"]): pais[linha[coluna]] for _, linha in t[filha][barrar].iterrows()}
            t[filha], itens = quarentenar(
                t[filha], barrar, filha, "",
                lambda linha: f"depende de {pai} {quem_levou[int(linha['id'])]['registro']['id']} em quarentena")
            for item in itens:
                item["regra"] = quem_levou[int(item["registro"]["id"])]["regra"]
            barrados += itens
            novos += itens
            mudou = True

    registros = []
    for regra, tabela in sorted({(q["regra"], q["tabela"]) for q in novos}):
        ids = sorted(int(q["registro"]["id"]) for q in novos if (q["regra"], q["tabela"]) == (regra, tabela))
        registros.append(Registro(regra, ORIGEM_DA_TABELA[tabela],
                                  f"{tabela.capitalize()} que depende de linha em quarentena (cascata)",
                                  len(ids), "cascata", ids))
    return Resultado(t, registros, novos)


def normalizar_texto(texto: str) -> str:
    """Minúsculas, sem acento, espaços simples, sem espaço nas pontas: 'João  SILVA ' vira 'joao silva'."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return " ".join(sem_acento.lower().split())
