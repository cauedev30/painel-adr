"""Carregar: grava os CSVs limpos e monta o banco PostgreSQL no PGlite.

Os CSVs ficam no formato que o `COPY ... (format csv, header true)` do Postgres lê: colunas na ordem
do CREATE TABLE, UTF-8, vírgula, cabeçalho, nulo como campo vazio, datas em ISO, booleano true/false.
Quem monta o banco é `web/scripts/montar-banco.mjs` (Node), porque o PGlite é uma biblioteca JavaScript.
"""

import json
import subprocess
from pathlib import Path

import pandas as pd

from etl import modelo
from etl.config import ARQ_BANCO, RAIZ
from etl.tratar.comum import Registro

SCRIPT_DO_BANCO = RAIZ / "web" / "scripts" / "montar-banco.mjs"
# a única coluna com hora; as outras datas do modelo são `date`
TIMESTAMPS = {("lead", "data_entrada")}


def _para_csv(df: pd.DataFrame, tabela: str) -> pd.DataFrame:
    saida = df[modelo.COLUNAS[tabela]].copy()
    for coluna in saida.columns:
        serie = saida[coluna]
        if pd.api.types.is_datetime64_any_dtype(serie):
            formato = "%Y-%m-%d %H:%M:%S" if (tabela, coluna) in TIMESTAMPS else "%Y-%m-%d"
            saida[coluna] = serie.dt.strftime(formato)
        elif pd.api.types.is_bool_dtype(serie):
            saida[coluna] = serie.map({True: "true", False: "false"})
        elif pd.api.types.is_float_dtype(serie) and serie.dropna().mod(1).eq(0).all() and coluna.endswith("_id"):
            saida[coluna] = serie.astype("Int64")  # id que virou float por causa de um nulo
    return saida


def _gravar(df: pd.DataFrame, caminho: Path) -> int:
    df.to_csv(caminho, index=False, encoding="utf-8", lineterminator="\n", na_rep="")
    return len(df)


def gravar_limpos(tabelas: dict[str, pd.DataFrame], registros: list[Registro], quarentena: list[dict],
                  pasta: Path) -> dict[str, int]:
    """Um CSV por tabela de adr e de auditoria; devolve as linhas gravadas por tabela."""
    pasta.mkdir(parents=True, exist_ok=True)
    linhas = {t: _gravar(_para_csv(tabelas[t], t), pasta / f"{t}.csv") for t in modelo.TABELAS_ADR}

    relatorio = pd.DataFrame([{"regra": r.regra, "origem": r.origem, "descricao": r.descricao,
                               "linhas_afetadas": r.linhas_afetadas, "acao": r.acao} for r in registros],
                             columns=modelo.COLUNAS["relatorio_qualidade"])
    linhas["relatorio_qualidade"] = _gravar(relatorio, pasta / "relatorio_qualidade.csv")

    barrados = pd.DataFrame([{"id": n, "origem": f"{q['origem']} · {q['tabela']}", "regra": q["regra"],
                              "registro": json.dumps(q["registro"], ensure_ascii=False), "motivo": q["motivo"]}
                             for n, q in enumerate(quarentena, start=1)],
                            columns=modelo.COLUNAS["quarentena"])
    linhas["quarentena"] = _gravar(barrados, pasta / "quarentena.csv")
    return linhas


def montar_banco() -> Path:
    """Roda o script Node que cria o banco no PGlite a partir dos CSVs limpos e salva o banco.tar.gz."""
    subprocess.run(["node", str(SCRIPT_DO_BANCO)], check=True, cwd=RAIZ)
    return ARQ_BANCO
