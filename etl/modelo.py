"""O modelo do banco em Python: colunas de cada tabela, na ordem do CREATE TABLE, e os valores fechados.

É o contrato entre a geração (etapa 2), o pipeline (etapa 3) e o schema SQL.
"""

TABELAS_ADR = [
    "empreendimento",
    "unidade",
    "imobiliaria",
    "corretor",
    "lead",
    "cliente",
    "venda",
    "parcela",
    "pagamento",
    "meta_mensal",
]

COLUNAS = {
    "empreendimento": ["id", "nome", "slug", "bairro", "cidade", "status", "data_lancamento", "previsao_entrega"],
    "unidade": ["id", "empreendimento_id", "codigo", "andar", "tipologia", "area_privativa_m2", "vista_mar", "preco_tabela"],
    "imobiliaria": ["id", "nome", "cidade"],
    "corretor": ["id", "nome", "creci", "imobiliaria_id", "data_inicio"],
    "lead": [
        "id", "nome", "telefone", "email", "cidade", "canal", "empreendimento_id", "corretor_id",
        "data_entrada", "data_visita", "data_proposta", "etapa", "motivo_perda",
    ],
    "cliente": ["id", "lead_id", "nome", "cidade", "uf", "perfil"],
    "venda": [
        "id", "unidade_id", "cliente_id", "corretor_id", "data_venda", "valor_venda", "desconto_pct",
        "status", "data_distrato",
    ],
    "parcela": ["id", "venda_id", "numero", "tipo", "vencimento", "valor"],
    "pagamento": ["id", "parcela_id", "data_pagamento", "valor_pago"],
    "meta_mensal": ["empreendimento_id", "mes", "meta_unidades"],
    # schema auditoria
    "relatorio_qualidade": ["regra", "origem", "descricao", "linhas_afetadas", "acao"],
    "quarentena": ["id", "origem", "regra", "registro", "motivo"],
}

DOMINIOS = {
    "status_empreendimento": {"pre_lancamento", "em_obras", "entregue"},
    "tipologia": {"studio", "duplex", "garden"},
    "canal": {"instagram", "site", "whatsapp", "tiktok", "imobiliaria", "indicacao", "evento", "outro"},
    "etapa": {"novo", "visita", "proposta", "venda", "perdido"},
    "perfil": {"investidor", "morador"},
    "status_venda": {"ativa", "distratada"},
    "tipo_parcela": {"sinal", "mensal", "balao", "chaves"},
}
