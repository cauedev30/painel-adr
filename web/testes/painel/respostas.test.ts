import { describe, expect, it } from 'vitest'
import { GLOSSARIO } from '../../src/glossario.ts'
import {
  KPIS, type LinhaEmpreendimento, lerKpi, respostaDistribuicao, respostaEmpreendimentos, respostaEstatisticas, respostaRitmo,
  respostaVendasMensais, respostaVistaMar,
} from '../../src/telas/respostas.ts'
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

describe('frases de Vendas e estoque', () => {
  const emp = (nome: string, unidades: number, estoque: number, vso: number | null, interessados = 0): LinhaEmpreendimento => ({
    empreendimento_id: 1, nome, slug: '', status: unidades > 0 ? 'em_obras' : 'pre_lancamento',
    unidades, vendidas: unidades - estoque, estoque, vso, vgv: 0, interessados,
  })

  it('empreendimentos: o de maior VSO e o de maior estoque; um só; nada lançado', () => {
    expect(respostaEmpreendimentos([emp('Mares A', 100, 20, 0.4), emp('Mares B', 100, 60, 0.2), emp('Mares C', 0, 0, null, 50)]))
      .toBe('O Mares A teve o maior VSO do período (40,0%), e o Mares B tem o maior estoque (60 unidades)')
    expect(respostaEmpreendimentos([emp('Mares A', 132, 38, 0.315)])).toBe('O Mares A tem 38 de 132 unidades à venda, com VSO de 31,5% no período')
    expect(respostaEmpreendimentos([emp('Mares Sense', 0, 0, null, 238)])).toBe('Nada lançado neste filtro; a lista de interesse tem 238 pessoas')
  })

  it('ritmo: compara os lançamentos aos 6 meses; antes disso, o que já vendeu', () => {
    const r = (nome: string, mes: number, p: number) => ({ empreendimento_id: 1, nome, mes_desde_lancamento: mes, vendidas_acumuladas: 0, pct_vendido: p })
    expect(respostaRitmo([r('Mares A', 6, 0.34), r('Mares B', 6, 0.57)])).toBe('Nos 6 primeiros meses, o Mares B vendeu 57% das unidades, o lançamento mais rápido')
    expect(respostaRitmo([r('Mares A', 1, 0.1), r('Mares A', 2, 0.15)])).toBe('O Mares A vendeu 15% das unidades em 2 meses')
  })

  it('distribuição: medianas e vendas fora da curva', () => {
    const c = (nome: string, mediana: number, outliers: number[]) => ({ empreendimento_id: 1, nome, minimo: 0, q1: 0, mediana, q3: 0, maximo: 0, outliers })
    expect(respostaDistribuicao([c('Mares A', 17433.41, []), c('Mares B', 16223.36, [21000])]))
      .toBe('A mediana vai de R$ 16.223 por m² no Mares B a R$ 17.433 no Mares A, e 1 venda fora da curva')
    expect(respostaDistribuicao([c('Mares A', 17000, [])])).toBe('Mediana de R$ 17.000 por m², e nenhuma venda fora da curva')
  })

  it('estatísticas e vista mar', () => {
    const vazio = { n: 0, media: null, mediana: null, moda: null, desvio_padrao: null, p25: null, p50: null, p75: null, p90: null }
    expect(respostaEstatisticas([vazio])).toBe('Sem vendas no período')
    expect(respostaEstatisticas([{ ...vazio, n: 72, media: 17240.98, mediana: 17275.75 }])).toBe('Metade das 72 vendas saiu acima de R$ 17.276 por m²; a média é R$ 17.241')
    expect(respostaVistaMar([
      { vista_mar: true, unidades: 132, vendas: 31, preco_m2_medio: 18192.77, pct_vendidas_6_meses: 0.462 },
      { vista_mar: false, unidades: 258, vendas: 41, preco_m2_medio: 16521.33, pct_vendidas_6_meses: 0.337 },
    ])).toBe('Com vista mar, o m² sai 10% mais caro, e 46% das unidades venderam em 6 meses, contra 34% sem vista')
  })

  it('o glossário explica todo termo da tabela de estatísticas', () => {
    expect(Object.keys(GLOSSARIO).sort()).toEqual(['desvio_padrao', 'media', 'mediana', 'moda', 'p25', 'p50', 'p75', 'p90'])
    for (const { explicacao } of Object.values(GLOSSARIO)) expect(explicacao.length).toBeGreaterThan(20)
  })
})
