import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PARAMS_PADRAO, type Param, abrirBanco, rodar } from '../apoio/banco.ts'

type Kpi = { valor: number | null; valor_anterior: number | null }
type Empreendimento = {
  empreendimento_id: number; nome: string; slug: string; status: string
  unidades: number; vendidas: number; estoque: number; vso: number | null; vgv: number; interessados: number
}
type Ritmo = { empreendimento_id: number; nome: string; mes_desde_lancamento: number; vendidas_acumuladas: number; pct_vendido: number }
type Caixa = { empreendimento_id: number; nome: string; minimo: number; q1: number; mediana: number; q3: number; maximo: number; outliers: number[] }
type Estatisticas = { n: number; media: number; mediana: number; moda: number; desvio_padrao: number; p25: number; p50: number; p75: number; p90: number }
type VistaMar = { vista_mar: boolean; unidades: number; vendas: number; preco_m2_medio: number; pct_vendidas_6_meses: number }

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

async function vendasNoPeriodo(params: Param[] = PARAMS_PADRAO): Promise<number> {
  const r = await db.query<{ n: number }>(`
    select count(*)::int as n from adr.vw_venda
    where data_venda between $1 and $2 and ($3::smallint is null or empreendimento_id = $3)`, params)
  return r.rows[0].n
}

describe('cartões por empreendimento', () => {
  it('a soma do VGV dos cartões é o KPI de VGV do mesmo período', async () => {
    for (const params of [...filtros(), ['2023-01-01', '2026-09-30', null]]) {
      const cartoes = await rodar<Empreendimento>(db, 'vendas-estoque/empreendimentos', params)
      const [vgv] = await rodar<Kpi>(db, 'visao-geral/kpi_vgv', params)
      expect(cartoes.reduce((s, c) => s + c.vgv, 0)).toBeCloseTo(vgv.valor!, 2)
    }
  })

  it('interessados é a lista de interesse até o fim do período, e os de pré-lançamento já têm a sua', async () => {
    const cartoes = await rodar<Empreendimento>(db, 'vendas-estoque/empreendimentos')
    for (const c of cartoes) {
      const r = await db.query<{ n: number }>(
        `select count(*)::int as n from adr.lead where empreendimento_id = $1 and data_entrada < '2026-10-01'`, [c.empreendimento_id])
      expect(c.interessados).toBe(r.rows[0].n)
    }
    for (const c of cartoes.filter((x) => x.status === 'pre_lancamento')) expect(c.interessados).toBeGreaterThan(0)
  })

  it('em cada empreendimento, vendidas + estoque = unidades', async () => {
    const cartoes = await rodar<Empreendimento>(db, 'vendas-estoque/empreendimentos')
    expect(cartoes).toHaveLength(7)
    for (const c of cartoes) expect(c.vendidas + c.estoque).toBe(c.unidades)
    expect(cartoes.reduce((s, c) => s + c.unidades, 0)).toBe(390)
  })

  it('o VSO e o estoque de cada cartão são os KPIs filtrados pelo empreendimento', async () => {
    const cartoes = await rodar<Empreendimento>(db, 'vendas-estoque/empreendimentos')
    for (const id of lancados) {
      const c = cartoes.find((x) => x.empreendimento_id === id)!
      const params = [PARAMS_PADRAO[0], PARAMS_PADRAO[1], id]
      const [vso] = await rodar<Kpi>(db, 'visao-geral/kpi_vso', params)
      const [estoque] = await rodar<Kpi>(db, 'visao-geral/kpi_estoque', params)
      expect(c.vso).toBeCloseTo(vso.valor!, 10)
      expect(c.estoque).toBe(estoque.valor)
    }
  })
})

describe('ritmo de vendas desde o lançamento', () => {
  it('não diminui mês a mês e não passa de 100%', async () => {
    const linhas = await rodar<Ritmo>(db, 'vendas-estoque/ritmo_acumulado')
    expect(new Set(linhas.map((l) => l.empreendimento_id))).toEqual(new Set(lancados))
    for (const id of lancados) {
      const curva = linhas.filter((l) => l.empreendimento_id === id)
      expect(curva[0].mes_desde_lancamento).toBe(1)
      curva.forEach((l, i) => {
        expect(l.mes_desde_lancamento).toBe(i + 1)
        expect(l.pct_vendido).toBeLessThanOrEqual(1)
        if (i > 0) expect(l.vendidas_acumuladas).toBeGreaterThanOrEqual(curva[i - 1].vendidas_acumuladas)
      })
    }
  })

  it('o Bessa, lançado em ago/2025, tem 14 meses até set/2026', async () => {
    const curva = await rodar<Ritmo>(db, 'vendas-estoque/ritmo_acumulado', [PARAMS_PADRAO[0], PARAMS_PADRAO[1], 4])
    expect(curva).toHaveLength(14)
  })
})

describe('preço por m²', () => {
  it('estatísticas: p50 = mediana, percentis em ordem e n = vendas do período', async () => {
    for (const params of filtros()) {
      const [e] = await rodar<Estatisticas>(db, 'vendas-estoque/preco_m2_estatisticas', params)
      expect(e.p50).toBe(e.mediana)
      expect(e.p25).toBeLessThanOrEqual(e.p50)
      expect(e.p50).toBeLessThanOrEqual(e.p75)
      expect(e.p75).toBeLessThanOrEqual(e.p90)
      expect(e.n).toBe(await vendasNoPeriodo(params))
      expect(e.desvio_padrao).toBeGreaterThan(0)
      expect(e.moda % 100).toBe(0)  // moda sobre o preço/m² arredondado a R$ 100
    }
  })

  it('boxplot: mínimo ≤ Q1 ≤ mediana ≤ Q3 ≤ máximo, e todo outlier fica fora dos bigodes', async () => {
    const caixas = await rodar<Caixa>(db, 'vendas-estoque/preco_m2_distribuicao', ['2023-01-01', '2026-09-30', null])
    expect(caixas.map((c) => c.empreendimento_id)).toEqual(lancados)
    for (const c of caixas) {
      expect(c.minimo).toBeLessThanOrEqual(c.q1)
      expect(c.q1).toBeLessThanOrEqual(c.mediana)
      expect(c.mediana).toBeLessThanOrEqual(c.q3)
      expect(c.q3).toBeLessThanOrEqual(c.maximo)
      const iqr = c.q3 - c.q1
      for (const o of c.outliers) {
        expect(o < c.minimo || o > c.maximo).toBe(true)
        expect(o < c.q1 - 1.5 * iqr || o > c.q3 + 1.5 * iqr).toBe(true)
      }
    }
  })
})

describe('vista mar', () => {
  it('tem 2 linhas e a soma das vendas é o número de vendas do período', async () => {
    const linhas = await rodar<VistaMar>(db, 'vendas-estoque/vista_mar')
    expect(linhas.map((l) => l.vista_mar)).toEqual([true, false])
    expect(linhas.reduce((s, l) => s + l.vendas, 0)).toBe(await vendasNoPeriodo())
    expect(linhas.reduce((s, l) => s + l.unidades, 0)).toBe(390)
  })

  it('com vista mar, o preço/m² é maior e a venda é mais rápida (padrão plantado)', async () => {
    const [mar, sem] = await rodar<VistaMar>(db, 'vendas-estoque/vista_mar')
    expect(mar.preco_m2_medio).toBeGreaterThan(sem.preco_m2_medio)
    expect(mar.pct_vendidas_6_meses).toBeGreaterThan(sem.pct_vendidas_6_meses)
  })
})
