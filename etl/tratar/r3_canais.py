"""R3 · Canais: o canal de origem do lead é digitado à mão no CRM.

Um de-para de sinônimos (escrito olhando os textos que aparecem no CRM) leva cada texto a um dos 7
canais oficiais. O que ele não conhece vira `outro`, e a lista desses textos entra no relatório, para
o analista acrescentar ao dicionário.
"""

import pandas as pd

from etl.tratar.comum import Registro, Resultado, normalizar_texto

ORIGEM = "crm_leads.csv"
# como o CRM mostra cada canal oficial; esses não contam como sujeira
ROTULOS = {"Instagram": "instagram", "Site": "site", "WhatsApp": "whatsapp", "TikTok": "tiktok",
           "Imobiliária": "imobiliaria", "Indicação": "indicacao", "Evento": "evento"}
# texto normalizado → canal oficial
SINONIMOS = {
    **{normalizar_texto(rotulo): canal for rotulo, canal in ROTULOS.items()},
    "insta": "instagram", "ig": "instagram", "instagram ads": "instagram",
    "formulario site": "site", "site adr": "site",
    "zap": "whatsapp", "whats": "whatsapp", "whatsapp business": "whatsapp",
    "tik tok": "tiktok",
    "parceiro imobiliaria": "imobiliaria",
    "indicacao de cliente": "indicacao",
    "stand": "evento",
}


def canal(textos: pd.Series) -> pd.Series:
    """Texto do CRM → canal oficial; o que o dicionário não conhece vira 'outro'."""
    return textos.map(lambda t: "outro" if pd.isna(t) else SINONIMOS.get(normalizar_texto(t), "outro"))


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    lead = t["lead"].copy()
    original = lead["canal"]
    lead["canal"] = canal(original)
    t["lead"] = lead

    desconhecido = lead["canal"].eq("outro")
    sinonimo = ~desconhecido & ~original.isin(list(ROTULOS))
    textos = sorted(set(original[desconhecido].fillna("(vazio)")), key=normalizar_texto)
    return Resultado(t, [
        Registro("R3", ORIGEM, "Canal digitado à mão trocado pelo canal oficial",
                 int(sinonimo.sum()), "corrigido", lead.loc[sinonimo, "id"].tolist()),
        Registro("R3", ORIGEM, f"Canal que o dicionário não reconhece, classificado como outro: {', '.join(textos)}",
                 int(desconhecido.sum()), "outro", lead.loc[desconhecido, "id"].tolist()),
    ])
