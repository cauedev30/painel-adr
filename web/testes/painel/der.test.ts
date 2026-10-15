import { describe, expect, it } from 'vitest'
import { type LinhaDer, colunasDaTabela, gerarDer, nomeDaEntidade, tabelasDoDer } from '../../src/der.ts'
import { abrirBanco, rodar } from '../apoio/banco.ts'

async function linhasDoBanco(): Promise<LinhaDer[]> {
  const db = await abrirBanco()
  const linhas = await rodar<LinhaDer>(db, 'dados/der')
  await db.close()
  return linhas
}

const coluna = (tabela: string, nome: string, extra: Partial<LinhaDer> = {}): LinhaDer => ({
  tabela, coluna: nome, tipo: 'integer', nulo: false, pk: false, fk_tabela: null, fk_coluna: null, comentario: null, ...extra,
})

describe('DER gerado do catálogo do banco', () => {
  it('tem as 12 tabelas e uma relação por chave estrangeira', async () => {
    const linhas = await linhasDoBanco()
    const texto = gerarDer(linhas)
    const tabelas = tabelasDoDer(linhas)
    expect(tabelas).toHaveLength(12)
    for (const t of tabelas) expect(texto).toContain(`  ${nomeDaEntidade(t)} {`)
    const fks = linhas.filter((l) => l.fk_tabela !== null)
    const relacoes = texto.split('\n').filter((l) => / : "/.test(l))
    expect(relacoes).toHaveLength(fks.length)
    expect(fks.length).toBeGreaterThanOrEqual(10)
  })

  it('escreve PK e FK nos atributos e a relação no sentido certo', () => {
    const texto = gerarDer([
      coluna('adr.venda', 'id', { pk: true }),
      coluna('adr.venda', 'unidade_id', { fk_tabela: 'adr.unidade', fk_coluna: 'id' }),
      coluna('adr.venda', 'valor_venda', { tipo: 'numeric(12,2)' }),
      coluna('adr.unidade', 'id', { pk: true }),
    ])
    expect(texto.startsWith('erDiagram\n')).toBe(true)
    expect(texto).toContain('    integer id PK')
    expect(texto).toContain('    integer unidade_id FK')
    // o Mermaid não aceita vírgula no tipo: a precisão fica para a aba Físico
    expect(texto).toContain('    numeric valor_venda')
    expect(texto).toContain('  unidade ||--o{ venda : "unidade_id"')
  })

  it('FK que pode ser nula vira "zero ou um" do lado da tabela referenciada', () => {
    const texto = gerarDer([
      coluna('adr.corretor', 'imobiliaria_id', { nulo: true, fk_tabela: 'adr.imobiliaria', fk_coluna: 'id' }),
      coluna('adr.imobiliaria', 'id', { pk: true }),
    ])
    expect(texto).toContain('  imobiliaria |o--o{ corretor : "imobiliaria_id"')
  })

  it('relação para uma tabela que não existe não aparece', () => {
    const texto = gerarDer([
      coluna('adr.venda', 'id', { pk: true }),
      coluna('adr.venda', 'fantasma_id', { fk_tabela: 'adr.fantasma', fk_coluna: 'id' }),
    ])
    expect(texto).not.toContain('fantasma ||')
    expect(texto).not.toContain(' : "fantasma_id"')
  })

  it('colunasDaTabela devolve as colunas na ordem do catálogo', async () => {
    const linhas = await linhasDoBanco()
    const venda = colunasDaTabela(linhas, 'adr.venda')
    expect(venda[0]).toMatchObject({ coluna: 'id', pk: true })
    expect(venda.map((c) => c.coluna)).toContain('desconto_pct')
    for (const c of venda) expect(c.comentario).toBeTruthy()
  })
})
