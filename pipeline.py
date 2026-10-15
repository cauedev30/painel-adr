"""O pipeline: ler → tratar → validar → carregar.

Uso: python pipeline.py  (depois de python gerar_dados.py)
Lê os 6 brutos de dados/brutos/, aplica R1 a R7, valida e grava dados/limpos/ e o banco PostgreSQL em
web/public/banco.tar.gz. Se a validação falha, sai com código 1, lista as falhas e não grava nada (D3.7).
"""

import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from etl import carregar, config, ler, modelo, validar
from etl.tratar import tratar
from etl.tratar.comum import Registro

# de que tabelas é feito cada bruto (para contar as linhas lidas por arquivo)
TABELAS_DO_ARQUIVO = {
    "crm_leads.csv": ["lead"],
    "comercial_espelho.xlsx": ["empreendimento", "unidade", "venda"],
    "comercial_parceiros.xlsx": ["imobiliaria", "corretor"],
    "erp_parcelas.csv": ["parcela"],
    "erp_baixas.csv": ["pagamento"],
    "diretoria_metas.xlsx": ["meta_mensal"],
}


@dataclass
class Resumo:
    lidas: dict[str, int]
    registros: list[Registro]
    quarentena: dict[str, int]  # linhas em quarentena por tabela
    checagens: list[str]
    carregadas: dict[str, int]
    tamanho_banco: int | None  # bytes do banco.tar.gz; None quando o banco não foi montado
    tabelas: dict[str, pd.DataFrame] = field(repr=False)


def executar(dir_brutos: Path, dir_limpos: Path, montar_banco: bool = True) -> Resumo:
    lidos = ler.ler(dir_brutos)
    lidas = {arquivo: sum(len(lidos[t]) for t in tabelas) for arquivo, tabelas in TABELAS_DO_ARQUIVO.items()}

    tratado = tratar(lidos)
    checagens = validar.validar(tratado.tabelas)  # levanta ErroDeValidacao antes de gravar qualquer coisa

    carregadas = carregar.gravar_limpos(tratado.tabelas, tratado.registros, tratado.quarentena, dir_limpos)
    tamanho = carregar.montar_banco().stat().st_size if montar_banco else None
    return Resumo(lidas, tratado.registros, dict(Counter(q["tabela"] for q in tratado.quarentena)),
                  checagens, carregadas, tamanho, tratado.tabelas)


def _milhar(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def _imprimir(resumo: Resumo) -> None:
    lidas = " · ".join(f"{arquivo} {_milhar(n)}" for arquivo, n in resumo.lidas.items())
    print(f"1. Ler       {lidas} linhas")

    print("2. Tratar")
    for r in resumo.registros:
        print(f"     {r.regra:<3} {r.acao:<11}{_milhar(r.linhas_afetadas):>7}  {r.origem:<24} {r.descricao}")
    em_quarentena = " · ".join(f"{_milhar(resumo.quarentena[t])} {t}" for t in modelo.TABELAS_ADR if t in resumo.quarentena)
    print(f"     em quarentena: {em_quarentena}")

    print(f"3. Validar   {len(resumo.checagens)} checagens ok: {', '.join(resumo.checagens)}")

    banco = ""
    if resumo.tamanho_banco is not None:
        mb = f"{resumo.tamanho_banco / 1024 / 1024:.1f}".replace(".", ",")
        banco = f" · banco.tar.gz {mb} MB"
    print(f"4. Carregar  {len(resumo.carregadas)} tabelas · {_milhar(sum(resumo.carregadas.values()))} linhas{banco}")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também quando a saída vai para um pipe
    sys.stderr.reconfigure(encoding="utf-8")
    try:
        resumo = executar(config.DIR_BRUTOS, config.DIR_LIMPOS)
    except validar.ErroDeValidacao as erro:
        print(erro, file=sys.stderr)
        return 1
    _imprimir(resumo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
