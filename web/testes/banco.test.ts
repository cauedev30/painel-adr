import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// O banco que o pipeline gera (python pipeline.py), conferido contra os CSVs limpos que o alimentaram
const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const BANCO = resolve(RAIZ, 'web/public/banco.tar.gz')
const LIMPOS = resolve(RAIZ, 'dados/limpos')
const TABELAS = [
  'adr.empreendimento', 'adr.unidade', 'adr.imobiliaria', 'adr.corretor', 'adr.lead', 'adr.cliente',
  'adr.venda', 'adr.parcela', 'adr.pagamento', 'adr.meta_mensal',
  'auditoria.relatorio_qualidade', 'auditoria.quarentena',
]

function linhasDoCsv(tabela: string): number {
  // linhas do CSV sem o cabeçalho; campos com quebra de linha não existem nos limpos
  const texto = readFileSync(resolve(LIMPOS, `${tabela.split('.')[1]}.csv`), 'utf-8')
  return texto.trimEnd().split('\n').length - 1
}

let db: PGlite

beforeAll(async () => {
  if (!existsSync(BANCO)) throw new Error('web/public/banco.tar.gz não existe: rode python pipeline.py antes')
  db = await PGlite.create({ loadDataDir: new Blob([readFileSync(BANCO)]) })
})

afterAll(async () => {
  await db?.close()
})

describe('banco gerado pelo pipeline', () => {
  it.each(TABELAS)('%s tem as mesmas linhas do CSV limpo', async (tabela) => {
    const r = await db.query<{ n: number }>(`select count(*)::int as n from ${tabela}`)
    expect(r.rows[0].n).toBe(linhasDoCsv(tabela))
  })

  it('tem o índice de uma venda ativa por unidade', async () => {
    const r = await db.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where schemaname = 'adr' and indexname = 'venda_uma_ativa_por_unidade'`,
    )
    expect(r.rows[0].indexdef).toMatch(/UNIQUE INDEX .* WHERE \(status = 'ativa'::text\)/)
  })

  it('toda tabela e toda coluna de adr têm comentário (o dicionário de dados)', async () => {
    const r = await db.query<{ objeto: string }>(`
      select c.relname || '.' || a.attname as objeto
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid and c.relkind = 'r'
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'adr'
      where a.attnum > 0 and not a.attisdropped and col_description(c.oid, a.attnum) is null
      union all
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'adr'
      where c.relkind = 'r' and obj_description(c.oid, 'pg_class') is null
    `)
    expect(r.rows.map((l) => l.objeto)).toEqual([])
  })
})
