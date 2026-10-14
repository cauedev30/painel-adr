import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

// Testes de caracterização: documentam o comportamento do PGlite em que o projeto se apoia.
describe('PGlite', () => {
  it('roda o PostgreSQL de verdade', async () => {
    const db = await PGlite.create()
    const r = await db.query<{ versao: string }>('select version() as versao')
    expect(r.rows[0].versao).toMatch(/^PostgreSQL/)
    await db.close()
  })

  it('exporta o banco e carrega a cópia com os mesmos dados', async () => {
    const db = await PGlite.create()
    await db.exec(`
      create schema adr;
      create table adr.teste (n int);
      insert into adr.teste values (1), (2), (3);
    `)
    const copia = await db.dumpDataDir('gzip')
    await db.close()

    const db2 = await PGlite.create({ loadDataDir: copia })
    const r = await db2.query<{ total: number }>('select sum(n)::int as total from adr.teste')
    expect(r.rows[0].total).toBe(6)
    await db2.close()
  })

  it('exige que a consulta use todos os parâmetros recebidos', async () => {
    const db = await PGlite.create()
    await expect(db.query('select $1::int as a', [1, 2, null])).rejects.toThrow(/bind message supplies 3/)
    const r = await db.query<{ inicio: string; fim: string; empreendimento_id: number | null }>(
      `with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id)
       select inicio::text, fim::text, empreendimento_id from params`,
      ['2026-01-01', '2026-09-30', null],
    )
    expect(r.rows[0]).toEqual({ inicio: '2026-01-01', fim: '2026-09-30', empreendimento_id: null })
    await db.close()
  })

  it('devolve numeric como texto e date como meia-noite UTC', async () => {
    const db = await PGlite.create()
    const r = await db.query<{ valor: unknown; vendas: unknown; dia: Date }>(
      `select 1234.56::numeric(12,2) as valor, count(*) as vendas, '2026-09-30'::date as dia`,
    )
    // numeric chega como string: o que vai para gráfico sai do SQL com ::float8
    expect(r.rows[0].valor).toBe('1234.56')
    // count(*) é bigint e chega como number
    expect(r.rows[0].vendas).toBe(1)
    // date vira Date à meia-noite UTC; no fuso de Brasília isso cairia no dia 29
    expect(r.rows[0].dia.toISOString()).toBe('2026-09-30T00:00:00.000Z')
    await db.close()
  })
})
