from datetime import date

from etl import modelo
from etl.gerar import catalogo

# Tabela 3.1 da spec, copiada à mão do site da ADR (2026-10-13). Se o catálogo mudar, este teste quebra.
SITE = [
    ("Mares Cabo Branco", "Cabo Branco", "João Pessoa", "entregue", date(2025, 8, 1), 16.43, 39.15),
    ("Mares Seaside", "Bessa", "João Pessoa", "em_obras", date(2028, 1, 1), 18.20, 27.55),
    ("Mares Seaview", "Jardim Oceania", "João Pessoa", "em_obras", date(2028, 3, 1), 18.50, 21.81),
    ("Mares Bessa", "Bessa", "João Pessoa", "em_obras", date(2029, 2, 1), 18.03, 33.04),
    ("Mares Sense", "Cabo Branco", "João Pessoa", "pre_lancamento", None, 18.50, 21.81),
    ("Mares Blanc", "Intermares", "Cabedelo", "pre_lancamento", None, 19.00, 118.00),
    ("Nexus One", None, None, "pre_lancamento", None, None, None),
]


def test_empreendimentos_batem_com_o_site():
    obtido = [
        (e["nome"], e["bairro"], e["cidade"], e["status"], e["previsao_entrega"], e["area_min"], e["area_max"])
        for e in catalogo.EMPREENDIMENTOS
    ]
    assert obtido == SITE
    assert [e["id"] for e in catalogo.EMPREENDIMENTOS] == list(range(1, 8))
    blanc = catalogo.EMPREENDIMENTOS[5]
    assert blanc["entrega_texto"] == "2029"


def test_unidades_somam_390_e_o_bessa_tem_102():
    assert sum(e["unidades"] for e in catalogo.EMPREENDIMENTOS) == 390
    assert catalogo.EMPREENDIMENTOS[3]["unidades"] == 102


def test_pesos_somam_um():
    assert abs(sum(volume for volume, _ in catalogo.CANAIS.values()) - 1) < 1e-9
    assert abs(sum(c[3] for c in catalogo.CIDADES) - 1) < 1e-9
    assert abs(sum(peso for _, peso in catalogo.DOMINIOS_EMAIL) - 1) < 1e-9


def test_canais_do_catalogo_estao_no_dominio():
    assert set(catalogo.CANAIS) | {"outro"} == modelo.DOMINIOS["canal"]


def test_modelo_tem_as_12_tabelas_na_ordem_da_spec():
    assert list(modelo.COLUNAS) == modelo.TABELAS_ADR + ["relatorio_qualidade", "quarentena"]
    assert len(modelo.TABELAS_ADR) == 10
    assert modelo.COLUNAS["lead"] == [
        "id", "nome", "telefone", "email", "cidade", "canal", "empreendimento_id", "corretor_id",
        "data_entrada", "data_visita", "data_proposta", "etapa", "motivo_perda",
    ]
