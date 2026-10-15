import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { abrirBanco } from '../apoio/banco.ts'

let db: PGlite

beforeAll(async () => {
  db = await abrirBanco()
})

afterAll(async () => {
  await db?.close()
})

async function um<T>(sql: string): Promise<T> {
  return (await db.query<T>(sql)).rows[0]
}

describe('adr.vw_venda', () => {
  it('tem uma linha por venda', async () => {
    const r = await um<{ vw: number; distintas: number; vendas: number }>(`
      select (select count(*) from adr.vw_venda)::int as vw,
             (select count(distinct id) from adr.vw_venda)::int as distintas,
             (select count(*) from adr.venda)::int as vendas`)
    expect(r.vw).toBe(r.vendas)
    expect(r.distintas).toBe(r.vendas)
  })

  it('traz o preço por m² da venda', async () => {
    const r = await um<{ erradas: number }>(`
      select count(*)::int as erradas from adr.vw_venda
      where abs(preco_m2 - valor_venda / area_privativa_m2) > 0.01`)
    expect(r.erradas).toBe(0)
  })
})

describe('adr.carteira_em', () => {
  it('a data de corte é 30/09/2026 e a vw_carteira é a carteira nessa data', async () => {
    const r = await um<{ corte: string; iguais: boolean }>(`
      select adr.data_corte()::text as corte,
             (select count(*) from adr.vw_carteira) = (select count(*) from adr.carteira_em(date '2026-09-30')) as iguais`)
    expect(r).toEqual({ corte: '2026-09-30', iguais: true })
  })

  it('saldo nunca é negativo e o pago nunca passa do valor', async () => {
    const r = await um<{ linhas: number; erradas: number }>(`
      select count(*)::int as linhas,
             count(*) filter (where saldo < 0 or pago > valor or saldo <> valor - pago)::int as erradas
      from adr.carteira_em(adr.data_corte())`)
    expect(r.linhas).toBeGreaterThan(0)
    expect(r.erradas).toBe(0)
  })

  it('só tem parcelas das vendas ativas na data', async () => {
    const r = await um<{ fora: number }>(`
      select count(*)::int as fora
      from adr.carteira_em(date '2025-06-30') c
      join adr.venda v on v.id = c.venda_id
      where v.data_venda > date '2025-06-30' or v.data_distrato <= date '2025-06-30'`)
    expect(r.fora).toBe(0)
  })

  it('dias de atraso e faixa só nas parcelas vencidas com saldo', async () => {
    const r = await um<{ erradas: number }>(`
      select count(*)::int as erradas
      from adr.carteira_em(adr.data_corte())
      where (vencida and saldo > 0) <> (dias_atraso > 0)
         or (dias_atraso between 1 and 30) <> (faixa = '1–30')
         or (dias_atraso between 31 and 60) <> (faixa = '31–60')
         or (dias_atraso between 61 and 90) <> (faixa = '61–90')
         or (dias_atraso > 90) <> (faixa = 'mais de 90')`)
    expect(r.erradas).toBe(0)
  })
})
