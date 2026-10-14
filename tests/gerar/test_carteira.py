from collections import defaultdict
from datetime import date, timedelta

import numpy as np
import pytest

from etl.config import DATA_CORTE
from etl.gerar import carteira


@pytest.mark.parametrize("semente", range(5))
def test_plano_de_uma_venda_na_planta(semente):
    rng = np.random.default_rng(semente)
    plano = carteira.plano_de_pagamento(30_000_000, date(2024, 3, 15), date(2028, 1, 1), rng)

    assert sum(v for _, _, v in plano) == 30_000_000
    assert plano[0] == ("sinal", date(2024, 3, 15), plano[0][2])
    assert [p[1] for p in plano] == sorted(p[1] for p in plano)

    por_tipo = defaultdict(int)
    for tipo, _, valor in plano:
        por_tipo[tipo] += valor
    assert por_tipo == {"sinal": 3_000_000, "mensal": 6_000_000, "balao": 3_000_000, "chaves": 18_000_000}
    assert [p[1] for p in plano if p[0] == "balao"] == [date(a, 12, 15) for a in (2024, 2025, 2026, 2027)]
    assert [p[1] for p in plano if p[0] == "chaves"] == [date(2028, 1, 15)]
    assert 1 <= sum(p[0] == "sinal" for p in plano) <= 3


def test_plano_de_uma_venda_depois_da_entrega():
    rng = np.random.default_rng(0)
    plano = carteira.plano_de_pagamento(25_000_001, date(2025, 10, 10), date(2025, 8, 1), rng)
    assert plano == [
        ("sinal", date(2025, 10, 10), 2_500_000),
        ("chaves", date(2025, 11, 9), 22_500_001),
    ]


def test_vencimento_no_dia_28_quando_a_venda_e_no_fim_do_mes():
    rng = np.random.default_rng(0)
    plano = carteira.plano_de_pagamento(10_000_000, date(2024, 1, 31), date(2027, 1, 1), rng)
    # o sinal vence no dia da venda; o resto, no dia 28 (fevereiro não tem dia 31)
    assert plano[0][1] == date(2024, 1, 31)
    assert all(p[1].day == 28 for p in plano[1:])


@pytest.mark.parametrize("risco", ["bom", "medio", "ruim"])
def test_pagamentos_nao_passam_do_corte_nem_da_parcela(risco):
    rng = np.random.default_rng(1)
    plano = carteira.plano_de_pagamento(30_000_000, date(2024, 3, 15), date(2028, 1, 1), rng)
    pagamentos = carteira.simular_pagamentos(plano, risco, rng)
    pago = defaultdict(int)
    for indice, data, valor in pagamentos:
        assert data <= DATA_CORTE
        assert plano[indice][1] <= DATA_CORTE
        assert valor > 0
        pago[indice] += valor
    assert all(pago[i] <= plano[i][2] for i in pago)


def test_cliente_bom_paga_quase_tudo_e_ruim_deixa_em_aberto():
    def fracao_paga(risco):
        rng = np.random.default_rng(7)
        vencido = pago = 0
        for _ in range(40):
            plano = carteira.plano_de_pagamento(30_000_000, date(2024, 3, 15), date(2028, 1, 1), rng)
            vencido += sum(v for _, d, v in plano if d <= DATA_CORTE - timedelta(days=200))
            pago += sum(
                v for i, _, v in carteira.simular_pagamentos(plano, risco, rng)
                if plano[i][1] <= DATA_CORTE - timedelta(days=200)
            )
        return pago / vencido

    assert fracao_paga("bom") > 0.97
    assert fracao_paga("ruim") < 0.92


def test_distrato_so_depois_de_60_dias_de_atraso_ou_por_desistencia():
    distratos_com_atraso = 0
    for semente in range(300):
        rng = np.random.default_rng(semente)
        data_venda = date(2024, 3, 15)
        plano = carteira.plano_de_pagamento(30_000_000, data_venda, date(2028, 1, 1), rng)
        pagamentos = carteira.simular_pagamentos(plano, "ruim", rng)
        distrato = carteira.data_do_distrato(plano, pagamentos, "ruim", data_venda, rng)
        if distrato is None:
            continue
        assert data_venda < distrato <= DATA_CORTE
        parcelas, restantes = carteira.cortar_no_distrato(plano, pagamentos, distrato)
        assert all(venc <= distrato for _, venc, _ in parcelas)
        assert all(data <= distrato and i < len(parcelas) for i, data, _ in restantes)
        distratos_com_atraso += 1
    # cliente ruim quase sempre passa de 60 dias de atraso em algum momento: muitos distratos
    assert distratos_com_atraso > 100
