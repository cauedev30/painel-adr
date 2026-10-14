"""A linha do tempo de cada unidade: venda, distrato e revenda, mês a mês, até a data de corte."""

import calendar
from datetime import date, timedelta

import pandas as pd

from etl import modelo
from etl.config import DATA_CORTE
from etl.gerar import carteira
from etl.gerar import catalogo as cat

ID_VENDA_DIRETA = 1


def _pesos_corretores(corretores: pd.DataFrame, rng) -> dict[int, float]:
    """Cada corretor ganha uma posição sorteada; o peso cai com a posição e concentra as vendas."""
    ids = corretores.loc[corretores["id"] != ID_VENDA_DIRETA, "id"].tolist()
    posicoes = rng.permutation(len(ids)) + 1
    return {i: 1 / p ** cat.EXPOENTE_CORRETORES for i, p in zip(ids, posicoes)}


def sortear_corretor(corretores: pd.DataFrame, pesos: dict[int, float], data: date, rng) -> int:
    if rng.random() < cat.PESO_VENDA_DIRETA:
        return ID_VENDA_DIRETA
    ativos = corretores[(corretores["id"] != ID_VENDA_DIRETA) & (corretores["data_inicio"] <= pd.Timestamp(data))]
    p = ativos["id"].map(pesos).to_numpy()
    return int(rng.choice(ativos["id"].to_numpy(), p=p / p.sum()))


def _sortear_data_de_venda(unidade, emp: dict, livre_desde: date, rng) -> date | None:
    lancamento = emp["data_lancamento"]
    ano, mes = livre_desde.year, livre_desde.month
    while (ano, mes) <= (DATA_CORTE.year, DATA_CORTE.month):
        idade = (ano - lancamento.year) * 12 + mes - lancamento.month
        chance = emp["chance_venda_mes"]
        chance *= cat.BOOST_LANCAMENTO if idade < cat.MESES_DE_LANCAMENTO else 1
        chance *= cat.BOOST_VISTA_MAR if unidade.vista_mar else 1
        if rng.random() < chance:
            primeiro = livre_desde.day if (ano, mes) == (livre_desde.year, livre_desde.month) else 1
            ultimo = calendar.monthrange(ano, mes)[1]
            if (ano, mes) == (DATA_CORTE.year, DATA_CORTE.month):
                ultimo = DATA_CORTE.day
            if primeiro <= ultimo:
                return date(ano, mes, int(rng.integers(primeiro, ultimo + 1)))
        ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    return None


def _sortear_desconto(rng) -> float:
    faixas = cat.FAIXAS_DESCONTO
    escolha = rng.choice(len(faixas), p=[peso for _, peso in faixas])
    menor, maior = faixas[escolha][0]
    return round(float(rng.uniform(menor, maior)), 2)


def _sortear_risco(emp: dict, desconto: float, rng) -> str:
    chances = dict(cat.RISCO_SEASIDE if emp["id"] == cat.ID_SEASIDE else cat.RISCO)
    if desconto >= cat.DESCONTO_ALTO:
        chances["bom"] -= cat.PIORA_DESCONTO_ALTO
        chances["ruim"] += cat.PIORA_DESCONTO_ALTO
    riscos = list(chances)
    return riscos[rng.choice(len(riscos), p=list(chances.values()))]


def _nova_venda(unidade, emp, data_venda, corretores, pesos, rng) -> dict:
    desconto = _sortear_desconto(rng)
    meses = carteira.meses_entre(emp["data_lancamento"], data_venda)
    preco_do_dia = unidade.preco_tabela * (1 + cat.REAJUSTE_MENSAL) ** meses
    valor = round(preco_do_dia * (1 - desconto / 100) * 100)  # centavos
    corretor_id = sortear_corretor(corretores, pesos, data_venda, rng)
    perfil = "investidor" if rng.random() < cat.CHANCE_INVESTIDOR else "morador"
    risco = _sortear_risco(emp, desconto, rng)

    parcelas = carteira.plano_de_pagamento(valor, data_venda, emp["previsao_entrega"], rng)
    pagamentos = carteira.simular_pagamentos(parcelas, risco, rng)
    distrato = carteira.data_do_distrato(parcelas, pagamentos, risco, data_venda, rng)
    if distrato is not None:
        parcelas, pagamentos = carteira.cortar_no_distrato(parcelas, pagamentos, distrato)

    return {
        "unidade_id": unidade.id,
        "corretor_id": corretor_id,
        "data_venda": data_venda,
        "valor": valor,
        "desconto_pct": desconto,
        "data_distrato": distrato,
        "perfil": perfil,
        "parcelas": parcelas,
        "pagamentos": pagamentos,
    }


def simular_vendas(unidades: pd.DataFrame, corretores: pd.DataFrame, rng) -> dict[str, pd.DataFrame]:
    empreendimentos = {e["id"]: e for e in cat.EMPREENDIMENTOS}
    pesos = _pesos_corretores(corretores, rng)

    simuladas = []
    for unidade in unidades.itertuples(index=False):
        emp = empreendimentos[unidade.empreendimento_id]
        livre_desde = emp["data_lancamento"]
        while True:
            data_venda = _sortear_data_de_venda(unidade, emp, livre_desde, rng)
            if data_venda is None:
                break
            venda = _nova_venda(unidade, emp, data_venda, corretores, pesos, rng)
            simuladas.append(venda)
            if venda["data_distrato"] is None:
                break
            livre_desde = venda["data_distrato"] + timedelta(days=1)  # a unidade volta para a venda

    # Número do contrato na ordem da data da venda
    simuladas.sort(key=lambda v: (v["data_venda"], v["unidade_id"]))
    linhas_venda, linhas_parcela, linhas_pagamento = [], [], []
    for venda_id, v in enumerate(simuladas, start=1):
        linhas_venda.append({
            "id": venda_id,
            "unidade_id": v["unidade_id"],
            "cliente_id": venda_id,  # um cliente por venda
            "corretor_id": v["corretor_id"],
            "data_venda": v["data_venda"],
            "valor_venda": v["valor"] / 100,
            "desconto_pct": v["desconto_pct"],
            "status": "distratada" if v["data_distrato"] else "ativa",
            "data_distrato": v["data_distrato"],
        })
        primeira = len(linhas_parcela) + 1
        for numero, (tipo, vencimento, valor) in enumerate(v["parcelas"], start=1):
            linhas_parcela.append({
                "id": len(linhas_parcela) + 1, "venda_id": venda_id, "numero": numero,
                "tipo": tipo, "vencimento": vencimento, "valor": valor / 100,
            })
        for indice, data, valor in v["pagamentos"]:
            linhas_pagamento.append({"parcela_id": primeira + indice, "data_pagamento": data, "valor_pago": valor / 100})

    venda = pd.DataFrame(linhas_venda)
    venda["data_venda"] = pd.to_datetime(venda["data_venda"])
    venda["data_distrato"] = pd.to_datetime(venda["data_distrato"])

    parcela = pd.DataFrame(linhas_parcela)
    parcela["vencimento"] = pd.to_datetime(parcela["vencimento"])

    # Código da baixa na ordem em que o ERP registrou os pagamentos
    pagamento = pd.DataFrame(linhas_pagamento).sort_values(["data_pagamento", "parcela_id"], kind="stable")
    pagamento.insert(0, "id", range(1, len(pagamento) + 1))
    pagamento["data_pagamento"] = pd.to_datetime(pagamento["data_pagamento"])

    cliente_base = pd.DataFrame({"id": venda["id"], "perfil": [v["perfil"] for v in simuladas]})
    return {
        "venda": venda[modelo.COLUNAS["venda"]],
        "parcela": parcela[modelo.COLUNAS["parcela"]],
        "pagamento": pagamento[modelo.COLUNAS["pagamento"]].reset_index(drop=True),
        "cliente_base": cliente_base,
    }
