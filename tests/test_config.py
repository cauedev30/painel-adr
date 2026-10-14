from datetime import date

from etl import config


def test_janela_vai_de_janeiro_de_2023_ate_a_data_de_corte():
    assert config.INICIO_JANELA == date(2023, 1, 1)
    assert config.DATA_CORTE == date(2026, 9, 30)
    assert config.INICIO_JANELA < config.DATA_CORTE


def test_caminhos_ficam_dentro_do_repositorio():
    for caminho in (
        config.DIR_BRUTOS,
        config.DIR_LIMPOS,
        config.ARQ_GABARITO,
        config.DIR_SQL,
        config.ARQ_BANCO,
    ):
        assert caminho.is_relative_to(config.RAIZ)
    assert (config.RAIZ / "etl" / "config.py").is_file()
