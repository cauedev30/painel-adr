import pandas as pd
import pytest

from etl import modelo
from etl.tratar import r3_canais, tratar


@pytest.mark.parametrize("texto, canal", [
    ("insta", "instagram"), ("IG", "instagram"), ("Instagram", "instagram"),
    ("Zap", "whatsapp"), ("Formulário site", "site"), ("tik tok", "tiktok"),
    ("Indicação", "indicacao"), ("Panfleto", "outro"), ("?", "outro"),
])
def test_sinonimo_vira_canal_oficial(texto, canal):
    assert r3_canais.canal(pd.Series([texto])).iloc[0] == canal


@pytest.fixture(scope="module")
def tratado(lidos):
    return tratar(lidos)


def test_r3_bate_com_o_gabarito(tratado, gabarito):
    lead = tratado.tabelas["lead"].set_index("id")
    casos = gabarito["regras"]["R3"]["casos"]
    for acao, desfecho in [("corrigido", "corrigido"), ("outro", "outro")]:
        registro = next(r for r in tratado.registros if r.regra == "R3" and r.acao == acao)
        esperados = [c for c in casos if c["desfecho"] == desfecho]
        assert set(registro.ids) == {c["id"] for c in esperados}, acao
        assert lead.loc[[c["id"] for c in esperados], "canal"].tolist() == [c["verdade"] for c in esperados]
    outro = next(r for r in tratado.registros if r.regra == "R3" and r.acao == "outro")
    assert "Panfleto" in outro.descricao


def test_nenhum_canal_fora_do_dominio_e_o_resto_igual_a_verdade(tratado, verdade, gabarito):
    lead = tratado.tabelas["lead"].set_index("id")
    assert set(lead["canal"]) <= modelo.DOMINIOS["canal"]
    desconhecidos = {c["id"] for c in gabarito["regras"]["R3"]["casos"] if c["desfecho"] == "outro"}
    certo = verdade["lead"].set_index("id")["canal"]
    comuns = certo.index.intersection(lead.index).difference(sorted(desconhecidos))
    assert lead.loc[comuns, "canal"].tolist() == certo.loc[comuns].tolist()
