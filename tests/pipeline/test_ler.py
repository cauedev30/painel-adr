import pandas as pd

from etl import modelo
from etl.gerar import sujeira

# Colunas que o leitor entrega com o nome em texto, para o R2 casar com o cadastro
COM_NOME_DO_CORRETOR = {"lead", "venda"}


def _colunas_esperadas(tabela: str) -> list[str]:
    colunas = modelo.COLUNAS[tabela]
    if tabela in COM_NOME_DO_CORRETOR:
        return ["corretor_nome" if c == "corretor_id" else c for c in colunas]
    return colunas


def test_chaves_colunas_e_linhas_batem_com_os_brutos(lidos, sujo):
    brutos, _ = sujo
    assert set(lidos) == set(modelo.TABELAS_ADR)
    for tabela, df in lidos.items():
        assert list(df.columns) == _colunas_esperadas(tabela), tabela

    espelho, parceiros = brutos[sujeira.ESPELHO], brutos[sujeira.PARCEIROS]
    assert len(lidos["lead"]) == len(brutos[sujeira.CRM])  # inclui as duplicatas do R1
    assert len(lidos["empreendimento"]) == len(espelho["Empreendimentos"])
    assert len(lidos["unidade"]) == len(espelho["Unidades"])
    assert len(lidos["venda"]) == len(espelho["Vendas"])
    assert len(lidos["cliente"]) == espelho["Vendas"]["Cód. cliente"].nunique()
    assert len(lidos["imobiliaria"]) == len(parceiros["Imobiliárias"])
    assert len(lidos["corretor"]) == len(parceiros["Corretores"])
    assert len(lidos["parcela"]) == len(brutos[sujeira.ERP_PARCELAS])
    assert len(lidos["pagamento"]) == len(brutos[sujeira.ERP_BAIXAS])


def test_acentos_certos_no_erp_e_no_crm(lidos):
    assert "balao" in set(lidos["parcela"]["tipo"])
    assert set(lidos["parcela"]["tipo"]) <= modelo.DOMINIOS["tipo_parcela"]
    assert lidos["lead"].columns[0] == "id"
    assert "João Pessoa" in set(lidos["lead"]["cidade"])


def test_rotulos_viram_codigos_e_vazio_vira_none(lidos, verdade):
    assert set(lidos["empreendimento"]["status"]) <= modelo.DOMINIOS["status_empreendimento"]
    assert set(lidos["unidade"]["tipologia"]) <= modelo.DOMINIOS["tipologia"]
    assert set(lidos["lead"]["etapa"]) <= modelo.DOMINIOS["etapa"]
    assert set(lidos["venda"]["status"]) <= modelo.DOMINIOS["status_venda"]
    assert set(lidos["cliente"]["perfil"]) <= modelo.DOMINIOS["perfil"]
    assert lidos["unidade"]["vista_mar"].map(type).eq(bool).all()
    assert lidos["empreendimento"]["slug"].tolist() == verdade["empreendimento"]["slug"].tolist()
    # o CSV não tem nulo: o leitor troca o campo vazio por None
    assert not lidos["lead"]["data_visita"].eq("").any()
    assert lidos["lead"]["data_visita"].isna().any()


def test_leitor_nao_corrige_sujeira(lidos, gabarito):
    caso = next(c for c in gabarito["regras"]["R3"]["casos"] if c["desfecho"] == "corrigido")
    assert lidos["lead"].set_index("id").loc[caso["id"], "canal"] == caso["sujo"]
    bairro = next(c for c in gabarito["regras"]["R2"]["casos"] if c["campo"] == "Bairro")
    assert lidos["empreendimento"].set_index("id").loc[bairro["id"], "bairro"] == bairro["sujo"]
    assert lidos["parcela"]["valor"].str.startswith("R$ ").all()  # o R5 converte


def test_cadastros_sem_sujeira_chegam_iguais_a_verdade(lidos, verdade):
    for tabela in ["unidade", "imobiliaria", "corretor"]:
        pd.testing.assert_frame_equal(lidos[tabela], verdade[tabela], check_dtype=False, obj=tabela)


def test_meta_mensal_tem_as_mesmas_linhas_da_verdade(lidos, verdade):
    chave = ["empreendimento_id", "mes"]
    lida = lidos["meta_mensal"].sort_values(chave).reset_index(drop=True)
    certa = verdade["meta_mensal"].sort_values(chave).reset_index(drop=True)
    pd.testing.assert_frame_equal(lida, certa, check_dtype=False)
