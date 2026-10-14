"""O funil de vendas, montado de trás para a frente a partir das vendas.

Cada venda tem o seu lead. Os leads perdidos nascem perto de uma venda sorteada do mesmo
empreendimento, em quantidade que reproduz as taxas do funil. Os empreendimentos em pré-lançamento
têm só a lista de interesse.
"""

import calendar
import unicodedata
from datetime import date, datetime, time, timedelta

import numpy as np
import pandas as pd

from etl import modelo
from etl.config import DATA_CORTE, INICIO_JANELA
from etl.gerar import catalogo as cat

CAPTACAO_ANTES_DO_LANCAMENTO = 60  # dias
DIAS_PARA_CONTAR_COMO_ABERTO = 30  # lead parado há menos que isso ainda não é perdido
ETAPA_POR_PROFUNDIDADE = {0: "novo", 1: "visita", 2: "proposta"}


def _pesos_canal(profundidade: int) -> tuple[list[str], list[float]]:
    """Quanto mais fundo no funil, mais pesa a conversão do canal."""
    canais = list(cat.CANAIS)
    pesos = [volume * conversao ** profundidade for volume, conversao in cat.CANAIS.values()]
    total = sum(pesos)
    return canais, [p / total for p in pesos]


def _sortear_canal(profundidade: int, rng) -> str:
    canais, pesos = _pesos_canal(profundidade)
    return canais[rng.choice(len(canais), p=pesos)]


def _preparar_corretores(corretores: pd.DataFrame, vendas: pd.DataFrame):
    """Ids, data de início e peso de cada corretor, em arrays (o sorteio roda milhares de vezes).

    Quem vende mais recebe mais leads: o peso é o número de vendas mais 1.
    """
    vendas_por_corretor = vendas["corretor_id"].value_counts()
    ids = corretores["id"].to_numpy()
    inicio = corretores["data_inicio"].to_numpy().astype("datetime64[D]")
    pesos = corretores["id"].map(vendas_por_corretor).fillna(0).to_numpy() + 1
    return ids, inicio, pesos


def _sortear_corretor(corretores, data: date, rng) -> int:
    ids, inicio, pesos = corretores
    ativos = inicio <= np.datetime64(data, "D")
    p = pesos[ativos]
    return int(rng.choice(ids[ativos], p=p / p.sum()))


def _hora(data: date, rng) -> datetime:
    return datetime.combine(data, time(int(rng.integers(8, 22)), int(rng.integers(0, 60))))


def _encerrar(lead: dict, ultima_data: date, profundidade: int, rng) -> None:
    """Lead parado há pouco tempo continua na última etapa; parado há muito, foi perdido."""
    if ultima_data >= DATA_CORTE - timedelta(days=DIAS_PARA_CONTAR_COMO_ABERTO):
        lead["etapa"] = ETAPA_POR_PROFUNDIDADE[profundidade]
    else:
        lead["etapa"] = "perdido"
        lead["motivo_perda"] = cat.MOTIVOS_PERDA[rng.integers(len(cat.MOTIVOS_PERDA))]


def _lead_convertido(venda, empreendimento_id: int, rng) -> dict:
    data_venda = venda.data_venda.date()
    entrada = max(INICIO_JANELA, data_venda - timedelta(days=int(rng.integers(10, 121))))
    caminho = (data_venda - entrada).days
    visita = entrada + timedelta(days=round(caminho * rng.uniform(0.2, 0.4)))
    proposta = entrada + timedelta(days=round(caminho * rng.uniform(0.6, 0.9)))
    return {
        "venda_id": venda.id,
        "empreendimento_id": empreendimento_id,
        "corretor_id": venda.corretor_id,
        "canal": _sortear_canal(3, rng),
        "data_entrada": _hora(entrada, rng),
        "data_visita": visita,
        "data_proposta": proposta,
        "etapa": "venda",
        "motivo_perda": None,
    }


def _lead_perdido(profundidade, venda_de_referencia, empreendimento_id, corretores, rng) -> dict:
    emp = next(e for e in cat.EMPREENDIMENTOS if e["id"] == empreendimento_id)
    inicio = max(INICIO_JANELA, emp["data_lancamento"] - timedelta(days=CAPTACAO_ANTES_DO_LANCAMENTO))
    entrada = venda_de_referencia.data_venda.date() + timedelta(days=int(rng.integers(-60, 61)))
    entrada = min(max(entrada, inicio), DATA_CORTE)
    datas = [entrada]
    if profundidade >= 1:
        datas.append(datas[-1] + timedelta(days=int(rng.integers(3, 31))))
    if profundidade >= 2:
        datas.append(datas[-1] + timedelta(days=int(rng.integers(2, 21))))
    excesso = (datas[-1] - DATA_CORTE).days
    if excesso > 0:  # o caminho todo tem de caber antes da data de corte
        datas = [d - timedelta(days=excesso) for d in datas]

    corretor = None
    if profundidade >= 1 or rng.random() >= cat.CHANCE_LEAD_SEM_CORRETOR:
        corretor = _sortear_corretor(corretores, datas[0], rng)
    lead = {
        "venda_id": None,
        "empreendimento_id": empreendimento_id,
        "corretor_id": corretor,
        "canal": _sortear_canal(profundidade, rng),
        "data_entrada": _hora(datas[0], rng),
        "data_visita": datas[1] if profundidade >= 1 else None,
        "data_proposta": datas[2] if profundidade >= 2 else None,
        "motivo_perda": None,
    }
    _encerrar(lead, datas[-1], profundidade, rng)
    return lead


def _lista_de_interesse(emp: dict, rng) -> list[dict]:
    leads = []
    ano, mes = emp["inicio_captacao"].year, emp["inicio_captacao"].month
    while (ano, mes) <= (DATA_CORTE.year, DATA_CORTE.month):
        ultimo_dia = min(calendar.monthrange(ano, mes)[1], 31 if (ano, mes) != (DATA_CORTE.year, DATA_CORTE.month) else DATA_CORTE.day)
        for _ in range(int(rng.poisson(emp["leads_por_mes"]))):
            entrada = date(ano, mes, int(rng.integers(1, ultimo_dia + 1)))
            lead = {
                "venda_id": None, "empreendimento_id": emp["id"], "corretor_id": None,
                "canal": _sortear_canal(0, rng), "data_entrada": _hora(entrada, rng),
                "data_visita": None, "data_proposta": None, "motivo_perda": None,
            }
            _encerrar(lead, entrada, 0, rng)
            leads.append(lead)
        ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    return leads


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))


def _dar_pessoa(lead: dict, fake, rng, telefones: set, emails: set) -> None:
    nome = f"{fake.first_name()} {fake.last_name()}"
    cidade, uf, ddd, _ = cat.CIDADES[rng.choice(len(cat.CIDADES), p=[c[3] for c in cat.CIDADES])]

    telefone = None
    while telefone is None or telefone in telefones:
        telefone = f"+55{ddd}9{int(rng.integers(0, 10**8)):08d}"
    telefones.add(telefone)

    email = None
    if rng.random() >= cat.CHANCE_SEM_EMAIL:
        separador = [".", "_", ""][rng.integers(3)]
        local = separador.join(_sem_acento(nome).lower().split())
        if rng.random() < 0.5:
            local += str(int(rng.integers(1, 100)))
        dominios = cat.DOMINIOS_EMAIL
        dominio = dominios[rng.choice(len(dominios), p=[p for _, p in dominios])][0]
        email = f"{local}@{dominio}"
        while email in emails:
            local += str(int(rng.integers(0, 10)))
            email = f"{local}@{dominio}"
        emails.add(email)

    lead.update({"nome": nome, "cidade": cidade, "uf": uf, "telefone": telefone, "email": email})


def gerar_leads(vendas, unidades, corretores, perfis, fake, rng) -> tuple[pd.DataFrame, pd.DataFrame]:
    emp_da_unidade = unidades.set_index("id")["empreendimento_id"].to_dict()
    para_sortear = _preparar_corretores(corretores, vendas)
    lista_vendas = list(vendas.itertuples(index=False))

    # 1. Um lead por venda
    leads = [_lead_convertido(v, emp_da_unidade[v.unidade_id], rng) for v in lista_vendas]

    # 2. Os perdidos em cada etapa, em quantidade que reproduz as taxas do funil
    n_vendas = len(vendas)
    n_propostas = round(n_vendas / cat.TAXA_VENDA)
    n_visitas = round(n_propostas / cat.TAXA_PROPOSTA)
    n_leads = round(n_visitas / cat.TAXA_VISITA)
    for profundidade, quantos in [(2, n_propostas - n_vendas), (1, n_visitas - n_propostas), (0, n_leads - n_visitas)]:
        for _ in range(quantos):
            referencia = lista_vendas[int(rng.integers(n_vendas))]
            emp_id = emp_da_unidade[referencia.unidade_id]
            leads.append(_lead_perdido(profundidade, referencia, emp_id, para_sortear, rng))

    # 3. A lista de interesse dos empreendimentos em pré-lançamento
    for emp in cat.EMPREENDIMENTOS:
        if emp["inicio_captacao"]:
            leads.extend(_lista_de_interesse(emp, rng))

    # 4. Nome, cidade, telefone e e-mail
    telefones, emails = set(), set()
    for lead in leads:
        _dar_pessoa(lead, fake, rng, telefones, emails)

    # 5. O id do CRM segue a ordem de entrada
    tabela = pd.DataFrame(leads).sort_values("data_entrada", kind="stable").reset_index(drop=True)
    tabela.insert(0, "id", range(1, len(tabela) + 1))
    tabela["corretor_id"] = tabela["corretor_id"].astype("Int64")
    for coluna in ("data_entrada", "data_visita", "data_proposta"):
        tabela[coluna] = pd.to_datetime(tabela[coluna])

    # 6. Um cliente por venda, com os dados do lead que comprou
    compradores = tabela[tabela["venda_id"].notna()].set_index("venda_id")
    compradores.index = compradores.index.astype(int)
    compradores = compradores.loc[vendas["id"]]
    cliente = pd.DataFrame({
        "id": vendas["cliente_id"].to_numpy(),
        "lead_id": compradores["id"].to_numpy(),
        "nome": compradores["nome"].to_numpy(),
        "cidade": compradores["cidade"].to_numpy(),
        "uf": compradores["uf"].to_numpy(),
        "perfil": perfis.set_index("id").loc[vendas["cliente_id"], "perfil"].to_numpy(),
    })
    return tabela[modelo.COLUNAS["lead"]], cliente[modelo.COLUNAS["cliente"]]
