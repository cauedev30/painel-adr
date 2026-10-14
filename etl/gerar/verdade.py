"""A verdade: as 10 tabelas do schema adr, limpas e coerentes, geradas a partir de uma semente.

Ela nunca vai para o disco. A sujeira (sujeira.py) parte dela, e os testes a recriam pela semente
para conferir se o pipeline recuperou o que foi sujado.
"""

import numpy as np
import pandas as pd
from faker import Faker

from etl import modelo
from etl.gerar import catalogo as cat
from etl.gerar import leads, metas, parceiros, unidades, vendas


def _empreendimentos() -> pd.DataFrame:
    tabela = pd.DataFrame(cat.EMPREENDIMENTOS)[modelo.COLUNAS["empreendimento"]]
    for coluna in ("data_lancamento", "previsao_entrega"):
        tabela[coluna] = pd.to_datetime(tabela[coluna])
    return tabela


def gerar(semente: int) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(semente)
    fake = Faker("pt_BR")
    fake.seed_instance(semente)

    tabela_unidades = unidades.gerar_unidades(rng)
    corretores = parceiros.gerar_corretores(rng, fake)
    simulado = vendas.simular_vendas(tabela_unidades, corretores, rng)
    lead, cliente = leads.gerar_leads(simulado["venda"], tabela_unidades, corretores, simulado["cliente_base"], fake, rng)

    tabelas = {
        "empreendimento": _empreendimentos(),
        "unidade": tabela_unidades,
        "imobiliaria": parceiros.gerar_imobiliarias(),
        "corretor": corretores,
        "lead": lead,
        "cliente": cliente,
        "venda": simulado["venda"],
        "parcela": simulado["parcela"],
        "pagamento": simulado["pagamento"],
        "meta_mensal": metas.gerar_metas(),
    }
    return {nome: tabelas[nome][modelo.COLUNAS[nome]] for nome in modelo.TABELAS_ADR}
