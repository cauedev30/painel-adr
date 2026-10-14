"""As 390 unidades dos 4 empreendimentos lançados."""

import math

import pandas as pd

from etl import modelo
from etl.gerar import catalogo as cat

# Garden só existe onde a faixa de área tem unidade grande; duplex, onde tem maior ainda
AREA_MINIMA_GARDEN = 25
AREA_MINIMA_DUPLEX = 30


def _tipologia(emp, andar, posicao, andares):
    if emp["area_max"] >= AREA_MINIMA_GARDEN and andar == 1 and posicao > cat.UNIDADES_POR_ANDAR - 2:
        return "garden"
    if emp["area_max"] >= AREA_MINIMA_DUPLEX and andar == andares:
        return "duplex"
    return "studio"


def _preco_tabela(emp, area, andar, tipologia, vista_mar):
    """Preço de tabela no lançamento, arredondado para R$ 100."""
    preco = emp["preco_m2_base"] * area
    preco *= 1 + (cat.PREMIO_VISTA_MAR if vista_mar else 0)
    preco *= 1 + cat.PREMIO_POR_ANDAR * (andar - 1)
    preco *= 1 + (cat.PREMIO_DUPLEX_GARDEN if tipologia != "studio" else 0)
    return float(round(preco / 100) * 100)


def gerar_unidades(rng) -> pd.DataFrame:
    linhas = []
    for emp in cat.EMPREENDIMENTOS:
        n = emp["unidades"]
        if not n:
            continue
        andares = math.ceil(n / cat.UNIDADES_POR_ANDAR)
        amplitude = emp["area_max"] - emp["area_min"]
        so_studios = emp["area_max"] < AREA_MINIMA_GARDEN
        teto_studio = emp["area_max"] if so_studios else emp["area_min"] + 0.4 * amplitude
        piso_grande = emp["area_max"] - 0.35 * amplitude

        do_emp = []
        for i in range(n):
            andar = i // cat.UNIDADES_POR_ANDAR + 1
            posicao = i % cat.UNIDADES_POR_ANDAR + 1
            tipologia = _tipologia(emp, andar, posicao, andares)
            if tipologia == "studio":
                area = rng.uniform(emp["area_min"], teto_studio)
            else:
                area = rng.uniform(piso_grande, emp["area_max"])
            do_emp.append({
                "empreendimento_id": emp["id"],
                "codigo": f"{emp['sigla']}-{andar:02d}{posicao:02d}",
                "andar": andar,
                "tipologia": tipologia,
                "area_privativa_m2": round(float(area), 2),
                "vista_mar": posicao <= cat.POSICOES_VISTA_MAR,
            })

        # A faixa de área tem de bater com o site: a primeira unidade fica com a mínima
        # e a última da maior tipologia, com a máxima
        do_emp[0]["area_privativa_m2"] = emp["area_min"]
        grandes = [u for u in do_emp if u["tipologia"] != "studio"] or do_emp
        grandes[-1]["area_privativa_m2"] = emp["area_max"]

        for u in do_emp:
            u["preco_tabela"] = _preco_tabela(emp, u["area_privativa_m2"], u["andar"], u["tipologia"], u["vista_mar"])
        linhas.extend(do_emp)

    unidades = pd.DataFrame(linhas)
    unidades.insert(0, "id", range(1, len(unidades) + 1))
    return unidades[modelo.COLUNAS["unidade"]]
