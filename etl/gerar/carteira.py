"""A carteira de uma venda: plano de pagamento, pagamentos e distrato.

Dinheiro aqui é sempre em centavos inteiros, para a soma das parcelas bater com a venda exatamente.
Uma parcela é a tupla (tipo, vencimento, centavos); um pagamento, (índice da parcela, data, centavos).
"""

from collections import defaultdict
from datetime import date, timedelta

from etl.config import DATA_CORTE
from etl.gerar import catalogo as cat

ORDEM_TIPO = {"sinal": 0, "mensal": 1, "balao": 2, "chaves": 3}


def meses_entre(inicio: date, fim: date) -> int:
    return (fim.year - inicio.year) * 12 + fim.month - inicio.month


def _mes_seguinte(data: date, meses: int, dia: int) -> date:
    indice = data.year * 12 + data.month - 1 + meses
    return date(indice // 12, indice % 12 + 1, dia)


def _dividir(tipo: str, vencimentos: list[date], total: int) -> list[tuple[str, date, int]]:
    """Divide o total em parcelas iguais; a sobra do arredondamento vai para a última."""
    if not vencimentos:
        return []
    base = total // len(vencimentos)
    valores = [base] * (len(vencimentos) - 1) + [total - base * (len(vencimentos) - 1)]
    return [(tipo, v, valor) for v, valor in zip(vencimentos, valores)]


def plano_de_pagamento(valor: int, data_venda: date, entrega: date | None, rng) -> list[tuple[str, date, int]]:
    sinal = round(valor * cat.PLANO["sinal"])

    # Imóvel pronto (ou quase): sinal e o resto nas chaves, em 30 dias
    if entrega is None or meses_entre(data_venda, entrega) < 3:
        return [("sinal", data_venda, sinal), ("chaves", data_venda + timedelta(days=30), valor - sinal)]

    # Na planta: sinal em 1 a 3 vezes, mensais até a entrega, balões em dezembro e as chaves
    dia = min(data_venda.day, 28)
    meses_ate_entrega = meses_entre(data_venda, entrega)
    vezes_sinal = int(rng.integers(1, 4))
    venc_sinal = [data_venda] + [_mes_seguinte(data_venda, k, dia) for k in range(1, vezes_sinal)]
    venc_mensal = [_mes_seguinte(data_venda, k, dia) for k in range(vezes_sinal, meses_ate_entrega)]
    venc_balao = [
        _mes_seguinte(data_venda, k, dia) for k in range(1, meses_ate_entrega)
        if _mes_seguinte(data_venda, k, 1).month == 12
    ]
    mensal = round(valor * cat.PLANO["mensal"]) if venc_mensal else 0
    balao = round(valor * cat.PLANO["balao"]) if venc_balao else 0
    chaves = valor - sinal - mensal - balao  # sem mensal ou sem balão, a parte deles vai para as chaves

    parcelas = (
        _dividir("sinal", venc_sinal, sinal)
        + _dividir("mensal", venc_mensal, mensal)
        + _dividir("balao", venc_balao, balao)
        + [("chaves", _mes_seguinte(data_venda, meses_ate_entrega, dia), chaves)]
    )
    return sorted(parcelas, key=lambda p: (p[1], ORDEM_TIPO[p[0]]))


def _atraso(risco: str, rng) -> int | None:
    """Dias de atraso de um pagamento (negativo = adiantado; None = nunca paga)."""
    sorteio = rng.random()
    if risco == "bom":
        faixas = [(0.85, -5, 2), (1.00, 3, 20)]
    elif risco == "medio":
        faixas = [(0.50, -3, 3), (0.85, 5, 45), (1.00, 46, 120)]
    else:
        faixas = [(0.30, 0, 10), (0.60, 11, 60), (0.85, 61, 180), (1.00, None, None)]
    for limite, menor, maior in faixas:
        if sorteio < limite:
            return None if menor is None else int(rng.integers(menor, maior + 1))
    return None


def simular_pagamentos(parcelas, risco: str, rng) -> list[tuple[int, date, int]]:
    pagamentos = []
    data_venda = parcelas[0][1]
    for i, (tipo, vencimento, valor) in enumerate(parcelas):
        if vencimento > DATA_CORTE:
            break  # as parcelas estão em ordem de vencimento: dali para a frente, tudo é futuro
        atraso = _atraso(risco, rng)
        if atraso is None and tipo == "chaves":
            # as chaves saem do financiamento bancário: atrasam, mas são pagas
            atraso = int(rng.integers(*cat.ATRASO_CHAVES_SEM_PAGAMENTO))
        if atraso is None:
            continue
        data = max(vencimento + timedelta(days=atraso), data_venda)
        if data > DATA_CORTE:
            continue  # ainda em aberto na data de corte
        if rng.random() < cat.CHANCE_PAGAMENTO_PARCIAL:
            primeira = round(valor * rng.uniform(0.3, 0.7))
            pagamentos.append((i, data, primeira))
            segunda = data + timedelta(days=int(rng.integers(5, 31)))
            if segunda <= DATA_CORTE:
                pagamentos.append((i, segunda, valor - primeira))
        else:
            pagamentos.append((i, data, valor))
    return pagamentos


def _primeiro_atraso_acima_de_60(parcelas, pagamentos) -> date | None:
    """O dia em que alguma parcela passou de 60 dias de atraso, ou None."""
    pago = defaultdict(int)
    quitada_em = {}
    for i, data, valor in sorted(pagamentos, key=lambda p: p[1]):
        pago[i] += valor
        if pago[i] >= parcelas[i][2] and i not in quitada_em:
            quitada_em[i] = data
    for i, (_, vencimento, _) in enumerate(parcelas):
        marco = vencimento + timedelta(days=61)
        if marco > DATA_CORTE:
            return None
        quitacao = quitada_em.get(i)
        if quitacao is None or quitacao >= marco:
            return marco
    return None


def data_do_distrato(parcelas, pagamentos, risco: str, data_venda: date, rng) -> date | None:
    marco = _primeiro_atraso_acima_de_60(parcelas, pagamentos)
    if marco is not None and rng.random() < cat.CHANCE_DISTRATO_APOS_60_DIAS[risco]:
        data = marco + timedelta(days=int(rng.integers(0, 91)))
        if data <= DATA_CORTE:
            return data
    # desistência, sem atraso antes
    if rng.random() < cat.CHANCE_DESISTENCIA:
        data = data_venda + timedelta(days=int(rng.integers(60, 400)))
        if data <= DATA_CORTE:
            return data
    return None


def cortar_no_distrato(parcelas, pagamentos, data: date):
    """Depois do distrato não há mais cobrança: ficam só as parcelas vencidas até ele (D2.8)."""
    ficam = [p for p in parcelas if p[1] <= data]
    pagos = [p for p in pagamentos if p[0] < len(ficam) and p[1] <= data]
    return ficam, pagos
