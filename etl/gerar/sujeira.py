"""A sujeira: a verdade exportada no formato de cada sistema, com as 7 regras de sujeira e o gabarito.

Cada linha suja recebe uma regra só (D2.5), para o gabarito dizer exatamente o que a etapa 3 tem de
tratar. As vítimas de cada regra saem de um conjunto de linhas livres, que vai encolhendo.
Exceções, por valerem para o arquivo inteiro: telefone em formato livre (CRM) e valor em texto (ERP).
"""

from datetime import date, datetime, time, timedelta

import numpy as np
import pandas as pd

from etl.config import DATA_CORTE
from etl.gerar import catalogo as cat
from etl.gerar import formatos as fmt
from etl.gerar.parceiros import VENDA_DIRETA, abreviar

CRM = "crm_leads.csv"
ESPELHO = "comercial_espelho.xlsx"
PARCEIROS = "comercial_parceiros.xlsx"
ERP_PARCELAS = "erp_parcelas.csv"
ERP_BAIXAS = "erp_baixas.csv"
METAS = "diretoria_metas.xlsx"

# Coluna de id de cada bruto (arquivo, aba), para achar a linha de um caso do gabarito
COLUNA_ID = {
    (CRM, None): "ID",
    (ESPELHO, "Empreendimentos"): "Código",
    (ESPELHO, "Unidades"): "ID",
    (ESPELHO, "Vendas"): "Contrato",
    (ERP_PARCELAS, None): "cod_parcela",
    (ERP_BAIXAS, None): "cod_baixa",
}

# Proporções e quantidades de cada regra
FRACAO_DUPLICADOS = 0.04
FRACAO_TRABALHO_NA_DUPLICATA = 0.40
FRACAO_DUPLICATA_POR_EMAIL = 0.30
FRACAO_CORRETOR_ABREVIADO_CRM = 0.015
AMBIGUOS_NO_CRM = 3
VENDAS_COM_CORRETOR_SUJO = 8
FRACAO_SINONIMO_CANAL = 0.15
FRACAO_CANAL_DESCONHECIDO = 0.004
FRACAO_DATA_ALTERNATIVA = 0.05
FRACAO_EMAIL_INVALIDO = 0.02
PARCELAS_EM_2099 = 4
VENDAS_ANTES_DO_LEAD = 2
VENDAS_COM_ZERO_A_MAIS = 3
VENDAS_COM_DIGITO_A_MENOS = 1
PAGAMENTOS_ORFAOS = 6
DESLOCAMENTO_PARCELA_INEXISTENTE = 900_000

BAIRROS_SUJOS = {1: "C. Branco", 3: "Jd. Oceania", 5: "CABO BRANCO "}
SINONIMOS_CANAL = {
    "instagram": ["insta", "IG", "Instagram Ads", "instagram"],
    "site": ["Formulário site", "site", "Site ADR"],
    "whatsapp": ["Zap", "whats", "WhatsApp Business"],
    "tiktok": ["tik tok", "TIKTOK"],
    "imobiliaria": ["imobiliaria", "Parceiro imobiliária"],
    "indicacao": ["indicacao", "Indicação de cliente"],
    "evento": ["Stand", "evento"],
}
CANAIS_DESCONHECIDOS = ["Panfleto", "outdoor", "?", "rádio"]


def _vazio(valor) -> bool:
    return valor is None or (not isinstance(valor, str) and pd.isna(valor))


def _texto(valor):
    return None if _vazio(valor) else valor


def _sortear(rng, livres: set, quantos: int, candidatos=None) -> list[int]:
    """Sorteia vítimas entre as linhas livres e as tira do conjunto (D2.5)."""
    universo = livres if candidatos is None else livres & set(candidatos)
    escolhidos = rng.choice(sorted(universo), size=quantos, replace=False)
    escolhidos = sorted(int(x) for x in escolhidos)
    livres.difference_update(escolhidos)
    return escolhidos


def _caso(arquivo, aba, id_, campo, sujo, verdade, desfecho, **extra) -> dict:
    return {"arquivo": arquivo, "aba": aba, "id": int(id_), "campo": campo,
            "sujo": sujo, "verdade": verdade, "desfecho": desfecho, **extra}


def _um_ano_antes(dia: date) -> date:
    try:
        return dia.replace(year=dia.year - 1)
    except ValueError:  # 29 de fevereiro
        return dia.replace(year=dia.year - 1, day=28)


class _Sujeira:
    def __init__(self, tabelas: dict[str, pd.DataFrame], semente: int):
        self.t = tabelas
        self.rng = np.random.default_rng(semente + 1)
        self.casos = {f"R{n}": [] for n in range(1, 8)}
        self.quarentena = {"lead": set(), "cliente": set(), "venda": set(), "parcela": set(), "pagamento": set()}
        self.emp_nome = tabelas["empreendimento"].set_index("id")["nome"]
        self.corretor_nome = tabelas["corretor"].set_index("id")["nome"]

    # ---------- CRM ----------

    def montar_crm(self) -> None:
        self.crm = {}
        for l in self.t["lead"].itertuples(index=False):
            self.crm[l.id] = {
                "ID": l.id,
                "Nome": l.nome,
                "Telefone": fmt.telefone_livre(l.telefone, self.rng),
                "E-mail": _texto(l.email),
                "Cidade": l.cidade,
                "Canal": fmt.ROTULO_CANAL[l.canal],
                "Empreendimento": self.emp_nome[l.empreendimento_id],
                "Corretor": None if _vazio(l.corretor_id) else self.corretor_nome[l.corretor_id],
                "Data de entrada": fmt.data_crm(l.data_entrada),
                "Data da visita": None if _vazio(l.data_visita) else fmt.data_curta(l.data_visita),
                "Data da proposta": None if _vazio(l.data_proposta) else fmt.data_curta(l.data_proposta),
                "Etapa": fmt.ROTULO_ETAPA[l.etapa],
                "Motivo da perda": _texto(l.motivo_perda),
            }
        self.leads_livres = set(self.crm)

    def r1_duplicatas(self) -> None:
        lead = self.t["lead"].set_index("id")
        telefones = set(lead["telefone"])
        vitimas = _sortear(self.rng, self.leads_livres, round(FRACAO_DUPLICADOS * len(lead)))
        proximo_id = int(lead.index.max()) + 1
        for lead_id in vitimas:
            original = lead.loc[lead_id]
            linha = self.crm[lead_id]
            trabalho = not _vazio(original["data_visita"]) and self.rng.random() < FRACAO_TRABALHO_NA_DUPLICATA
            entrada = original["data_entrada"].to_pydatetime()

            if trabalho:
                # a pessoa entrou de novo antes da visita, e o corretor atendeu a duplicata
                limite = datetime.combine(original["data_visita"].date(), time(23, 59))
                minutos = max(10, int((limite - entrada).total_seconds() // 60))
                entrada_dup = entrada + timedelta(minutes=int(self.rng.integers(10, minutos + 1)))
            else:
                entrada_dup = entrada + timedelta(days=int(self.rng.integers(1, 61)), minutes=int(self.rng.integers(0, 600)))
                entrada_dup = min(entrada_dup, datetime.combine(DATA_CORTE, time(23, 59)))
                if entrada_dup <= entrada:
                    entrada_dup = entrada + timedelta(minutes=1)

            por_email = not _vazio(original["email"]) and self.rng.random() < FRACAO_DUPLICATA_POR_EMAIL
            if por_email:
                telefone_novo = None
                while telefone_novo is None or telefone_novo in telefones:
                    telefone_novo = f"{original['telefone'][:5]}9{int(self.rng.integers(0, 10**8)):08d}"
                telefones.add(telefone_novo)
                telefone, email = fmt.telefone_livre(telefone_novo, self.rng), original["email"].title()
            else:
                telefone = linha["Telefone"]
                while telefone == linha["Telefone"]:
                    telefone = fmt.telefone_livre(original["telefone"], self.rng)
                email = None

            canais = list(cat.CANAIS)
            duplicata = {
                "ID": proximo_id, "Nome": original["nome"], "Telefone": telefone, "E-mail": email,
                "Cidade": original["cidade"], "Canal": fmt.ROTULO_CANAL[canais[int(self.rng.integers(len(canais)))]],
                "Empreendimento": linha["Empreendimento"], "Data de entrada": fmt.data_crm(pd.Timestamp(entrada_dup)),
            }
            if trabalho:
                # a duplicata fica com o andamento; a linha original parece abandonada
                for campo in ("Corretor", "Data da visita", "Data da proposta", "Etapa", "Motivo da perda"):
                    duplicata[campo] = linha[campo]
                linha.update({"Corretor": None, "Data da visita": None, "Data da proposta": None,
                              "Etapa": "Perdido", "Motivo da perda": "sem retorno"})
            else:
                recente = entrada_dup.date() >= DATA_CORTE - timedelta(days=30)
                duplicata.update({"Corretor": None, "Data da visita": None, "Data da proposta": None,
                                  "Etapa": "Novo" if recente else "Perdido",
                                  "Motivo da perda": None if recente else "sem retorno"})
            self.crm[proximo_id] = duplicata
            self.casos["R1"].append(_caso(CRM, None, proximo_id, None, None, None, "mesclado",
                                          mantido=lead_id, trabalho_na_duplicata=bool(trabalho),
                                          casou_por="email" if por_email else "telefone"))
            proximo_id += 1

    def _variante_de_caixa(self, nome: str) -> str:
        opcoes = [nome.upper(), nome.lower(), nome + " ", nome.replace(" ", "  ", 1)]
        return opcoes[int(self.rng.integers(len(opcoes)))]

    def r2_corretor_no_crm(self) -> None:
        lead = self.t["lead"]
        nao_convertidos = lead[(lead["etapa"] != "venda") & lead["corretor_id"].notna() & (lead["corretor_id"] != 1)]
        ambiguos = nao_convertidos.loc[nao_convertidos["corretor_id"].isin([2, 3]), "id"]
        outros = nao_convertidos.loc[~nao_convertidos["corretor_id"].isin([2, 3]), "id"]
        corretor_de = lead.set_index("id")["corretor_id"]

        for lead_id in _sortear(self.rng, self.leads_livres, AMBIGUOS_NO_CRM, ambiguos):
            nome = self.corretor_nome[corretor_de[lead_id]]
            self.crm[lead_id]["Corretor"] = abreviar(nome)
            self.casos["R2"].append(_caso(CRM, None, lead_id, "Corretor", abreviar(nome), nome, "quarentena",
                                          motivo="nome de corretor ambíguo"))
            self.quarentena["lead"].add(lead_id)

        quantos = round(FRACAO_CORRETOR_ABREVIADO_CRM * len(lead)) - AMBIGUOS_NO_CRM
        for lead_id in _sortear(self.rng, self.leads_livres, quantos, outros):
            corretor_id = int(corretor_de[lead_id])
            nome = self.corretor_nome[corretor_id]
            sujo = abreviar(nome) if self.rng.random() < 0.5 else self._variante_de_caixa(nome)
            self.crm[lead_id]["Corretor"] = sujo
            self.casos["R2"].append(_caso(CRM, None, lead_id, "Corretor", sujo, nome, "corrigido", corretor_id=corretor_id))

    def r3_canais(self) -> None:
        canal_de = self.t["lead"].set_index("id")["canal"]
        n = len(canal_de)
        for lead_id in _sortear(self.rng, self.leads_livres, round(FRACAO_SINONIMO_CANAL * n)):
            opcoes = SINONIMOS_CANAL[canal_de[lead_id]]
            sujo = opcoes[int(self.rng.integers(len(opcoes)))]
            self.crm[lead_id]["Canal"] = sujo
            self.casos["R3"].append(_caso(CRM, None, lead_id, "Canal", sujo, canal_de[lead_id], "corrigido"))
        for lead_id in _sortear(self.rng, self.leads_livres, round(FRACAO_CANAL_DESCONHECIDO * n)):
            sujo = CANAIS_DESCONHECIDOS[int(self.rng.integers(len(CANAIS_DESCONHECIDOS)))]
            self.crm[lead_id]["Canal"] = sujo
            self.casos["R3"].append(_caso(CRM, None, lead_id, "Canal", sujo, "outro", "outro", original=canal_de[lead_id]))

    def r4_data_alternativa(self) -> None:
        entrada_de = self.t["lead"].set_index("id")["data_entrada"]
        for lead_id in _sortear(self.rng, self.leads_livres, round(FRACAO_DATA_ALTERNATIVA * len(entrada_de))):
            momento = entrada_de[lead_id]
            sujo = fmt.data_crm_alternativa(momento)
            self.crm[lead_id]["Data de entrada"] = sujo
            self.casos["R4"].append(_caso(CRM, None, lead_id, "Data de entrada", sujo,
                                          momento.strftime("%Y-%m-%d %H:%M:%S"), "corrigido"))

    def r6_email_invalido(self) -> None:
        email_de = self.t["lead"].set_index("id")["email"].dropna()
        for lead_id in _sortear(self.rng, self.leads_livres, round(FRACAO_EMAIL_INVALIDO * len(email_de)), email_de.index):
            email = email_de[lead_id]
            local, dominio = email.split("@")
            opcoes = [f"{local}@{dominio.split('.')[0]}", f"{local} @{dominio}", f"{local}@@{dominio}"]
            sujo = opcoes[int(self.rng.integers(len(opcoes)))]
            self.crm[lead_id]["E-mail"] = sujo
            self.casos["R6"].append(_caso(CRM, None, lead_id, "E-mail", sujo, None, "nulo", original=email))

    # ---------- Planilha do comercial ----------

    def montar_espelho(self) -> None:
        emp, u, c = self.t["empreendimento"], self.t["unidade"], self.t["cliente"].set_index("id")
        self.aba_empreendimentos = pd.DataFrame({
            "Código": emp["id"], "Empreendimento": emp["nome"], "Bairro": emp["bairro"], "Cidade": emp["cidade"],
            "Status": emp["status"].map(fmt.ROTULO_STATUS_EMPREENDIMENTO),
            "Lançamento": emp["data_lancamento"], "Previsão de entrega": emp["previsao_entrega"],
        })
        self.aba_unidades = pd.DataFrame({
            "ID": u["id"], "Código": u["codigo"], "Empreendimento": u["empreendimento_id"].map(self.emp_nome),
            "Andar": u["andar"], "Tipologia": u["tipologia"].map(fmt.ROTULO_TIPOLOGIA),
            "Área (m²)": u["area_privativa_m2"], "Vista mar": u["vista_mar"].map({True: "Sim", False: "Não"}),
            "Preço de tabela": u["preco_tabela"],
        })
        v = self.t["venda"]
        cliente = c.loc[v["cliente_id"]]
        self.aba_vendas = pd.DataFrame({
            "Contrato": v["id"].to_numpy(),
            "Unidade": v["unidade_id"].map(u.set_index("id")["codigo"]).to_numpy(),
            "Cód. cliente": v["cliente_id"].to_numpy(),
            "Cód. CRM": cliente["lead_id"].to_numpy(),
            "Cliente": cliente["nome"].to_numpy(),
            "Cidade": cliente["cidade"].to_numpy(),
            "UF": cliente["uf"].to_numpy(),
            "Perfil": cliente["perfil"].map(fmt.ROTULO_PERFIL).to_numpy(),
            "Corretor": v["corretor_id"].map(self.corretor_nome).to_numpy(),
            "Data da venda": v["data_venda"].to_numpy(),
            "Valor da venda": v["valor_venda"].to_numpy(),
            "Desconto (%)": v["desconto_pct"].to_numpy(),
            "Status": v["status"].map(fmt.ROTULO_STATUS_VENDA).to_numpy(),
            "Data do distrato": v["data_distrato"].to_numpy(),
        }).set_index("Contrato", drop=False)
        self.vendas_livres = set(int(i) for i in v["id"])

    def r2_bairros(self) -> None:
        aba = self.aba_empreendimentos.set_index("Código", drop=False)
        for emp_id, sujo in BAIRROS_SUJOS.items():
            verdade = aba.loc[emp_id, "Bairro"]
            aba.loc[emp_id, "Bairro"] = sujo
            self.casos["R2"].append(_caso(ESPELHO, "Empreendimentos", emp_id, "Bairro", sujo, verdade, "corrigido"))
        self.aba_empreendimentos = aba.reset_index(drop=True)

    def r6_venda_direta(self) -> None:
        v = self.t["venda"]
        diretas = sorted(int(i) for i in v.loc[v["corretor_id"] == 1, "id"])
        self.vendas_livres.difference_update(diretas)
        for venda_id in diretas:
            self.aba_vendas.loc[venda_id, "Corretor"] = None
            self.casos["R6"].append(_caso(ESPELHO, "Vendas", venda_id, "Corretor", None, VENDA_DIRETA, "corrigido"))

    def _cascata_da_venda(self, venda_id: int) -> dict:
        p, pg = self.t["parcela"], self.t["pagamento"]
        parcelas = sorted(int(i) for i in p.loc[p["venda_id"] == venda_id, "id"])
        pagamentos = sorted(int(i) for i in pg.loc[pg["parcela_id"].isin(parcelas), "id"])
        cliente_id = int(self.t["venda"].set_index("id").loc[venda_id, "cliente_id"])
        self.quarentena["venda"].add(venda_id)
        self.quarentena["cliente"].add(cliente_id)
        self.quarentena["parcela"].update(parcelas)
        self.quarentena["pagamento"].update(pagamentos)
        return {"cliente": cliente_id, "parcelas": parcelas, "pagamentos": pagamentos}

    def r4_venda_antes_do_lead(self) -> None:
        v = self.t["venda"].set_index("id")
        entrada = self.t["lead"].set_index("id")["data_entrada"]
        lead_do_cliente = self.t["cliente"].set_index("id")["lead_id"]
        candidatas = [
            int(i) for i, venda in v.iterrows()
            if venda["status"] == "ativa"
            and _um_ano_antes(venda["data_venda"].date()) < entrada[lead_do_cliente[venda["cliente_id"]]].date()
        ]
        for venda_id in _sortear(self.rng, self.vendas_livres, VENDAS_ANTES_DO_LEAD, candidatas):
            verdade = v.loc[venda_id, "data_venda"]
            sujo = pd.Timestamp(_um_ano_antes(verdade.date()))
            self.aba_vendas.loc[venda_id, "Data da venda"] = sujo
            self.casos["R4"].append(_caso(ESPELHO, "Vendas", venda_id, "Data da venda", fmt.data_iso(sujo),
                                          fmt.data_iso(verdade), "quarentena",
                                          motivo="venda antes da entrada do lead", **self._cascata_da_venda(venda_id)))

    def r5_valores(self) -> None:
        v = self.t["venda"].set_index("id")
        ativas = v.index[v["status"] == "ativa"]
        for venda_id in _sortear(self.rng, self.vendas_livres, VENDAS_COM_ZERO_A_MAIS, ativas):
            verdade = float(v.loc[venda_id, "valor_venda"])
            sujo = round(verdade * 10, 2)
            self.aba_vendas.loc[venda_id, "Valor da venda"] = sujo
            self.casos["R5"].append(_caso(ESPELHO, "Vendas", venda_id, "Valor da venda", sujo, verdade, "corrigido"))
        for venda_id in _sortear(self.rng, self.vendas_livres, VENDAS_COM_DIGITO_A_MENOS, ativas):
            verdade = float(v.loc[venda_id, "valor_venda"])
            sujo = round(verdade / 10, 2)
            self.aba_vendas.loc[venda_id, "Valor da venda"] = sujo
            self.casos["R5"].append(_caso(ESPELHO, "Vendas", venda_id, "Valor da venda", sujo, verdade, "quarentena",
                                          motivo="preço/m² fora da faixa e ÷ 10 não resolve",
                                          **self._cascata_da_venda(venda_id)))

    def r2_corretor_nas_vendas(self) -> None:
        v = self.t["venda"].set_index("id")
        candidatas = v.index[~v["corretor_id"].isin([1, 2, 3])]
        for venda_id in _sortear(self.rng, self.vendas_livres, VENDAS_COM_CORRETOR_SUJO, candidatas):
            corretor_id = int(v.loc[venda_id, "corretor_id"])
            nome = self.corretor_nome[corretor_id]
            sujo = abreviar(nome) if self.rng.random() < 0.5 else self._variante_de_caixa(nome)
            self.aba_vendas.loc[venda_id, "Corretor"] = sujo
            self.casos["R2"].append(_caso(ESPELHO, "Vendas", venda_id, "Corretor", sujo, nome, "corrigido",
                                          corretor_id=corretor_id))

    # ---------- ERP ----------

    def montar_erp(self) -> None:
        p, pg = self.t["parcela"], self.t["pagamento"]
        self.erp_parcelas = pd.DataFrame({
            "cod_parcela": p["id"], "cod_contrato": p["venda_id"], "num_parcela": p["numero"],
            "tipo": p["tipo"].map(fmt.ROTULO_TIPO_PARCELA), "vencimento": p["vencimento"].map(fmt.data_iso),
            "valor": p["valor"].map(fmt.moeda),
        }).set_index("cod_parcela", drop=False)
        self.erp_baixas = pd.DataFrame({
            "cod_baixa": pg["id"], "cod_parcela": pg["parcela_id"],
            "data_pagamento": pg["data_pagamento"].map(fmt.data_iso), "valor_pago": pg["valor_pago"].map(fmt.moeda),
        }).set_index("cod_baixa", drop=False)

    def r4_vencimento_2099(self) -> None:
        p = self.t["parcela"]
        venda = self.t["venda"].set_index("id")
        futuras = p[(p["vencimento"] > pd.Timestamp(DATA_CORTE))
                    & p["venda_id"].map(venda["status"]).eq("ativa")
                    & ~p["venda_id"].isin(self.quarentena["venda"])]
        livres = set(int(i) for i in futuras["id"])
        for parcela_id in _sortear(self.rng, livres, PARCELAS_EM_2099):
            verdade = p.set_index("id").loc[parcela_id, "vencimento"]
            sujo = f"2099-{verdade.month:02d}-{verdade.day:02d}"
            self.erp_parcelas.loc[parcela_id, "vencimento"] = sujo
            self.quarentena["parcela"].add(parcela_id)
            self.casos["R4"].append(_caso(ERP_PARCELAS, None, parcela_id, "vencimento", sujo, fmt.data_iso(verdade),
                                          "quarentena", motivo="vencimento impossível", pagamentos=[]))

    def r7_pagamentos_orfaos(self) -> None:
        pg = self.t["pagamento"]
        candidatos = pg.loc[~pg["parcela_id"].isin(self.quarentena["parcela"]), "id"]
        livres = set(int(i) for i in candidatos)
        for pagamento_id in _sortear(self.rng, livres, PAGAMENTOS_ORFAOS):
            verdade = int(pg.set_index("id").loc[pagamento_id, "parcela_id"])
            sujo = verdade + DESLOCAMENTO_PARCELA_INEXISTENTE
            self.erp_baixas.loc[pagamento_id, "cod_parcela"] = sujo
            self.quarentena["pagamento"].add(pagamento_id)
            self.casos["R7"].append(_caso(ERP_BAIXAS, None, pagamento_id, "cod_parcela", sujo, verdade, "quarentena",
                                          motivo="parcela inexistente"))

    # ---------- Parceiros e metas (sem sujeira) ----------

    def parceiros(self) -> dict[str, pd.DataFrame]:
        imob, cor = self.t["imobiliaria"], self.t["corretor"]
        return {
            "Imobiliárias": pd.DataFrame({"Código": imob["id"], "Imobiliária": imob["nome"], "Cidade": imob["cidade"]}),
            "Corretores": pd.DataFrame({
                "Código": cor["id"], "Corretor": cor["nome"], "CRECI": cor["creci"],
                "Imobiliária": cor["imobiliaria_id"].map(imob.set_index("id")["nome"]), "Início": cor["data_inicio"],
            }),
        }

    def metas(self) -> dict[str, pd.DataFrame]:
        """Formato largo, como a diretoria monta a planilha: um empreendimento por linha, um mês por coluna."""
        m = self.t["meta_mensal"].sort_values(["mes", "empreendimento_id"])
        largo = m.pivot(index="empreendimento_id", columns="mes", values="meta_unidades")
        largo.columns = [fmt.mes_curto(c) for c in largo.columns]
        largo.insert(0, "Empreendimento", largo.index.map(self.emp_nome))
        return {"Metas": largo.reset_index(drop=True).astype({c: "Int64" for c in largo.columns[1:]})}

    # ---------- Montagem ----------

    def brutos(self) -> dict:
        crm = pd.DataFrame([self.crm[i] for i in sorted(self.crm)])
        return {
            CRM: crm,
            ESPELHO: {
                "Empreendimentos": self.aba_empreendimentos,
                "Unidades": self.aba_unidades,
                "Vendas": self.aba_vendas.reset_index(drop=True),
            },
            PARCEIROS: self.parceiros(),
            ERP_PARCELAS: self.erp_parcelas.reset_index(drop=True),
            ERP_BAIXAS: self.erp_baixas.reset_index(drop=True),
            METAS: self.metas(),
        }

    def gabarito(self, semente: int) -> dict:
        descricoes = {
            "R1": (CRM, "Leads duplicados, com telefone em outro formato ou o mesmo e-mail"),
            "R2": (f"{CRM}, {ESPELHO}", "Bairro e nome de corretor despadronizados"),
            "R3": (CRM, "Canal em texto livre"),
            "R4": (f"{CRM}, {ESPELHO}, {ERP_PARCELAS}", "Datas em outro formato e datas impossíveis"),
            "R5": (ESPELHO, "Valor da venda com um zero a mais ou um dígito a menos"),
            "R6": (f"{ESPELHO}, {CRM}", "Venda sem corretor e e-mail inválido"),
            "R7": (ERP_BAIXAS, "Pagamento ligado a parcela inexistente"),
        }
        return {
            "semente": semente,
            "data_corte": DATA_CORTE.isoformat(),
            "formatos": {
                CRM: {"sistema": "CRM", "codificacao": "utf-8-sig", "separador": ";",
                      "datas": "dd/mm/aaaa hh:mm na entrada; dd/mm/aaaa na visita e na proposta",
                      "observacao": "telefone e canal em texto livre"},
                ESPELHO: {"sistema": "Planilha do comercial", "abas": ["Empreendimentos", "Unidades", "Vendas"]},
                PARCEIROS: {"sistema": "Planilha do comercial", "abas": ["Imobiliárias", "Corretores"]},
                ERP_PARCELAS: {"sistema": "ERP financeiro", "codificacao": "latin-1", "separador": ";",
                               "datas": "aaaa-mm-dd", "valores": "texto, R$ 1.234,56"},
                ERP_BAIXAS: {"sistema": "ERP financeiro", "codificacao": "latin-1", "separador": ";",
                             "datas": "aaaa-mm-dd", "valores": "texto, R$ 1.234,56"},
                METAS: {"sistema": "Diretoria", "abas": ["Metas"], "formato": "largo: uma coluna por mês (fev/2023)"},
            },
            "regras": {
                regra: {"origem": origem, "descricao": descricao,
                        "linhas_sujadas": len(self.casos[regra]), "casos": self.casos[regra]}
                for regra, (origem, descricao) in descricoes.items()
            },
            "quarentena_esperada": {tabela: sorted(ids) for tabela, ids in self.quarentena.items()},
        }


def sujar(tabelas: dict[str, pd.DataFrame], semente: int) -> tuple[dict, dict]:
    s = _Sujeira(tabelas, semente)
    s.montar_crm()
    s.r1_duplicatas()
    s.r2_corretor_no_crm()
    s.r3_canais()
    s.r4_data_alternativa()
    s.r6_email_invalido()

    s.montar_espelho()
    s.r2_bairros()
    s.r6_venda_direta()
    s.r4_venda_antes_do_lead()
    s.r5_valores()
    s.r2_corretor_nas_vendas()

    s.montar_erp()
    s.r4_vencimento_2099()
    s.r7_pagamentos_orfaos()
    return s.brutos(), s.gabarito(semente)
