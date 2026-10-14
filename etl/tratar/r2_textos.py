"""R2 · Textos: bairro e nome de corretor escritos de vários jeitos.

- Bairro: um de-para escrito à mão. O que ele não reconhece fica como está e aparece no relatório.
- Corretor (no lead e na venda): o nome casa com o cadastro em 3 tentativas, da mais segura para a
  menos segura (D3.3). Se nenhuma resolve, a linha inteira vai para a quarentena, com o motivo.
  Depois do R2, lead e venda têm `corretor_id`, como no banco.
"""

import difflib
import json
import re

import pandas as pd

from etl.tratar.comum import Registro, Resultado, normalizar_texto

# de-para do bairro: texto normalizado → nome oficial
DICIONARIO_BAIRROS = {
    "cabo branco": "Cabo Branco",
    "c. branco": "Cabo Branco",
    "jardim oceania": "Jardim Oceania",
    "jd. oceania": "Jardim Oceania",
    "bessa": "Bessa",
    "intermares": "Intermares",
}
PARECIDO_O_BASTANTE = 0.85
INICIAL_E_SOBRENOME = re.compile(r"(\w)\.? (\S+)")


def casar_corretor(texto: str, cadastro: pd.Series) -> tuple[int | None, list[str]]:
    """Nome escrito → id do cadastro (`cadastro`: id → nome oficial).

    Devolve (id, []) quando casa; (None, candidatos) quando é ambíguo; (None, []) quando nada casa.
    """
    normal = normalizar_texto(texto)
    oficiais = {i: normalizar_texto(n) for i, n in cadastro.items()}

    # 1. igual ao cadastro depois de padronizar caixa, acento e espaços
    iguais = [i for i, n in oficiais.items() if n == normal]
    if len(iguais) == 1:
        return iguais[0], []

    # 2. "inicial + sobrenome" (J. Silva): casa se só um corretor tem essa inicial e esse sobrenome
    abreviado = INICIAL_E_SOBRENOME.fullmatch(normal)
    if abreviado:
        inicial, sobrenome = abreviado.groups()
        candidatos = [i for i, n in oficiais.items() if n[0] == inicial and n.split()[-1] == sobrenome]
        if len(candidatos) == 1:
            return candidatos[0], []
        if len(candidatos) > 1:
            return None, sorted((cadastro[c] for c in candidatos), key=normalizar_texto)  # João antes de José

    # 3. parecido o bastante (erro de digitação): casa se só um nome passa da régua
    parecidos = [i for i, n in oficiais.items()
                 if difflib.SequenceMatcher(None, normal, n).ratio() >= PARECIDO_O_BASTANTE]
    if len(parecidos) == 1:
        return parecidos[0], []
    return None, []


def _bairros(empreendimento: pd.DataFrame) -> tuple[pd.DataFrame, list[Registro]]:
    emp = empreendimento.copy()
    corrigidos, desconhecidos = [], []
    for posicao, bairro in emp["bairro"].items():
        if pd.isna(bairro):
            continue
        oficial = DICIONARIO_BAIRROS.get(normalizar_texto(bairro))
        if oficial is None:
            desconhecidos.append(int(emp.at[posicao, "id"]))
        elif oficial != bairro:
            emp.at[posicao, "bairro"] = oficial
            corrigidos.append(int(emp.at[posicao, "id"]))
    registros = [Registro("R2", "comercial_espelho.xlsx", "Bairro padronizado pelo de-para",
                          len(corrigidos), "corrigido", corrigidos)]
    if desconhecidos:
        registros.append(Registro("R2", "comercial_espelho.xlsx", "Bairro que o de-para não reconhece",
                                  len(desconhecidos), "relatado", desconhecidos))
    return emp, registros


def _corretores(df: pd.DataFrame, cadastro: pd.Series, origem: str, tabela: str):
    """Troca `corretor_nome` por `corretor_id`; devolve (tabela, registros, quarentena)."""
    casados: dict[str, tuple[int | None, list[str]]] = {}
    ids, motivos = [], {}
    for posicao, nome in df["corretor_nome"].items():
        if pd.isna(nome):
            ids.append(None)
            continue
        if nome not in casados:
            casados[nome] = casar_corretor(nome, cadastro)
        corretor_id, candidatos = casados[nome]
        ids.append(corretor_id)
        if corretor_id is None:
            motivos[posicao] = (f"nome de corretor ambíguo: {nome} → {', '.join(candidatos)}" if candidatos
                                else f"nome de corretor que não está no cadastro: {nome}")

    saida = df.copy()
    saida.insert(saida.columns.get_loc("corretor_nome"), "corretor_id", pd.array(ids, dtype="Int64"))
    corrigidos = saida.loc[saida["corretor_id"].notna()
                           & saida["corretor_nome"].ne(saida["corretor_id"].map(cadastro)), "id"].tolist()

    quarentena = [{"origem": origem, "regra": "R2", "motivo": motivos[p],
                   "registro": json.loads(saida.loc[p].drop("corretor_id").to_json(date_format="iso"))}
                  for p in motivos]
    barrados = saida.loc[list(motivos), "id"].tolist()
    saida = saida.drop(index=list(motivos)).drop(columns="corretor_nome").reset_index(drop=True)

    registros = [Registro("R2", origem, f"Nome de corretor ({tabela}) casado com o cadastro",
                          len(corrigidos), "corrigido", corrigidos)]
    if barrados:
        registros.append(Registro("R2", origem, f"Nome de corretor ({tabela}) ambíguo ou fora do cadastro",
                                  len(barrados), "quarentena", barrados))
    return saida, registros, quarentena


def tratar(tabelas: dict[str, pd.DataFrame]) -> Resultado:
    t = dict(tabelas)
    cadastro = t["corretor"].set_index("id")["nome"]
    t["empreendimento"], registros = _bairros(t["empreendimento"])
    quarentena = []
    for tabela, origem in [("lead", "crm_leads.csv"), ("venda", "comercial_espelho.xlsx")]:
        t[tabela], novos, barrados = _corretores(t[tabela], cadastro, origem, tabela)
        registros += novos
        quarentena += barrados
    return Resultado(t, registros, quarentena)
