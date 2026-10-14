"""Ler: os 6 brutos viram DataFrames com os nomes do modelo (etl.modelo.COLUNAS).

O leitor só entende formatos: codificação, separador, nome de coluna e rótulo (`Em obras` vira
`em_obras`). Ele nunca corrige valor (D3.2): canal, nome de corretor e bairro chegam do jeito que
estão, e as datas e o dinheiro dos CSVs chegam em texto, para o R4 e o R5 converterem.
Lead e venda trazem `corretor_nome` no lugar de `corretor_id`: quem casa o nome com o cadastro é o R2.
"""

import unicodedata
from pathlib import Path

import pandas as pd

CRM = "crm_leads.csv"
ESPELHO = "comercial_espelho.xlsx"
PARCEIROS = "comercial_parceiros.xlsx"
ERP_PARCELAS = "erp_parcelas.csv"
ERP_BAIXAS = "erp_baixas.csv"
METAS = "diretoria_metas.xlsx"

# Como cada sistema escreve os valores fechados → o código do modelo
STATUS_EMPREENDIMENTO = {"Entregue": "entregue", "Em obras": "em_obras", "Pré-lançamento": "pre_lancamento"}
TIPOLOGIA = {"Studio": "studio", "Duplex": "duplex", "Garden": "garden"}
ETAPA = {"Novo": "novo", "Visita": "visita", "Proposta": "proposta", "Venda": "venda", "Perdido": "perdido"}
PERFIL = {"Investidor": "investidor", "Morador": "morador"}
STATUS_VENDA = {"Ativa": "ativa", "Distratada": "distratada"}
TIPO_PARCELA = {"Sinal": "sinal", "Mensal": "mensal", "Balão anual": "balao", "Chaves": "chaves"}
SIM_NAO = {"Sim": True, "Não": False}
MESES = {"jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
         "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12}


def _csv(caminho: Path, codificacao: str) -> pd.DataFrame:
    """Tudo como texto; campo vazio vira nulo."""
    df = pd.read_csv(caminho, sep=";", encoding=codificacao, dtype=str, keep_default_na=False)
    return df.replace("", None)


def _rotulo(serie: pd.Series, mapa: dict, nome: str) -> pd.Series:
    """Troca o rótulo do sistema pelo código; rótulo desconhecido é erro de formato, não sujeira."""
    desconhecidos = sorted(set(serie.dropna()) - set(mapa))
    if desconhecidos:
        raise ValueError(f"{nome}: rótulo desconhecido {desconhecidos}")
    return serie.map(mapa)


def _pelo_nome(serie: pd.Series, cadastro: pd.Series, nome: str) -> pd.Series:
    """Nome de cadastro (empreendimento, imobiliária, unidade) → id. O cadastro vem limpo."""
    ids = serie.map(cadastro)
    faltando = sorted(set(serie[ids.isna() & serie.notna()]))
    if faltando:
        raise ValueError(f"{nome}: não está no cadastro {faltando}")
    return ids.astype("Int64")


def _slug(nome: str) -> str:
    """'Mares Cabo Branco' vira 'mares-cabo-branco'."""
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return "-".join(sem_acento.lower().split())


def _mes(texto: str) -> pd.Timestamp:
    """'fev/2023' vira 2023-02-01."""
    mes, ano = texto.split("/")
    return pd.Timestamp(year=int(ano), month=MESES[mes], day=1)


def _texto_ou_nulo(serie: pd.Series) -> pd.Series:
    """Coluna de texto do .xlsx: célula vazia vem como NaN; fica nula do mesmo jeito que no CSV."""
    return serie.astype("str").where(serie.notna(), None)


def _ler_crm(pasta: Path, emp_id: pd.Series) -> pd.DataFrame:
    crm = _csv(pasta / CRM, "utf-8-sig")
    return pd.DataFrame({
        "id": crm["ID"].astype(int),
        "nome": crm["Nome"],
        "telefone": crm["Telefone"],
        "email": crm["E-mail"],
        "cidade": crm["Cidade"],
        "canal": crm["Canal"],
        "empreendimento_id": _pelo_nome(crm["Empreendimento"], emp_id, "CRM, empreendimento"),
        "corretor_nome": crm["Corretor"],
        "data_entrada": crm["Data de entrada"],
        "data_visita": crm["Data da visita"],
        "data_proposta": crm["Data da proposta"],
        "etapa": _rotulo(crm["Etapa"], ETAPA, "CRM, etapa"),
        "motivo_perda": crm["Motivo da perda"],
    })


def _ler_espelho(pasta: Path) -> dict[str, pd.DataFrame]:
    abas = pd.read_excel(pasta / ESPELHO, sheet_name=None)
    emp, uni, ven = abas["Empreendimentos"], abas["Unidades"], abas["Vendas"]

    empreendimento = pd.DataFrame({
        "id": emp["Código"].astype(int),
        "nome": emp["Empreendimento"],
        "slug": emp["Empreendimento"].map(_slug),
        "bairro": _texto_ou_nulo(emp["Bairro"]),
        "cidade": _texto_ou_nulo(emp["Cidade"]),
        "status": _rotulo(emp["Status"], STATUS_EMPREENDIMENTO, "espelho, status do empreendimento"),
        "data_lancamento": emp["Lançamento"],
        "previsao_entrega": emp["Previsão de entrega"],
    })
    emp_id = empreendimento.set_index("nome")["id"]

    unidade = pd.DataFrame({
        "id": uni["ID"].astype(int),
        "empreendimento_id": _pelo_nome(uni["Empreendimento"], emp_id, "espelho, empreendimento da unidade"),
        "codigo": uni["Código"],
        "andar": uni["Andar"].astype(int),
        "tipologia": _rotulo(uni["Tipologia"], TIPOLOGIA, "espelho, tipologia"),
        "area_privativa_m2": uni["Área (m²)"],
        "vista_mar": _rotulo(uni["Vista mar"], SIM_NAO, "espelho, vista mar").astype(bool),
        "preco_tabela": uni["Preço de tabela"],
    })

    venda = pd.DataFrame({
        "id": ven["Contrato"].astype(int),
        "unidade_id": _pelo_nome(ven["Unidade"], unidade.set_index("codigo")["id"], "espelho, unidade da venda"),
        "cliente_id": ven["Cód. cliente"].astype(int),
        "corretor_nome": _texto_ou_nulo(ven["Corretor"]),
        "data_venda": ven["Data da venda"],
        "valor_venda": ven["Valor da venda"],
        "desconto_pct": ven["Desconto (%)"],
        "status": _rotulo(ven["Status"], STATUS_VENDA, "espelho, status da venda"),
        "data_distrato": ven["Data do distrato"],
    })

    # o cliente vem na mesma linha da venda; um cliente com duas vendas aparece duas vezes
    cliente = pd.DataFrame({
        "id": ven["Cód. cliente"].astype(int),
        "lead_id": ven["Cód. CRM"].astype(int),
        "nome": ven["Cliente"],
        "cidade": _texto_ou_nulo(ven["Cidade"]),
        "uf": _texto_ou_nulo(ven["UF"]),
        "perfil": _rotulo(ven["Perfil"], PERFIL, "espelho, perfil"),
    }).drop_duplicates("id").sort_values("id").reset_index(drop=True)

    return {"empreendimento": empreendimento, "unidade": unidade, "venda": venda, "cliente": cliente}


def _ler_parceiros(pasta: Path) -> dict[str, pd.DataFrame]:
    abas = pd.read_excel(pasta / PARCEIROS, sheet_name=None)
    imob, cor = abas["Imobiliárias"], abas["Corretores"]
    imobiliaria = pd.DataFrame({"id": imob["Código"].astype(int), "nome": imob["Imobiliária"], "cidade": imob["Cidade"]})
    corretor = pd.DataFrame({
        "id": cor["Código"].astype(int),
        "nome": cor["Corretor"],
        "creci": _texto_ou_nulo(cor["CRECI"]),
        "imobiliaria_id": _pelo_nome(_texto_ou_nulo(cor["Imobiliária"]), imobiliaria.set_index("nome")["id"],
                                     "parceiros, imobiliária do corretor"),
        "data_inicio": cor["Início"],
    })
    return {"imobiliaria": imobiliaria, "corretor": corretor}


def _ler_erp(pasta: Path) -> dict[str, pd.DataFrame]:
    p = _csv(pasta / ERP_PARCELAS, "latin-1")
    b = _csv(pasta / ERP_BAIXAS, "latin-1")
    parcela = pd.DataFrame({
        "id": p["cod_parcela"].astype(int),
        "venda_id": p["cod_contrato"].astype(int),
        "numero": p["num_parcela"].astype(int),
        "tipo": _rotulo(p["tipo"], TIPO_PARCELA, "ERP, tipo de parcela"),
        "vencimento": p["vencimento"],
        "valor": p["valor"],
    })
    pagamento = pd.DataFrame({
        "id": b["cod_baixa"].astype(int),
        "parcela_id": b["cod_parcela"].astype(int),
        "data_pagamento": b["data_pagamento"],
        "valor_pago": b["valor_pago"],
    })
    return {"parcela": parcela, "pagamento": pagamento}


def _ler_metas(pasta: Path, emp_id: pd.Series) -> pd.DataFrame:
    """A planilha da diretoria é larga (um mês por coluna); o banco quer uma linha por mês."""
    largo = pd.read_excel(pasta / METAS, sheet_name="Metas")
    longo = largo.melt(id_vars="Empreendimento", var_name="mes", value_name="meta_unidades").dropna()
    return pd.DataFrame({
        "empreendimento_id": _pelo_nome(longo["Empreendimento"], emp_id, "metas, empreendimento"),
        "mes": longo["mes"].map(_mes),
        "meta_unidades": longo["meta_unidades"].astype(int),
    }).reset_index(drop=True)


def ler(pasta: Path) -> dict[str, pd.DataFrame]:
    """Lê os 6 brutos da pasta; devolve uma tabela por chave de etl.modelo.TABELAS_ADR."""
    tabelas = _ler_espelho(pasta)
    emp_id = tabelas["empreendimento"].set_index("nome")["id"]
    tabelas["lead"] = _ler_crm(pasta, emp_id)
    tabelas.update(_ler_parceiros(pasta))
    tabelas.update(_ler_erp(pasta))
    tabelas["meta_mensal"] = _ler_metas(pasta, emp_id)
    return tabelas
