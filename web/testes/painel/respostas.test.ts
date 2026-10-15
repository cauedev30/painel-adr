import { describe, expect, it } from 'vitest'
import { KPIS, lerKpi, respostaVendasMensais } from '../../src/telas/respostas.ts'
import { abrirBanco, rodar } from '../apoio/banco.ts'

const mes = (m: string, vendas: number, meta: number) => ({ mes: m, vendas, meta, media_movel_3m: 0 })

describe('frase-resposta das vendas mensais', () => {
  it('fala do último mês do período, contra a meta', () => {
    expect(respostaVendasMensais([mes('2026-08', 2, 8), mes('2026-09', 6, 8)])).toBe('Em set/2026 foram 6 vendas, 2 abaixo da meta')
    expect(respostaVendasMensais([mes('2025-10', 12, 10)])).toBe('Em out/2025 foram 12 vendas, 2 acima da meta')
    expect(respostaVendasMensais([mes('2025-10', 8, 8)])).toBe('Em out/2025 foram 8 vendas, bem na meta')
  })

  it('singular, zero e mês sem meta', () => {
    expect(respostaVendasMensais([mes('2026-01', 1, 4)])).toBe('Em jan/2026 foi 1 venda, 3 abaixo da meta')
    expect(respostaVendasMensais([mes('2025-07', 0, 0)])).toBe('Em jul/2025 não houve venda, e não havia meta')
    expect(respostaVendasMensais([mes('2025-07', 3, 0)])).toBe('Em jul/2025 foram 3 vendas, sem meta no mês')
  })

  it('com o banco de verdade e o filtro padrão, a frase bate com a última linha', async () => {
    const db = await abrirBanco()
    const linhas = await rodar<{ mes: string; vendas: number; meta: number; media_movel_3m: number }>(db, 'visao-geral/vendas_mensais')
    await db.close()
    const ultima = linhas.at(-1)!
    expect(ultima.mes).toBe('2026-09')
    expect(respostaVendasMensais(linhas)).toBe(`Em set/2026 foram ${ultima.vendas} vendas, ${ultima.meta - ultima.vendas} abaixo da meta`)
  })
})

describe('leitura dos KPIs', () => {
  const kpi = (id: string) => KPIS.find((k) => k.id === id)!

  it('VGV: valor compacto, variação relativa, subir é bom', () => {
    expect(lerKpi(kpi('vgv'), { valor: 25_184_918.87, valor_anterior: 22_420_000 }))
      .toEqual({ valor: 'R$ 25,2 mi', variacao: { seta: '▲', texto: '+12,3%' }, tom: 'bom' })
  })

  it('estoque e inadimplência: subir é ruim, e cair é bom', () => {
    expect(lerKpi(kpi('estoque'), { valor: 120, valor_anterior: 100 }))
      .toEqual({ valor: '120 unidades', variacao: { seta: '▲', texto: '+20,0%' }, tom: 'ruim' })
    expect(lerKpi(kpi('inadimplencia'), { valor: 0.0228, valor_anterior: 0.0334 }))
      .toEqual({ valor: '2,3%', variacao: { seta: '▼', texto: '-1,1 p.p.' }, tom: 'bom' })
  })

  it('VSO em pontos percentuais; preço/m² em reais sem centavos', () => {
    expect(lerKpi(kpi('vso'), { valor: 0.241, valor_anterior: 0.2 }).variacao).toEqual({ seta: '▲', texto: '+4,1 p.p.' })
    expect(lerKpi(kpi('preco_m2'), { valor: 17_212.4, valor_anterior: 17_212.4 }))
      .toEqual({ valor: 'R$ 17.212', variacao: { seta: '=', texto: '0,0%' }, tom: 'neutro' })
  })

  it('período sem venda: traço no valor, sem comparação, e nada quebrado', () => {
    expect(lerKpi(kpi('ticket_medio'), { valor: null, valor_anterior: 300_000 }))
      .toEqual({ valor: '—', variacao: { seta: '=', texto: 'sem vendas no período' }, tom: 'neutro' })
    expect(lerKpi(kpi('ticket_medio'), { valor: 300_000, valor_anterior: null }).variacao.texto).toBe('sem comparação')
  })

  it('os 6 KPIs da seção 6.1, cada um com a sua consulta', () => {
    expect(KPIS.map((k) => k.consulta)).toEqual([
      'visao-geral/kpi_vgv', 'visao-geral/kpi_vso', 'visao-geral/kpi_estoque',
      'visao-geral/kpi_ticket_medio', 'visao-geral/kpi_preco_m2', 'visao-geral/kpi_inadimplencia',
    ])
  })
})
