import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PARAMS_PADRAO, type Param, abrirBanco, rodar } from '../apoio/banco.ts'

const KPIS = ['kpi_vgv', 'kpi_vso', 'kpi_estoque', 'kpi_ticket_medio', 'kpi_preco_m2', 'kpi_inadimplencia']

type Kpi = { valor: number | null; valor_anterior: number | null }
type Mes = { mes: string; vendas: number; meta: number; media_movel_3m: number }

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

/** O filtro padrão sem empreendimento e com cada empreendimento lançado. */
function filtros(): Param[][] {
  return [PARAMS_PADRAO, ...lancados.map((id) => [PARAMS_PADRAO[0], PARAMS_PADRAO[1], id])]
}

async function contar(sql: string, params: Param[] = []): Promise<number> {
  return (await db.query<{ n: number }>(sql, params)).rows[0].n
}

describe('KPIs da visão geral', () => {
  it.each(KPIS)('%s devolve uma linha com valor e valor_anterior numéricos', async (kpi) => {
    for (const params of filtros()) {
      const linhas = await rodar<Kpi>(db, `visao-geral/${kpi}`, params)
      expect(linhas).toHaveLength(1)
      expect(typeof linhas[0].valor).toBe('number')
      expect(typeof linhas[0].valor_anterior).toBe('number')
    }
  })

  it('estoque no fim de set/2026 é 390 menos as vendas ativas', async () => {
    const [estoque] = await rodar<Kpi>(db, 'visao-geral/kpi_estoque')
    const ativas = await contar(`select count(*)::int as n from adr.venda where status = 'ativa'`)
    expect(estoque.valor).toBe(390 - ativas)
  })

  it('VGV confere com a definição do D4.5', async () => {
    const sql = `
      select ((select coalesce(sum(valor_venda), 0) from adr.vw_venda
               where data_venda between $1 and $2 and ($3::smallint is null or empreendimento_id = $3))
            - (select coalesce(sum(valor_venda), 0) from adr.vw_venda
               where data_distrato between $1 and $2 and ($3::smallint is null or empreendimento_id = $3)))::float8 as n`
    for (const params of filtros()) {
      const [vgv] = await rodar<Kpi>(db, 'visao-geral/kpi_vgv', params)
      expect(vgv.valor).toBeCloseTo(await contar(sql, params), 2)
      // o período anterior de mesma duração (D4.1): out/2024 a set/2025
      expect(vgv.valor_anterior).toBeCloseTo(await contar(sql, ['2024-10-01', '2025-09-30', params[2]]), 2)
    }
  })

  it('com um mês selecionado, a variação compara com o mês anterior', async () => {
    const [ticket] = await rodar<Kpi>(db, 'visao-geral/kpi_ticket_medio', ['2026-09-01', '2026-09-30', null])
    const media = (inicio: string, fim: string) =>
      contar(`select avg(valor_venda)::float8 as n from adr.venda where data_venda between $1 and $2`, [inicio, fim])
    expect(ticket.valor).toBeCloseTo(await media('2026-09-01', '2026-09-30'), 2)
    expect(ticket.valor_anterior).toBeCloseTo(await media('2026-08-01', '2026-08-31'), 2)
  })

  it('preço por m² é a média do valor ÷ área das vendas do período', async () => {
    const [preco] = await rodar<Kpi>(db, 'visao-geral/kpi_preco_m2')
    const esperado = await contar(`
      select avg(v.valor_venda / u.area_privativa_m2)::float8 as n
      from adr.venda v join adr.unidade u on u.id = v.unidade_id
      where v.data_venda between '2025-10-01' and '2026-09-30'`)
    expect(preco.valor).toBeCloseTo(esperado, 0)
  })

  it('inadimplência é o vencido não pago ÷ o vencido, na data de corte', async () => {
    const [inad] = await rodar<Kpi>(db, 'visao-geral/kpi_inadimplencia')
    const esperado = await contar(`
      select (sum(saldo) filter (where vencida) / sum(valor) filter (where vencida))::float8 as n
      from adr.carteira_em(adr.data_corte())`)
    expect(inad.valor).toBeCloseTo(esperado, 6)
    expect(inad.valor).toBeGreaterThan(0)
    expect(inad.valor).toBeLessThan(1)
  })

  it('VSO fica entre 0 e 1', async () => {
    for (const params of filtros()) {
      const [vso] = await rodar<Kpi>(db, 'visao-geral/kpi_vso', params)
      expect(vso.valor).toBeGreaterThan(0)
      expect(vso.valor).toBeLessThanOrEqual(1)
    }
  })
})

describe('vendas mensais', () => {
  it('tem 12 meses no período padrão e a soma bate com a contagem direta', async () => {
    const meses = await rodar<Mes>(db, 'visao-geral/vendas_mensais')
    expect(meses.map((m) => m.mes)).toEqual([
      '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
      '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
    ])
    const total = await contar(`select count(*)::int as n from adr.venda where data_venda between '2025-10-01' and '2026-09-30'`)
    expect(meses.reduce((s, m) => s + m.vendas, 0)).toBe(total)
  })

  it('o Bessa, antes do lançamento (jan a jul/2025), tem 7 meses com zero', async () => {
    const meses = await rodar<Mes>(db, 'visao-geral/vendas_mensais', ['2025-01-01', '2025-07-31', 4])
    expect(meses).toHaveLength(7)
    expect(meses.every((m) => m.vendas === 0 && m.media_movel_3m === 0)).toBe(true)
  })

  it('a média móvel de 3 meses usa os 2 meses anteriores ao período', async () => {
    const meses = await rodar<Mes>(db, 'visao-geral/vendas_mensais', ['2025-12-01', '2026-09-30', null])
    const antes = await rodar<Mes>(db, 'visao-geral/vendas_mensais')  // out/2025 em diante
    const [out, nov, dez] = antes
    expect(meses[0].mes).toBe('2025-12')
    expect(meses[0].media_movel_3m).toBeCloseTo((out.vendas + nov.vendas + dez.vendas) / 3, 6)
  })

  it('a meta é a soma das metas dos empreendimentos no mês', async () => {
    const meses = await rodar<Mes>(db, 'visao-geral/vendas_mensais')
    const meta = await contar(`select sum(meta_unidades)::int as n from adr.meta_mensal where mes between '2025-10-01' and '2026-09-30'`)
    expect(meses.reduce((s, m) => s + m.meta, 0)).toBe(meta)
  })
})
