"""Fatos reais da ADR e parâmetros da simulação.

Real (site https://adrempreendimentos.com, conferido em 2026-10-13): nome, bairro, cidade, status,
entrega, faixa de área e as 102 unidades do Mares Bessa. Todo o resto é parâmetro inventado para a
simulação e está marcado como tal.
"""

from datetime import date

EMPREENDIMENTOS = [
    {
        "id": 1, "nome": "Mares Cabo Branco", "slug": "mares-cabo-branco", "sigla": "MCB",
        "bairro": "Cabo Branco", "cidade": "João Pessoa", "status": "entregue",
        "previsao_entrega": date(2025, 8, 1), "entrega_texto": "ago/2025", "area_min": 16.43, "area_max": 39.15,
        # simulado
        "data_lancamento": date(2023, 2, 1), "unidades": 60, "preco_m2_base": 14_200, "chance_venda_mes": 0.09,
        "inicio_captacao": None, "leads_por_mes": 0,
    },
    {
        "id": 2, "nome": "Mares Seaside", "slug": "mares-seaside", "sigla": "MSS",
        "bairro": "Bessa", "cidade": "João Pessoa", "status": "em_obras",
        "previsao_entrega": date(2028, 1, 1), "entrega_texto": "jan/2028", "area_min": 18.20, "area_max": 27.55,
        "data_lancamento": date(2024, 3, 1), "unidades": 132, "preco_m2_base": 14_600, "chance_venda_mes": 0.07,
        "inicio_captacao": None, "leads_por_mes": 0,
    },
    {
        "id": 3, "nome": "Mares Seaview", "slug": "mares-seaview", "sigla": "MSV",
        "bairro": "Jardim Oceania", "cidade": "João Pessoa", "status": "em_obras",
        "previsao_entrega": date(2028, 3, 1), "entrega_texto": "mar/2028", "area_min": 18.50, "area_max": 21.81,
        "data_lancamento": date(2024, 9, 1), "unidades": 96, "preco_m2_base": 15_500, "chance_venda_mes": 0.07,
        "inicio_captacao": None, "leads_por_mes": 0,
    },
    {
        "id": 4, "nome": "Mares Bessa", "slug": "mares-bessa", "sigla": "MBE",
        "bairro": "Bessa", "cidade": "João Pessoa", "status": "em_obras",
        "previsao_entrega": date(2029, 2, 1), "entrega_texto": "fev/2029", "area_min": 18.03, "area_max": 33.04,
        "data_lancamento": date(2025, 8, 1), "unidades": 102, "preco_m2_base": 14_900, "chance_venda_mes": 0.08,
        "inicio_captacao": None, "leads_por_mes": 0,
    },
    {
        "id": 5, "nome": "Mares Sense", "slug": "mares-sense", "sigla": "MSE",
        "bairro": "Cabo Branco", "cidade": "João Pessoa", "status": "pre_lancamento",
        "previsao_entrega": None, "entrega_texto": None, "area_min": 18.50, "area_max": 21.81,
        "data_lancamento": None, "unidades": 0, "preco_m2_base": None, "chance_venda_mes": 0,
        "inicio_captacao": date(2026, 5, 1), "leads_por_mes": 50,
    },
    {
        # o site diz só "Entrega 2029": a data fica nula para não inventar o mês (D2.9)
        "id": 6, "nome": "Mares Blanc", "slug": "mares-blanc", "sigla": "MBL",
        "bairro": "Intermares", "cidade": "Cabedelo", "status": "pre_lancamento",
        "previsao_entrega": None, "entrega_texto": "2029", "area_min": 19.00, "area_max": 118.00,
        "data_lancamento": None, "unidades": 0, "preco_m2_base": None, "chance_venda_mes": 0,
        "inicio_captacao": date(2026, 3, 1), "leads_por_mes": 60,
    },
    {
        "id": 7, "nome": "Nexus One", "slug": "nexus-one", "sigla": "NX1",
        "bairro": None, "cidade": None, "status": "pre_lancamento",
        "previsao_entrega": None, "entrega_texto": None, "area_min": None, "area_max": None,
        "data_lancamento": None, "unidades": 0, "preco_m2_base": None, "chance_venda_mes": 0,
        "inicio_captacao": date(2026, 6, 1), "leads_por_mes": 40,
    },
]

# --- Unidades e preço (simulado) ---
UNIDADES_POR_ANDAR = 12
POSICOES_VISTA_MAR = 4  # as posições 1 a 4 de cada andar dão para o mar
REAJUSTE_MENSAL = 0.006  # reajuste da tabela por mês desde o lançamento
PREMIO_VISTA_MAR = 0.12
PREMIO_POR_ANDAR = 0.008
PREMIO_DUPLEX_GARDEN = 0.05

# --- Vendas (simulado) ---
BOOST_LANCAMENTO = 2.5  # a chance de venda é 2,5 vezes maior nos primeiros meses
MESES_DE_LANCAMENTO = 3
BOOST_VISTA_MAR = 1.8  # vista mar vende mais rápido
PESO_VENDA_DIRETA = 0.07  # parte das vendas feitas pela própria ADR
EXPOENTE_CORRETORES = 0.9  # peso de cada corretor = 1 / posição^expoente: concentra as vendas
FAIXAS_DESCONTO = [((0.0, 3.0), 0.60), ((3.0, 7.0), 0.30), ((8.0, 12.0), 0.10)]
CHANCE_INVESTIDOR = 0.70
RISCO = {"bom": 0.72, "medio": 0.20, "ruim": 0.08}
RISCO_SEASIDE = {"bom": 0.55, "medio": 0.23, "ruim": 0.22}  # padrão plantado: inadimplência concentrada
ID_SEASIDE = 2
DESCONTO_ALTO = 8.0  # desconto a partir do qual o risco piora (padrão plantado)
PIORA_DESCONTO_ALTO = 0.15  # pontos que saem de "bom" e vão para "ruim"

# --- Plano de pagamento e cobrança (simulado) ---
PLANO = {"sinal": 0.10, "mensal": 0.20, "balao": 0.10, "chaves": 0.60}
CHANCE_PAGAMENTO_PARCIAL = 0.08
CHANCE_DISTRATO_APOS_60_DIAS = {"bom": 0.10, "medio": 0.30, "ruim": 0.60}
CHANCE_DESISTENCIA = 0.005  # distrato sem atraso antes

# --- Funil (simulado) ---
TAXA_VISITA = 0.12
TAXA_PROPOSTA = 0.35
TAXA_VENDA = 0.45
# canal: (peso no volume de leads, multiplicador de conversão por etapa)
CANAIS = {
    "instagram": (0.38, 0.70),
    "site": (0.18, 1.00),
    "whatsapp": (0.16, 1.10),
    "tiktok": (0.12, 0.60),
    "imobiliaria": (0.08, 1.70),
    "indicacao": (0.04, 2.00),
    "evento": (0.04, 1.30),
}
CHANCE_LEAD_SEM_CORRETOR = 0.25  # no topo do funil
CHANCE_SEM_EMAIL = 0.10
MOTIVOS_PERDA = [
    "preço acima do orçamento",
    "sem retorno",
    "comprou outro imóvel",
    "condição de pagamento",
    "localização",
    "só pesquisando",
]

# --- Pessoas (simulado) ---
# cidade, UF, DDD, peso
CIDADES = [
    ("João Pessoa", "PB", "83", 0.52),
    ("Cabedelo", "PB", "83", 0.05),
    ("Campina Grande", "PB", "83", 0.08),
    ("Recife", "PE", "81", 0.10),
    ("Natal", "RN", "84", 0.06),
    ("Fortaleza", "CE", "85", 0.04),
    ("São Paulo", "SP", "11", 0.07),
    ("Brasília", "DF", "61", 0.04),
    ("Rio de Janeiro", "RJ", "21", 0.04),
]
DOMINIOS_EMAIL = [
    ("gmail.com", 0.50),
    ("hotmail.com", 0.20),
    ("outlook.com", 0.15),
    ("yahoo.com.br", 0.10),
    ("uol.com.br", 0.05),
]

# Nomes inventados
IMOBILIARIAS = [
    ("Litoral Norte Imóveis", "João Pessoa"),
    ("Maré Alta Consultoria Imobiliária", "João Pessoa"),
    ("Ponta do Seixas Imóveis", "João Pessoa"),
    ("Altiplano Negócios Imobiliários", "João Pessoa"),
    ("Farol do Cabo Imóveis", "João Pessoa"),
    ("Brisa Mar Corretora", "Cabedelo"),
    ("Capital Nordeste Imóveis", "Recife"),
    ("Horizonte Azul Investimentos Imobiliários", "João Pessoa"),
]
CORRETORES_POR_IMOBILIARIA = [4, 4, 4, 4, 3, 3, 3, 3]
CORRETORES_AUTONOMOS = 7
# par plantado para o casamento ambíguo do R2 ("J. Silva")
CORRETORES_AMBIGUOS = ["João Silva", "José Silva"]
