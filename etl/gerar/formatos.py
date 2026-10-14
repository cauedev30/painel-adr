"""Como cada sistema escreve telefone, data, dinheiro e rótulo."""

import pandas as pd

ROTULO_CANAL = {
    "instagram": "Instagram", "site": "Site", "whatsapp": "WhatsApp", "tiktok": "TikTok",
    "imobiliaria": "Imobiliária", "indicacao": "Indicação", "evento": "Evento",
}
ROTULO_ETAPA = {"novo": "Novo", "visita": "Visita", "proposta": "Proposta", "venda": "Venda", "perdido": "Perdido"}
ROTULO_STATUS_EMPREENDIMENTO = {"entregue": "Entregue", "em_obras": "Em obras", "pre_lancamento": "Pré-lançamento"}
ROTULO_STATUS_VENDA = {"ativa": "Ativa", "distratada": "Distratada"}
ROTULO_TIPOLOGIA = {"studio": "Studio", "duplex": "Duplex", "garden": "Garden"}
ROTULO_PERFIL = {"investidor": "Investidor", "morador": "Morador"}
ROTULO_TIPO_PARCELA = {"sinal": "Sinal", "mensal": "Mensal", "balao": "Balão anual", "chaves": "Chaves"}
MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def telefone_livre(e164: str, rng) -> str:
    """O CRM aceita o telefone do jeito que a pessoa digitou."""
    ddd, numero = e164[3:5], e164[5:]
    formatos = [
        f"({ddd}) {numero[:5]}-{numero[5:]}",
        f"{ddd}{numero}",
        f"+55 {ddd} {numero[:5]}-{numero[5:]}",
        f"0{ddd} {numero[:5]} {numero[5:]}",
        e164,
    ]
    return formatos[int(rng.integers(len(formatos)))]


def data_crm(momento: pd.Timestamp) -> str:
    return momento.strftime("%d/%m/%Y %H:%M")


def data_crm_alternativa(momento: pd.Timestamp) -> str:
    """Formato de um lote importado de outra ferramenta (R4)."""
    return momento.strftime("%Y-%m-%d %H:%M:%S")


def data_curta(dia: pd.Timestamp) -> str:
    return dia.strftime("%d/%m/%Y")


def data_iso(dia: pd.Timestamp) -> str:
    return dia.strftime("%Y-%m-%d")


def moeda(valor: float) -> str:
    """1234.56 vira 'R$ 1.234,56', como o ERP exporta."""
    texto = f"{valor:,.2f}"  # 1,234.56
    return "R$ " + texto.replace(",", "_").replace(".", ",").replace("_", ".")


def mes_curto(dia: pd.Timestamp) -> str:
    """2023-02-01 vira 'fev/2023'."""
    return f"{MESES[dia.month - 1]}/{dia.year}"
