"""Constantes do projeto. Todo número simulado nasce desta semente e desta janela."""

from datetime import date
from pathlib import Path

SEMENTE = 20261014

INICIO_JANELA = date(2023, 1, 1)
DATA_CORTE = date(2026, 9, 30)

RAIZ = Path(__file__).resolve().parent.parent
DIR_BRUTOS = RAIZ / "dados" / "brutos"
DIR_LIMPOS = RAIZ / "dados" / "limpos"
ARQ_GABARITO = RAIZ / "dados" / "gabarito.json"
DIR_SQL = RAIZ / "sql"
ARQ_BANCO = RAIZ / "web" / "public" / "banco.tar.gz"
