"""Grava os 6 brutos e o gabarito em disco, cada arquivo do jeito que o sistema de origem exporta.

CRM: CSV em UTF-8 com BOM e `;` (D2.2). ERP: CSV em Latin-1 e `;` (D2.3). Planilhas: .xlsx com uma aba
por chave. Todo arquivo de texto grava fim de linha `\\n` explícito: o pandas no Windows grava `\\r\\n`.
"""

import json
from pathlib import Path

import pandas as pd
from openpyxl.utils import get_column_letter

from etl.gerar import sujeira

CODIFICACAO_CSV = {sujeira.CRM: "utf-8-sig", sujeira.ERP_PARCELAS: "latin-1", sujeira.ERP_BAIXAS: "latin-1"}
LARGURA_MAXIMA = 50


def _largura(serie: pd.Series, titulo: str) -> int:
    """Largura da coluna no Excel: o maior texto da coluna, com folga."""
    if pd.api.types.is_datetime64_any_dtype(serie):
        maior = 16 if (serie.dropna().dt.floor("D") != serie.dropna()).any() else 10
    else:
        maior = int(serie.dropna().astype(str).str.len().max()) if serie.notna().any() else 0
    return min(max(maior, len(titulo)) + 2, LARGURA_MAXIMA)


def _gravar_xlsx(abas: dict[str, pd.DataFrame], caminho: Path) -> None:
    with pd.ExcelWriter(caminho, engine="openpyxl", date_format="DD/MM/YYYY",
                        datetime_format="DD/MM/YYYY HH:MM") as escritor:
        for aba, df in abas.items():
            df.to_excel(escritor, sheet_name=aba, index=False)
            planilha = escritor.sheets[aba]
            for n, coluna in enumerate(df.columns, start=1):
                planilha.column_dimensions[get_column_letter(n)].width = _largura(df[coluna], coluna)


def gravar(brutos: dict, gabarito: dict, pasta_brutos: Path, arq_gabarito: Path) -> dict[str, int]:
    """Grava os brutos e o gabarito; devolve as linhas gravadas por arquivo."""
    pasta_brutos.mkdir(parents=True, exist_ok=True)
    linhas = {}
    for arquivo, conteudo in brutos.items():
        caminho = pasta_brutos / arquivo
        if arquivo in CODIFICACAO_CSV:
            conteudo.to_csv(caminho, sep=";", encoding=CODIFICACAO_CSV[arquivo], lineterminator="\n", index=False)
            linhas[arquivo] = len(conteudo)
        else:
            _gravar_xlsx(conteudo, caminho)
            linhas[arquivo] = sum(len(df) for df in conteudo.values())

    arq_gabarito.parent.mkdir(parents=True, exist_ok=True)
    with open(arq_gabarito, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(gabarito, ensure_ascii=False, indent=2) + "\n")
    return linhas
