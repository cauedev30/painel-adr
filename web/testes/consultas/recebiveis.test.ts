import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PARAMS_PADRAO, type Param, abrirBanco, rodar } from '../apoio/banco.ts'

type Kpi = { valor: number | null; valor_anterior: number | null }
type Mes = { mes: string; previsto: number; recebido: number }
type Faixa = { faixa: string; ordem: number; saldo: number; parcelas: number }
type Celula = { empreendimento_id: number; nome: string; faixa: string; ordem: number; saldo: number }
type PorEmpreendimento = { empreendimento_id: number; nome: string; inadimplencia: number }
type PorDesconto = { faixa_desconto: string; ordem: number; vendas: number; inadimplencia: number }
type Distratos = { distratos: number; com_atraso_60: number; pct: number | null }

const SEASIDE = 2
const FAIXAS = ['1–30', '31–60', '61–90', 'mais de 90']

let db: PGlite
let lancados: number[]

beforeAll(async () => {
  db = await abrirBanco()
  const r = await db.query<{ id: number }>(`select id from adr.empreendimento where data_lancamento is not null order by id`)
  lancados = r.rows.map((l) => l.id)
})

afterAll(async () => {
  await db?.close()
})

function filtros(): Param[][] {
  return [PARAMS_PADRAO, ...lancados.map((id) => [PARAMS_PADRAO[0], PARAMS_PADRAO[1], id])]
}

async function numero(sql: string, params: Param[] = []): Promise<number> {
  return (await db.query<{ n: number }>(sql, params)).rows[0].n
}

describe('KPIs de recebíveis', () => {
  it('a receber em 12 meses é o saldo que vence nos 12 meses depois do fim do período', async () => {
    for (const params of filtros()) {
      const [kpi] = await rodar<Kpi>(db, 'recebiveis/kpi_a_receber_12m', params)
      const esperado = await numero(`
        select coalesce(sum(saldo), 0)::float8 as n from adr.carteira_em($2::date)
        where vencimento >= $2::date and vencimento <= $2::date + interval '12 months'
          and ($3::smallint is null or empreendimento_id = $3) and $1::date is not null`, params)
      expect(kpi.valor).toBeCloseTo(esperado, 2)
      expect(typeof kpi.valor_anterior).toBe('number')
    }
  })

  it('recebido no mês é o pago no último mês do período, e o anterior é o mês antes dele', async () => {
    const [kpi] = await rodar<Kpi>(db, 'recebiveis/kpi_recebido_mes')
    const pago = (inicio: string, fim: string) => numero(`
      select sum(pg.valor_pago)::float8 as n
      from adr.pagamento pg join adr.carteira_em(date '2026-09-30') c on c.parcela_id = pg.parcela_id
      where pg.data_pagamento between $1 and $2`, [inicio, fim])
    expect(kpi.valor).toBeCloseTo(await pago('2026-09-01', '2026-09-30'), 2)
    expect(kpi.valor_anterior).toBeCloseTo(await pago('2026-08-01', '2026-08-31'), 2)
  })

  it('inadimplência fica entre 0 e 1', async () => {
    const [kpi] = await rodar<Kpi>(db, 'visao-geral/kpi_inadimplencia')
    expect(kpi.valor).toBeGreaterThan(0)
    expect(kpi.valor).toBeLessThan(1)
  })
})

describe('previsto × recebido', () => {
  it('um mês por linha, e o recebido soma os pagamentos do período das vendas ativas', async () => {
    for (const params of filtros()) {
      const meses = await rodar<Mes>(db, 'recebiveis/previsto_recebido', params)
      expect(meses).toHaveLength(12)
      const esperado = await numero(`
        select coalesce(sum(pg.valor_pago), 0)::float8 as n
        from adr.pagamento pg
        join adr.parcela p on p.id = pg.parcela_id
        join adr.vw_venda v on v.id = p.venda_id
        where pg.data_pagamento between $1 and $2
          and v.data_venda <= $2 and (v.data_distrato is null or v.data_distrato > $2)
          and ($3::smallint is null or v.empreendimento_id = $3)`, params)
      expect(meses.reduce((s, m) => s + m.recebido, 0)).toBeCloseTo(esperado, 2)
    }
  })
})

describe('faixas de atraso e mapa de calor', () => {
  it('a soma das faixas é o vencido em aberto na carteira do fim do período', async () => {
    for (const params of filtros()) {
      const faixas = await rodar<Faixa>(db, 'recebiveis/faixas_atraso', params)
      expect(faixas.map((f) => f.faixa)).toEqual(FAIXAS)
      const esperado = await numero(`
        select coalesce(sum(saldo) filter (where vencida), 0)::float8 as n from adr.carteira_em($2::date)
        where ($3::smallint is null or empreendimento_id = $3) and $1::date is not null`, params)
      expect(faixas.reduce((s, f) => s + f.saldo, 0)).toBeCloseTo(esperado, 2)
    }
  })

  it('o mapa de calor somado por faixa dá as faixas de atraso', async () => {
    const mapa = await rodar<Celula>(db, 'recebiveis/mapa_calor')
    const faixas = await rodar<Faixa>(db, 'recebiveis/faixas_atraso')
    expect(mapa).toHaveLength(lancados.length * FAIXAS.length)
    for (const f of faixas) {
      const soma = mapa.filter((c) => c.faixa === f.faixa).reduce((s, c) => s + c.saldo, 0)
      expect(soma).toBeCloseTo(f.saldo, 2)
    }
  })
})

describe('as provas das conclusões 4 e 5', () => {
  it('o Seaside tem a maior inadimplência, igual ao KPI filtrado por ele', async () => {
    const linhas = await rodar<PorEmpreendimento>(db, 'recebiveis/inadimplencia_por_empreendimento')
    const maior = linhas.reduce((a, b) => (b.inadimplencia > a.inadimplencia ? b : a))
    expect(maior.empreendimento_id).toBe(SEASIDE)
    const [kpi] = await rodar<Kpi>(db, 'visao-geral/kpi_inadimplencia', [PARAMS_PADRAO[0], PARAMS_PADRAO[1], SEASIDE])
    expect(maior.inadimplencia).toBeCloseTo(kpi.valor!, 10)
  })

  it('a faixa de desconto de 8% ou mais tem a maior inadimplência', async () => {
    const faixas = await rodar<PorDesconto>(db, 'recebiveis/inadimplencia_por_desconto')
    expect(faixas.map((f) => f.faixa_desconto)).toEqual(['0–3%', '3–8%', '8% ou mais'])
    const ativas = await numero(`select count(*)::int as n from adr.venda where status = 'ativa'`)
    expect(faixas.reduce((s, f) => s + f.vendas, 0)).toBe(ativas)
    const maior = faixas.reduce((a, b) => (b.inadimplencia > a.inadimplencia ? b : a))
    expect(maior.faixa_desconto).toBe('8% ou mais')
  })

  it('quase todo distrato teve antes uma parcela com mais de 60 dias de atraso', async () => {
    const [todos] = await rodar<Distratos>(db, 'recebiveis/distratos_e_atraso', ['2023-01-01', '2026-09-30', null])
    expect(todos.distratos).toBe(await numero(`select count(*)::int as n from adr.venda where status = 'distratada'`))
    expect(todos.com_atraso_60).toBeLessThanOrEqual(todos.distratos)
    expect(todos.pct).toBeGreaterThanOrEqual(0.8)
    for (const params of filtros()) {
      const [d] = await rodar<Distratos>(db, 'recebiveis/distratos_e_atraso', params)
      expect(d.com_atraso_60).toBeLessThanOrEqual(d.distratos)
    }
  })
})
