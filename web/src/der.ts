// O DER da tela Dados (D6.3): o texto `erDiagram` do Mermaid gerado das linhas de dados/der.sql, que lê
// o catálogo do próprio banco. Mudou o schema, mudou o diagrama, sem ninguém redesenhar. Testado em
// testes/painel/der.test.ts.

export type LinhaDer = {
  tabela: string  // esquema.tabela
  coluna: string
  tipo: string
  nulo: boolean
  pk: boolean
  fk_tabela: string | null
  fk_coluna: string | null
  comentario: string | null
}

/** As tabelas, na ordem em que o catálogo as devolve. */
export function tabelasDoDer(linhas: LinhaDer[]): string[] {
  return [...new Set(linhas.map((l) => l.tabela))]
}

/** O nome no diagrama: sem o esquema, porque nenhuma tabela de adr tem o nome de uma de auditoria. */
export function nomeDaEntidade(tabela: string): string {
  return tabela.slice(tabela.indexOf('.') + 1)
}

export function colunasDaTabela(linhas: LinhaDer[], tabela: string): LinhaDer[] {
  return linhas.filter((l) => l.tabela === tabela)
}

/** O tipo como o Mermaid aceita: sem a precisão (a vírgula de numeric(12,2) quebra o diagrama) e sem espaço. */
function tipoNoDiagrama(tipo: string): string {
  return tipo.replace(/\(.*\)/, '').trim().replace(/\s+/g, '_')
}

export function gerarDer(linhas: LinhaDer[]): string {
  const tabelas = tabelasDoDer(linhas)
  const saida = ['erDiagram']

  for (const tabela of tabelas) {
    saida.push(`  ${nomeDaEntidade(tabela)} {`)
    for (const c of colunasDaTabela(linhas, tabela)) {
      const chaves = [c.pk && 'PK', c.fk_tabela && tabelas.includes(c.fk_tabela) && 'FK'].filter(Boolean).join(', ')
      saida.push(`    ${tipoNoDiagrama(c.tipo)} ${c.coluna}${chaves ? ` ${chaves}` : ''}`)
    }
    saida.push('  }')
  }

  // uma relação por chave estrangeira: a referenciada tem uma ou nenhuma (FK nula); a outra, zero ou muitas
  for (const c of linhas) {
    if (c.fk_tabela === null || !tabelas.includes(c.fk_tabela)) continue
    const lado = c.nulo ? '|o' : '||'
    saida.push(`  ${nomeDaEntidade(c.fk_tabela)} ${lado}--o{ ${nomeDaEntidade(c.tabela)} : "${c.coluna}"`)
  }

  return saida.join('\n')
}
