import pytest

from etl import ler
from etl.gerar import exportar


@pytest.fixture(scope="session")
def verdade(tabelas):
    """As 10 tabelas certas, para comparar com o que o pipeline recupera."""
    return tabelas


@pytest.fixture(scope="session")
def gabarito(sujo):
    return sujo[1]


@pytest.fixture(scope="session")
def pasta_brutos(sujo, tmp_path_factory):
    """Os 6 brutos gravados em disco, como o pipeline os encontra em dados/brutos/."""
    brutos, gabarito = sujo
    pasta = tmp_path_factory.mktemp("dados")
    exportar.gravar(brutos, gabarito, pasta / "brutos", pasta / "gabarito.json")
    return pasta / "brutos"


@pytest.fixture(scope="session")
def lidos(pasta_brutos):
    return ler.ler(pasta_brutos)
