import pytest

from etl.config import SEMENTE
from etl.gerar import sujeira, verdade


@pytest.fixture(scope="session")
def tabelas():
    """A verdade completa, gerada uma vez por execução do pytest."""
    return verdade.gerar(SEMENTE)


@pytest.fixture(scope="session")
def sujo(tabelas):
    """(brutos, gabarito) da semente oficial."""
    return sujeira.sujar(tabelas, SEMENTE)
