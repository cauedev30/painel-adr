import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { abrirBanco, rodar } from '../apoio/banco.ts'

type Coluna = {
  tabela: string; coluna: string; tipo: string; nulo: boolean; pk: boolean
  fk_tabela: string | null; fk_coluna: string | null; comentario: string | null
}
type Regra = { regra: string; origem: string; descricao: string; linhas_afetadas: number; acao: string }

const TABELAS = [
  'adr.cliente', 'adr.corretor', 'adr.empreendimento', 'adr.imobiliaria', 'adr.lead', 'adr.meta_mensal',
  'adr.pagamento', 'adr.parcela', 'adr.unidade', 'adr.venda', 'auditoria.quarentena', 'auditoria.relatorio_qualidade',
]

// as FKs da seção 3.3 da spec: coluna → tabela.coluna referenciada
const FKS = [
  'adr.cliente.lead_id → adr.lead.id',
  'adr.corretor.imobiliaria_id → adr.imobiliaria.id',
  'adr.lead.corretor_id → adr.corretor.id',
  'adr.lead.empreendimento_id → adr.empreendimento.id',
  'adr.meta_mensal.empreendimento_id → adr.empreendimento.id',
  'adr.pagamento.parcela_id → adr.parcela.id',
  'adr.parcela.venda_id → adr.venda.id',
  'adr.unidade.empreendimento_id → adr.empreendimento.id',
  'adr.venda.cliente_id → adr.cliente.id',
  'adr.venda.corretor_id → adr.corretor.id',
  'adr.venda.unidade_id → adr.unidade.id',
]

let db: PGlite
let der: Coluna[]

beforeAll(async () => {
  db = await abrirBanco()
  der = await rodar<Coluna>(db, 'dados/der')
})

afterAll(async () => {
  await db?.close()
})

describe('DER lido do catálogo do banco', () => {
  it('lista as 10 tabelas de adr e as 2 de auditoria, sem as views', () => {
    expect([...new Set(der.map((c) => c.tabela))]).toEqual(TABELAS)
  })

  it('tem as chaves estrangeiras da seção 3.3', () => {
    const fks = der.filter((c) => c.fk_tabela).map((c) => `${c.tabela}.${c.coluna} → ${c.fk_tabela}.${c.fk_coluna}`)
    expect(fks.sort()).toEqual(FKS)
  })

  it('marca as chaves primárias, a da meta mensal composta', () => {
    const pks = der.filter((c) => c.pk).map((c) => `${c.tabela}.${c.coluna}`)
    expect(pks).toContain('adr.venda.id')
    expect(pks.filter((p) => p.startsWith('adr.meta_mensal.'))).toEqual(['adr.meta_mensal.empreendimento_id', 'adr.meta_mensal.mes'])
    expect(pks.some((p) => p.startsWith('auditoria.relatorio_qualidade.'))).toBe(false)
  })

  it('traz o tipo, a nulidade e o comentário de cada coluna', () => {
    const coluna = (nome: string) => der.find((c) => `${c.tabela}.${c.coluna}` === nome)!
    expect(coluna('adr.unidade.area_privativa_m2')).toMatchObject({ tipo: 'numeric(6,2)', nulo: false })
    expect(coluna('adr.cliente.uf')).toMatchObject({ tipo: 'char(2)', nulo: true })
    expect(coluna('adr.lead.data_entrada').tipo).toBe('timestamp')
    expect(coluna('adr.venda.data_distrato').nulo).toBe(true)
    expect(der.filter((c) => c.tabela.startsWith('adr.') && !c.comentario)).toEqual([])
  })
})

describe('relatório de qualidade', () => {
  it('tem as linhas de auditoria.relatorio_qualidade', async () => {
    const regras = await rodar<Regra>(db, 'dados/qualidade')
    const r = await db.query<{ n: number; afetadas: number }>(
      `select count(*)::int as n, sum(linhas_afetadas)::int as afetadas from auditoria.relatorio_qualidade`)
    expect(regras).toHaveLength(r.rows[0].n)
    expect(regras.reduce((s, l) => s + l.linhas_afetadas, 0)).toBe(r.rows[0].afetadas)
    expect(Object.keys(regras[0])).toEqual(['regra', 'origem', 'descricao', 'linhas_afetadas', 'acao'])
  })
})
