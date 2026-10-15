"""Validar: a última barreira antes de gravar o banco.

Confere as tabelas já tratadas contra o modelo. Se qualquer checagem falha, levanta ErroDeValidacao
com todas as falhas, e o pipeline para sem gravar nada (D3.7). Cada checagem tem um nome em
português, que é o que aparece no resumo e na mensagem de erro.
"""

import pandas as pd

from etl import modelo
from etl.config import DATA_CORTE

CORTE = pd.Timestamp(DATA_CORTE)

# chave primária de cada tabela (além do id, onde ele existe)
CHAVES = {
    **{t: ["id"] for t in modelo.TABELAS_ADR if "id" in modelo.COLUNAS[t]},
    "meta_mensal": ["empreendimento_id", "mes"],
}
CHAVES_COMPOSTAS = {"parcela": ["venda_id", "numero"]}

# (tabela, coluna) → (tabela referenciada, coluna referenciada), como na seção 3.3 da spec
FKS = {
    ("unidade", "empreendimento_id"): ("empreendimento", "id"),
    ("corretor", "imobiliaria_id"): ("imobiliaria", "id"),
    ("lead", "empreendimento_id"): ("empreendimento", "id"),
    ("lead", "corretor_id"): ("corretor", "id"),
    ("cliente", "lead_id"): ("lead", "id"),
    ("venda", "unidade_id"): ("unidade", "id"),
    ("venda", "cliente_id"): ("cliente", "id"),
    ("venda", "corretor_id"): ("corretor", "id"),
    ("parcela", "venda_id"): ("venda", "id"),
    ("pagamento", "parcela_id"): ("parcela", "id"),
    ("meta_mensal", "empreendimento_id"): ("empreendimento", "id"),
}

DOMINIO_DA_COLUNA = {
    ("empreendimento", "status"): "status_empreendimento",
    ("unidade", "tipologia"): "tipologia",
    ("lead", "canal"): "canal",
    ("lead", "etapa"): "etapa",
    ("cliente", "perfil"): "perfil",
    ("venda", "status"): "status_venda",
    ("parcela", "tipo"): "tipo_parcela",
}

MAIOR_QUE_ZERO = [("unidade", "area_privativa_m2"), ("unidade", "preco_tabela"), ("venda", "valor_venda"),
                  ("parcela", "valor"), ("pagamento", "valor_pago")]
# datas que não podem passar do corte (vencimento e previsão de entrega olham para a frente)
ATE_O_CORTE = [("lead", "data_entrada"), ("lead", "data_visita"), ("lead", "data_proposta"),
               ("venda", "data_venda"), ("venda", "data_distrato"), ("pagamento", "data_pagamento"),
               ("corretor", "data_inicio"), ("empreendimento", "data_lancamento")]
E164 = r"\+55\d{10,11}"
FOLGA_DE_CENTAVO = 0.005


class ErroDeValidacao(Exception):
    def __init__(self, falhas: list[str]):
        self.falhas = falhas
        super().__init__("A validação falhou; nada foi gravado:\n" + "\n".join(f"  - {f}" for f in falhas))


def _colunas(t):
    return [f"{tb}: {list(t[tb].columns)}" for tb in modelo.TABELAS_ADR if list(t[tb].columns) != modelo.COLUNAS[tb]]


def _chaves(t):
    falhas = []
    for tb, chave in {**CHAVES, **CHAVES_COMPOSTAS}.items():
        repetidas = int(t[tb].duplicated(chave).sum())
        if repetidas:
            falhas.append(f"{tb} ({', '.join(chave)}): {repetidas} repetida(s)")
    return falhas


def _fks(t):
    falhas = []
    for (tb, coluna), (pai, coluna_pai) in FKS.items():
        valores = t[tb][coluna].dropna()
        orfaos = valores[~valores.isin(t[pai][coluna_pai])]
        if len(orfaos):
            falhas.append(f"{tb}.{coluna} → {pai}: {len(orfaos)} sem par (ex.: {orfaos.iloc[0]})")
    return falhas


def _dominios(t):
    falhas = []
    for (tb, coluna), dominio in DOMINIO_DA_COLUNA.items():
        fora = sorted(set(t[tb][coluna].dropna()) - modelo.DOMINIOS[dominio])
        if fora:
            falhas.append(f"{tb}.{coluna}: {fora}")
    return falhas


def _faixas(t):
    falhas = []
    for tb, coluna in MAIOR_QUE_ZERO:
        n = int((t[tb][coluna] <= 0).sum())
        if n:
            falhas.append(f"{tb}.{coluna}: {n} valor(es) ≤ 0")
    desconto = t["venda"]["desconto_pct"]
    if not desconto.between(0, 100).all():
        falhas.append("venda.desconto_pct: fora de 0 a 100")
    for tb, coluna in ATE_O_CORTE:
        n = int((t[tb][coluna].dt.floor("D") > CORTE).sum())
        if n:
            falhas.append(f"{tb}.{coluna}: {n} data(s) depois do corte {CORTE:%d/%m/%Y}")
    return falhas


def _venda_ativa_por_unidade(t):
    ativas = t["venda"][t["venda"]["status"] == "ativa"]
    repetidas = sorted(ativas.loc[ativas["unidade_id"].duplicated(), "unidade_id"].unique())
    return [f"unidades com mais de uma venda ativa: {repetidas}"] if repetidas else []


def _distrato(t):
    venda = t["venda"]
    errado = venda["data_distrato"].notna() != (venda["status"] == "distratada")
    return [f"vendas {venda.loc[errado, 'id'].tolist()}"] if errado.any() else []


def _pago_ate_a_parcela(t):
    pago = t["pagamento"].groupby("parcela_id")["valor_pago"].sum()
    valor = t["parcela"].set_index("id")["valor"]
    acima = pago[pago > valor.reindex(pago.index) + FOLGA_DE_CENTAVO]
    return [f"parcelas {acima.index.tolist()[:10]}"] if len(acima) else []


def _cliente_por_lead(t):
    n = int(t["cliente"]["lead_id"].duplicated().sum())
    return [f"{n} lead(s) com mais de um cliente"] if n else []


def _telefone(t):
    telefone = t["lead"]["telefone"].dropna()
    fora = telefone[~telefone.str.fullmatch(E164)]
    return [f"{len(fora)} telefone(s), ex.: {fora.iloc[0]}"] if len(fora) else []


CHECAGENS_E_FUNCOES = {
    "colunas do modelo": _colunas,
    "chave primária única": _chaves,
    "chave estrangeira existe": _fks,
    "valor dentro do domínio": _dominios,
    "valor dentro da faixa": _faixas,
    "uma venda ativa por unidade": _venda_ativa_por_unidade,
    "distrato só em venda distratada": _distrato,
    "pagamento até o valor da parcela": _pago_ate_a_parcela,
    "um cliente por lead": _cliente_por_lead,
    "telefone em E.164": _telefone,
}
CHECAGENS = list(CHECAGENS_E_FUNCOES)


def validar(tabelas: dict[str, pd.DataFrame]) -> list[str]:
    """Roda todas as checagens; devolve os nomes das que passaram ou levanta ErroDeValidacao."""
    falhas = []
    for nome, checar in CHECAGENS_E_FUNCOES.items():
        try:
            problemas = checar(tabelas)
        except Exception as erro:  # uma coluna faltando não pode esconder as outras falhas
            problemas = [f"não deu para checar ({type(erro).__name__}: {erro})"]
        falhas += [f"{nome}: {p}" for p in problemas]
    if falhas:
        raise ErroDeValidacao(falhas)
    return CHECAGENS
