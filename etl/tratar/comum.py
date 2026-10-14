"""O que toda regra de tratamento compartilha: o registro do que ela fez e o resultado que devolve.

Cada regra recebe as tabelas e devolve um Resultado: as tabelas tratadas, os registros (que viram o
relatório de qualidade) e as linhas que mandou para a quarentena, com o motivo.
"""

import unicodedata
from dataclasses import dataclass, field

import pandas as pd


@dataclass
class Registro:
    """Uma linha do relatório de qualidade. `ids` serve aos testes e não vai para o banco."""

    regra: str
    origem: str
    descricao: str
    linhas_afetadas: int
    acao: str  # corrigido, convertido, mesclado, nulo, outro, quarentena
    ids: list[int] = field(default_factory=list)


@dataclass
class Resultado:
    tabelas: dict[str, pd.DataFrame]
    registros: list[Registro] = field(default_factory=list)
    quarentena: list[dict] = field(default_factory=list)  # origem, regra, registro (dict), motivo


def normalizar_texto(texto: str) -> str:
    """Minúsculas, sem acento, espaços simples, sem espaço nas pontas: 'João  SILVA ' vira 'joao silva'."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return " ".join(sem_acento.lower().split())
