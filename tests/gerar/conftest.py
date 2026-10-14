import pytest

from etl.config import SEMENTE
from etl.gerar import verdade


@pytest.fixture(scope="session")
def tabelas():
    """A verdade completa, gerada uma vez por execução do pytest."""
    return verdade.gerar(SEMENTE)
