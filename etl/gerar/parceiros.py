"""Imobiliárias e corretores (nomes inventados)."""

import unicodedata
from datetime import date, timedelta

import pandas as pd

from etl import modelo
from etl.gerar import catalogo as cat

VENDA_DIRETA = "Venda direta"


def _sem_acento(texto: str) -> str:
    decomposto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in decomposto if not unicodedata.combining(c))


def abreviar(nome: str) -> str:
    """'João Felipe Sampaio' vira 'J. Sampaio': a inicial e o último sobrenome."""
    return f"{nome[0]}. {nome.split()[-1]}"


def chave_de_abreviacao(nomes: pd.Series) -> pd.Series:
    """Dois corretores com a mesma chave ficam iguais quando abreviados (ambíguos)."""
    return nomes.map(lambda n: _sem_acento(abreviar(n)).lower())


def gerar_imobiliarias() -> pd.DataFrame:
    imobiliarias = pd.DataFrame(cat.IMOBILIARIAS, columns=["nome", "cidade"])
    imobiliarias.insert(0, "id", range(1, len(imobiliarias) + 1))
    return imobiliarias[modelo.COLUNAS["imobiliaria"]]


def _sortear_data(rng, inicio: date, fim: date) -> date:
    return inicio + timedelta(days=int(rng.integers(0, (fim - inicio).days + 1)))


def gerar_corretores(rng, fake) -> pd.DataFrame:
    # Nomes: o par ambíguo plantado primeiro; os outros não podem colidir nem por abreviação
    nomes = list(cat.CORRETORES_AMBIGUOS)
    chaves = {_sem_acento(abreviar(n)).lower() for n in nomes}
    total = sum(cat.CORRETORES_POR_IMOBILIARIA) + cat.CORRETORES_AUTONOMOS
    while len(nomes) < total:
        nome = f"{fake.first_name()} {fake.last_name()}"
        chave = _sem_acento(abreviar(nome)).lower()
        if nome not in nomes and chave not in chaves:
            nomes.append(nome)
            chaves.add(chave)

    imobiliarias = []
    for imobiliaria_id, quantos in enumerate(cat.CORRETORES_POR_IMOBILIARIA, start=1):
        imobiliarias += [imobiliaria_id] * quantos
    imobiliarias += [None] * cat.CORRETORES_AUTONOMOS
    imobiliarias = [imobiliarias[i] for i in rng.permutation(total)]

    crecis = rng.choice(range(1_000, 30_000), size=total, replace=False)

    linhas = [{"nome": VENDA_DIRETA, "creci": None, "imobiliaria_id": None, "data_inicio": date(2022, 6, 1)}]
    for i, nome in enumerate(nomes):
        if i < 10:  # os 10 primeiros já trabalhavam com a ADR antes de 2023
            inicio = _sortear_data(rng, date(2022, 6, 1), date(2022, 12, 31))
        else:
            inicio = _sortear_data(rng, date(2023, 1, 1), date(2025, 12, 1))
        linhas.append({
            "nome": nome,
            "creci": f"{int(crecis[i]):05d}-F",
            "imobiliaria_id": imobiliarias[i],
            "data_inicio": inicio,
        })

    corretores = pd.DataFrame(linhas)
    corretores.insert(0, "id", range(1, len(corretores) + 1))
    corretores["imobiliaria_id"] = corretores["imobiliaria_id"].astype("Int64")
    corretores["data_inicio"] = pd.to_datetime(corretores["data_inicio"])
    return corretores[modelo.COLUNAS["corretor"]]
