"""O README não pode ficar para trás do banco (D7.4): o DER dele, escrito à mão, confere com o schema."""

import re

import pytest

from etl.config import DIR_SQL, RAIZ

README = (RAIZ / "README.md").read_text(encoding="utf-8")
SCHEMA = (DIR_SQL / "01_schema.sql").read_text(encoding="utf-8")


def _tabelas_do_schema() -> dict[str, str]:
    """Tabela de adr → o corpo do create table."""
    return dict(re.findall(r"create table adr\.(\w+) \((.*?)\n\);", SCHEMA, re.S))


def _fks_do_schema() -> set[tuple[str, str, str]]:
    """(tabela filha, coluna, tabela pai) de cada `references` do schema."""
    return {(tabela, coluna, pai)
            for tabela, corpo in _tabelas_do_schema().items()
            for coluna, pai in re.findall(r"^\s*(\w+)\s.*references adr\.(\w+)", corpo, re.M)}


def _der() -> str:
    blocos = [b for b in re.findall(r"```mermaid\n(.*?)```", README, re.S) if b.lstrip().startswith("erDiagram")]
    assert len(blocos) == 1, "o README tem um, e só um, erDiagram"
    return blocos[0]


def _entidades() -> dict[str, str]:
    """Entidade do DER → o bloco de atributos."""
    return dict(re.findall(r"^\s*(\w+) \{\n(.*?)^\s*\}", _der(), re.M | re.S))


def _relacoes() -> set[frozenset[str]]:
    return {frozenset(par) for par in re.findall(r"^\s*(\w+) [|o}{]{2}--[|o}{]{2} (\w+) :", _der(), re.M)}


def test_toda_tabela_de_adr_esta_no_der():
    assert len(_tabelas_do_schema()) == 10
    assert set(_entidades()) == set(_tabelas_do_schema())


def test_toda_fk_do_schema_e_uma_relacao_do_der_e_nenhuma_relacao_e_inventada():
    fks = _fks_do_schema()
    assert len(fks) == 11
    assert _relacoes() == {frozenset((filha, pai)) for filha, _, pai in fks}


@pytest.mark.parametrize("filha,coluna,pai", sorted(_fks_do_schema()))
def test_a_coluna_da_fk_aparece_marcada_como_fk(filha, coluna, pai):
    atributos = _entidades()[filha]
    assert re.search(rf"^\s*\w+ {coluna} (PK, )?FK$", atributos, re.M), f"{filha}.{coluna} → {pai}"


def test_imagens_e_links_locais_do_readme_existem():
    caminhos = re.findall(r"\]\((?!https?://)([^)#]+)\)", README)
    assert caminhos
    faltando = [c for c in caminhos if not (RAIZ / c).exists()]
    assert not faltando
