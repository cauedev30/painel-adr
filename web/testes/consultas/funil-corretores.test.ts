import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PARAMS_PADRAO, type Param, abrirBanco, rodar } from '../apoio/banco.ts'

type Etapa = { etapa: string; ordem: number; leads: number; conversao: number | null }
type Canal = { canal: string; leads: number; vendas: number; conversao: number }
type Corretor = {
  corretor_id: number; nome: string; imobiliaria: string | null; vendas: number; vgv: number
  posicao: number; posicao_anterior: number | null; variacao: number | null
}

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

describe('funil', () => {
  it('tem 4 etapas e só diminui', async () => {
    for (const params of filtros()) {
      const funil = await rodar<Etapa>(db, 'funil-corretores/funil', params)
      expect(funil.map((e) => e.etapa)).toEqual(['lead', 'visita', 'proposta', 'venda'])
      expect(funil.map((e) => e.ordem)).toEqual([1, 2, 3, 4])
      for (let i = 1; i < funil.length; i++) expect(funil[i].leads).toBeLessThanOrEqual(funil[i - 1].leads)
    }
  })

  it('a conversão é leads ÷ leads da etapa anterior', async () => {
    const funil = await rodar<Etapa>(db, 'funil-corretores/funil')
    expect(funil[0].conversao).toBeNull()
    for (let i = 1; i < funil.length; i++) expect(funil[i].conversao).toBeCloseTo(funil[i].leads / funil[i - 1].leads, 10)
  })

  it('a primeira etapa são os leads que entraram no período', async () => {
    const [lead] = await rodar<Etapa>(db, 'funil-corretores/funil')
    const r = await db.query<{ n: number }>(`
      select count(*)::int as n from adr.lead where data_entrada >= '2025-10-01' and data_entrada < '2026-10-01'`)
    expect(lead.leads).toBe(r.rows[0].n)
  })
})

describe('canais', () => {
  it('a soma dos leads por canal é a primeira etapa do funil', async () => {
    for (const params of filtros()) {
      const canais = await rodar<Canal>(db, 'funil-corretores/canais', params)
      const [lead] = await rodar<Etapa>(db, 'funil-corretores/funil', params)
      expect(canais.reduce((s, c) => s + c.leads, 0)).toBe(lead.leads)
      for (const c of canais) expect(c.conversao).toBeCloseTo(c.vendas / c.leads, 10)
    }
  })

  it('o canal de maior volume não é o de maior conversão (padrão plantado)', async () => {
    const canais = await rodar<Canal>(db, 'funil-corretores/canais')
    const maiorVolume = canais.reduce((a, b) => (b.leads > a.leads ? b : a))
    const maiorConversao = canais.reduce((a, b) => (b.conversao > a.conversao ? b : a))
    expect(canais[0]).toEqual(maiorVolume)  // ordenado pelo volume
    expect(maiorConversao.canal).not.toBe(maiorVolume.canal)
  })
})

describe('ranking de corretores', () => {
  it('a posição segue as vendas em ordem decrescente, com empate na mesma posição', async () => {
    const ranking = await rodar<Corretor>(db, 'funil-corretores/ranking_corretores')
    expect(ranking.length).toBeGreaterThan(1)
    for (const c of ranking) {
      expect(c.posicao).toBe(1 + ranking.filter((x) => x.vendas > c.vendas).length)
    }
    for (let i = 1; i < ranking.length; i++) expect(ranking[i].posicao).toBeGreaterThanOrEqual(ranking[i - 1].posicao)
  })

  it('a posição anterior é a do período anterior, e variacao = posicao_anterior − posicao', async () => {
    const ranking = await rodar<Corretor>(db, 'funil-corretores/ranking_corretores')
    const anterior = await rodar<Corretor>(db, 'funil-corretores/ranking_corretores', ['2024-10-01', '2025-09-30', null])
    const posicaoAntes = new Map(anterior.map((c) => [c.corretor_id, c.posicao]))
    expect(ranking.some((c) => c.posicao_anterior !== null)).toBe(true)
    for (const c of ranking) {
      expect(c.posicao_anterior).toBe(posicaoAntes.get(c.corretor_id) ?? null)
      expect(c.variacao).toBe(c.posicao_anterior === null ? null : c.posicao_anterior - c.posicao)
    }
  })

  it('a soma das vendas do ranking é o número de vendas do período', async () => {
    const ranking = await rodar<Corretor>(db, 'funil-corretores/ranking_corretores')
    const r = await db.query<{ n: number }>(`select count(*)::int as n from adr.venda where data_venda between '2025-10-01' and '2026-09-30'`)
    expect(ranking.reduce((s, c) => s + c.vendas, 0)).toBe(r.rows[0].n)
  })
})
