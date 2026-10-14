"""Gera os dados simulados: a verdade, a sujeira dos 3 sistemas e o gabarito.

Uso: python gerar_dados.py
Grava os 6 brutos em dados/brutos/ e o gabarito em dados/gabarito.json. Mesma semente, mesmos arquivos.
"""

import sys

from etl import config
from etl.gerar import exportar, sujeira, verdade


def _milhar(n: int) -> str:
    """16479 vira '16.479'."""
    return f"{n:,}".replace(",", ".")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também quando a saída vai para um pipe
    tabelas = verdade.gerar(config.SEMENTE)
    brutos, gabarito = sujeira.sujar(tabelas, config.SEMENTE)
    linhas = exportar.gravar(brutos, gabarito, config.DIR_BRUTOS, config.ARQ_GABARITO)

    print(f"Semente {config.SEMENTE} · dados até {config.DATA_CORTE:%d/%m/%Y}\n")
    print("Arquivos brutos (dados/brutos/)")
    for arquivo, n in linhas.items():
        print(f"  {arquivo:<28}{_milhar(n):>8} linhas")
    print("\nSujeira plantada (dados/gabarito.json)")
    for regra, r in gabarito["regras"].items():
        print(f"  {regra}  {r['descricao']:<70}{_milhar(r['linhas_sujadas']):>6}")
    q = gabarito["quarentena_esperada"]
    print("\nQuarentena esperada: " + ", ".join(f"{len(ids)} {tabela}" for tabela, ids in q.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
