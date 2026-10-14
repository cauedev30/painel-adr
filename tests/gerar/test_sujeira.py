import re

import pandas as pd
import pytest

from etl.config import SEMENTE
from etl.gerar import formatos, sujeira


def _bruto(brutos, arquivo, aba):
    tabela = brutos[arquivo] if aba is None else brutos[arquivo][aba]
    return tabela.set_index(sujeira.COLUNA_ID[(arquivo, aba)], drop=False)


def _igual(a, b) -> bool:
    if sujeira._vazio(a) and sujeira._vazio(b):
        return True
    if isinstance(b, str) and isinstance(a, pd.Timestamp):
        return formatos.data_iso(a) == b
    return a == b


def _normalizar_telefone(texto: str) -> str | None:
    digitos = re.sub(r"\D", "", texto).lstrip("0")
    if len(digitos) == 11:
        return "+55" + digitos
    if len(digitos) == 13 and digitos.startswith("55"):
        return "+" + digitos
    return None


@pytest.fixture(scope="module")
def casos(sujo):
    _, gabarito = sujo
    return [(regra, caso) for regra, r in gabarito["regras"].items() for caso in r["casos"]]


def test_os_seis_brutos_e_as_abas(sujo):
    brutos, _ = sujo
    assert set(brutos) == {sujeira.CRM, sujeira.ESPELHO, sujeira.PARCEIROS, sujeira.ERP_PARCELAS,
                           sujeira.ERP_BAIXAS, sujeira.METAS}
    assert list(brutos[sujeira.ESPELHO]) == ["Empreendimentos", "Unidades", "Vendas"]
    assert list(brutos[sujeira.PARCEIROS]) == ["Imobiliárias", "Corretores"]
    assert list(brutos[sujeira.METAS]["Metas"].columns[:3]) == ["Empreendimento", "fev/2023", "mar/2023"]


def test_todo_caso_esta_no_bruto_com_o_valor_sujo(sujo, casos):
    brutos, _ = sujo
    for regra, caso in casos:
        if caso["campo"] is None:
            continue
        linha = _bruto(brutos, caso["arquivo"], caso["aba"]).loc[caso["id"]]
        assert _igual(linha[caso["campo"]], caso["sujo"]), (regra, caso)


def test_cada_linha_suja_tem_uma_regra_so(casos):
    linhas = [(c["arquivo"], c["aba"], c["id"]) for _, c in casos]
    linhas += [(sujeira.CRM, None, c["mantido"]) for r, c in casos if r == "R1"]
    assert len(linhas) == len(set(linhas))


def test_o_que_nao_esta_no_gabarito_esta_limpo(sujo, casos, tabelas):
    brutos, _ = sujo
    sujas = {(c["arquivo"], c["aba"], c["id"]) for _, c in casos}
    sujas |= {(sujeira.CRM, None, c["mantido"]) for r, c in casos if r == "R1"}

    crm = brutos[sujeira.CRM]
    limpas = crm[[(sujeira.CRM, None, i) not in sujas for i in crm["ID"]]]
    nomes = set(tabelas["corretor"]["nome"])
    assert limpas["Canal"].isin(formatos.ROTULO_CANAL.values()).all()
    assert limpas["Data de entrada"].str.fullmatch(r"\d{2}/\d{2}/\d{4} \d{2}:\d{2}").all()
    assert limpas["Corretor"].dropna().isin(nomes).all()
    assert limpas["E-mail"].dropna().str.fullmatch(r"[a-z0-9._]+@[a-z]+(\.[a-z]+)+").all()

    vendas = brutos[sujeira.ESPELHO]["Vendas"]
    limpas = vendas[[(sujeira.ESPELHO, "Vendas", i) not in sujas for i in vendas["Contrato"]]]
    verdade = tabelas["venda"].set_index("id").loc[limpas["Contrato"]]
    assert limpas["Corretor"].isin(nomes).all()
    assert (limpas["Valor da venda"].to_numpy() == verdade["valor_venda"].to_numpy()).all()
    assert (limpas["Data da venda"].to_numpy() == verdade["data_venda"].to_numpy()).all()

    emp = brutos[sujeira.ESPELHO]["Empreendimentos"]
    limpas = emp[[(sujeira.ESPELHO, "Empreendimentos", i) not in sujas for i in emp["Código"]]]
    bairro = tabelas["empreendimento"].set_index("id")["bairro"]
    assert limpas["Bairro"].fillna("").tolist() == bairro.loc[limpas["Código"]].fillna("").tolist()

    parcelas = brutos[sujeira.ERP_PARCELAS]
    limpas = parcelas[[(sujeira.ERP_PARCELAS, None, i) not in sujas for i in parcelas["cod_parcela"]]]
    assert limpas["vencimento"].str.fullmatch(r"20[23]\d-\d{2}-\d{2}").all()

    baixas = brutos[sujeira.ERP_BAIXAS]
    limpas = baixas[[(sujeira.ERP_BAIXAS, None, i) not in sujas for i in baixas["cod_baixa"]]]
    assert limpas["cod_parcela"].isin(parcelas["cod_parcela"]).all()


def test_r1_duplicata_casa_pelo_telefone_ou_pelo_email(sujo, casos, tabelas):
    brutos, gabarito = sujo
    crm = _bruto(brutos, sujeira.CRM, None)
    lead = tabelas["lead"].set_index("id")
    r1 = [c for r, c in casos if r == "R1"]
    assert abs(len(r1) / len(lead) - sujeira.FRACAO_DUPLICADOS) < 0.005
    for caso in r1:
        duplicata, original = crm.loc[caso["id"]], lead.loc[caso["mantido"]]
        mesmo_telefone = _normalizar_telefone(duplicata["Telefone"]) == original["telefone"]
        mesmo_email = not sujeira._vazio(duplicata["E-mail"]) and duplicata["E-mail"].lower() == original["email"]
        assert mesmo_telefone or mesmo_email
        assert pd.to_datetime(duplicata["Data de entrada"], format="%d/%m/%Y %H:%M") >= original["data_entrada"].floor("min")
    assert any(c["trabalho_na_duplicata"] for c in r1) and not all(c["trabalho_na_duplicata"] for c in r1)


def test_quarentena_esperada_inclui_a_cascata(sujo, tabelas):
    _, gabarito = sujo
    q = gabarito["quarentena_esperada"]
    p, pg = tabelas["parcela"], tabelas["pagamento"]
    parcelas_das_vendas = set(p.loc[p["venda_id"].isin(q["venda"]), "id"])
    assert parcelas_das_vendas <= set(q["parcela"])
    pagamentos_das_parcelas = set(pg.loc[pg["parcela_id"].isin(q["parcela"]), "id"])
    assert pagamentos_das_parcelas <= set(q["pagamento"])
    assert len(q["venda"]) == sujeira.VENDAS_ANTES_DO_LEAD + sujeira.VENDAS_COM_DIGITO_A_MENOS
    assert len(q["lead"]) == sujeira.AMBIGUOS_NO_CRM


def test_contagens_e_determinismo(sujo, tabelas):
    _, gabarito = sujo
    for regra in gabarito["regras"].values():
        assert regra["linhas_sujadas"] == len(regra["casos"]) > 0
    _, de_novo = sujeira.sujar(tabelas, SEMENTE)
    assert de_novo == gabarito
