import { describe, expect, it } from 'vitest'
import {
  KPIS, type LinhaEmpreendimento, type LinhaRanking, canalQueMaisConverte, lerKpi, respostaCanais, respostaEmpreendimentos, respostaRitmo,
  KPIS_RECEBIVEIS, respostaQualidade, textoDaComparacao, respostaFaixas, respostaFunil, respostaInadDesconto, respostaInadEmpreendimento,
  respostaMapaCalor, respostaPrevistoRecebido, respostaRanking, respostaVendasMensais, variacaoDePosicao,
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

  it('VSO em pontos percentuais; valor igual ao anterior é neutro', () => {
    expect(lerKpi(kpi('vso'), { valor: 0.241, valor_anterior: 0.2 }).variacao).toEqual({ seta: '▲', texto: '+4,1 p.p.' })
    expect(lerKpi(kpi('ticket_medio'), { valor: 300_000, valor_anterior: 300_000 }))
      .toEqual({ valor: 'R$ 300 mil', variacao: { seta: '=', texto: '0,0%' }, tom: 'neutro' })
  })

  it('período sem venda: traço no valor, sem comparação, e nada quebrado', () => {
    expect(lerKpi(kpi('ticket_medio'), { valor: null, valor_anterior: 300_000 }))
      .toEqual({ valor: '—', variacao: { seta: '=', texto: 'sem vendas no período' }, tom: 'neutro' })
    expect(lerKpi(kpi('ticket_medio'), { valor: 300_000, valor_anterior: null }).variacao.texto).toBe('sem comparação')
  })

  it('os 5 KPIs da seção 6.1, cada um com a sua consulta', () => {
    expect(KPIS.map((k) => k.consulta)).toEqual([
      'visao-geral/kpi_vgv', 'visao-geral/kpi_vso', 'visao-geral/kpi_estoque',
      'visao-geral/kpi_ticket_medio', 'visao-geral/kpi_inadimplencia',
    ])
  })

  it('VGV e VSO trazem a sigla por extenso', () => {
    expect(KPIS.filter((k) => k.extenso).map((k) => [k.id, k.extenso])).toEqual([
      ['vgv', 'Valor Geral de Vendas'], ['vso', 'Vendas sobre Oferta'],
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

})

describe('frases de Funil e corretores', () => {
  it('funil: quantos viraram venda e o maior gargalo', () => {
    expect(respostaFunil([
      { etapa: 'lead', ordem: 1, leads: 4656, conversao: null },
      { etapa: 'visita', ordem: 2, leads: 436, conversao: 0.0936 },
      { etapa: 'proposta', ordem: 3, leads: 145, conversao: 0.3326 },
      { etapa: 'venda', ordem: 4, leads: 53, conversao: 0.3655 },
    ])).toBe('Dos 4.656 leads do período, 53 viraram venda (1,1%); o maior gargalo é de lead para visita (9,4%)')
    expect(respostaFunil([{ etapa: 'lead', ordem: 1, leads: 0, conversao: null }])).toBe('Nenhum lead entrou no período')
  })

  it('canais: volume contra conversão, só entre canais com volume', () => {
    const c = (canal: string, leads: number, vendas: number) => ({ canal, leads, vendas, conversao: vendas / leads })
    const linhas = [c('instagram', 800, 4), c('indicacao', 200, 10), c('evento', 5, 3)]
    expect(canalQueMaisConverte(linhas)!.canal).toBe('indicacao')
    expect(respostaCanais(linhas)).toBe('O Instagram traz 80% dos leads e converte 0,5%; quem mais converte é a indicação, com 5,0%')
    expect(respostaCanais([c('site', 100, 5), c('tiktok', 50, 0)])).toBe('O site traz 67% dos leads e também é o que mais converte (5,0%)')
    expect(respostaCanais([c('site', 100, 0)])).toBe('O site traz 100% dos leads, e nenhum canal com volume chegou à venda')
  })

  const r = (nome: string, posicao: number, anterior: number | null, vendas = 3): LinhaRanking => ({
    corretor_id: 1, nome, imobiliaria: null, vendas, vgv: 1_000_000, posicao, posicao_anterior: anterior,
    variacao: anterior === null ? null : anterior - posicao,
  })

  it('variação de posição: subiu, caiu, igual e novo', () => {
    expect(variacaoDePosicao(r('A', 3, 5))).toEqual({ seta: '▲', texto: '2', descricao: 'subiu 2 posições', tom: 'bom' })
    expect(variacaoDePosicao(r('A', 6, 5))).toEqual({ seta: '▼', texto: '1', descricao: 'caiu 1 posição', tom: 'ruim' })
    expect(variacaoDePosicao(r('A', 1, 1)).descricao).toBe('mesma posição')
    expect(variacaoDePosicao(r('A', 4, null)).texto).toBe('novo')
  })

  it('ranking: o líder e quem mais subiu; empate no topo', () => {
    expect(respostaRanking([r('Kaique Mendes', 1, 1, 12), r('Luísa Lopes', 3, 5), r('Luiza das Neves', 6, 14)]))
      .toBe('Kaique Mendes lidera com 12 vendas (R$ 1,0 mi); quem mais subiu foi Luiza das Neves, 8 posições')
    expect(respostaRanking([r('A', 1, null, 2), r('B', 1, null, 2)])).toBe('2 corretores dividem o 1º lugar, com 2 vendas cada')
  })
})

describe('frases de Recebíveis', () => {
  it('os 3 KPIs, com a inadimplência reusando a consulta da visão geral', () => {
    expect(KPIS_RECEBIVEIS.map((k) => k.consulta)).toEqual(['recebiveis/kpi_a_receber_12m', 'recebiveis/kpi_recebido_mes', 'visao-geral/kpi_inadimplencia'])
    expect(KPIS_RECEBIVEIS[1].comparacao).toBe('mes')
  })

  it('previsto × recebido: o total do período e o último mês', () => {
    expect(respostaPrevistoRecebido([
      { mes: '2026-08', previsto: 500_000, recebido: 600_000 },
      { mes: '2026-09', previsto: 500_000, recebido: 480_000 },
    ])).toBe('No período entrou R$ 1,1 mi, 108% do previsto; em set/2026, 96%')
    expect(respostaPrevistoRecebido([{ mes: '2026-09', previsto: 0, recebido: 0 }])).toBe('Nenhuma parcela vencia no período')
  })

  it('faixas: a maior faixa e o total', () => {
    const f = (faixa: string, ordem: number, saldo: number) => ({ faixa, ordem, saldo, parcelas: 1 })
    expect(respostaFaixas([f('1–30', 1, 100_000), f('31–60', 2, 50_000), f('61–90', 3, 50_000), f('mais de 90', 4, 600_000)]))
      .toBe('R$ 600 mil, 75% do atraso, está há mais de 90 dias; o total em atraso é R$ 800 mil')
    expect(respostaFaixas([f('1–30', 1, 300), f('mais de 90', 4, 100)])).toBe('R$ 300, 75% do atraso, está entre 1–30 dias; o total em atraso é R$ 400')
    expect(respostaFaixas([f('1–30', 1, 0)])).toBe('Nenhuma parcela em atraso no fim do período')
  })

  it('mapa de calor: a célula maior', () => {
    expect(respostaMapaCalor([
      { empreendimento_id: 1, nome: 'Mares A', faixa: 'mais de 90', ordem: 4, saldo: 116_000 },
      { empreendimento_id: 2, nome: 'Mares B', faixa: 'mais de 90', ordem: 4, saldo: 418_000 },
    ])).toBe('O dinheiro mais parado está no Mares B: R$ 418 mil em atraso de mais de 90 dias')
  })

  it('inadimplência por empreendimento e por desconto', () => {
    const e = (nome: string, inadimplencia: number) => ({ empreendimento_id: 1, nome, inadimplencia })
    expect(respostaInadEmpreendimento([e('Mares A', 0.0745), e('Mares B', 0.0305), e('Mares C', 0.0053)]))
      .toBe('No Mares A, 7,5% do que venceu não foi pago; nos outros, 0,5% a 3,1%')
    expect(respostaInadEmpreendimento([e('Mares A', 0.0745)])).toBe('No Mares A, 7,5% do que venceu não foi pago')
    const d = (faixa_desconto: string, ordem: number, inadimplencia: number | null) => ({ faixa_desconto, ordem, vendas: 1, inadimplencia })
    expect(respostaInadDesconto([d('0–3%', 1, 0.024), d('3–8%', 2, 0.0129), d('8% ou mais', 3, 0.0685)]))
      .toBe('Nas vendas com desconto de 8% ou mais, 6,9% do vencido está em aberto, contra 2,4% nas de até 3%')
    expect(respostaInadDesconto([d('0–3%', 1, null)])).toBe('Sem parcela vencida neste filtro')
  })
})

describe('texto da comparação dos KPIs', () => {
  const rota = { tela: 'visao-geral' as const, de: '2025-10', ate: '2026-09', emp: null, extra: {} }
  const kpi = (id: string) => [...KPIS, ...KPIS_RECEBIVEIS].find((k) => k.id === id)!

  it('período anterior, mês anterior e fim do período anterior', () => {
    expect(textoDaComparacao(kpi('vgv'), rota)).toBe('out/2024–set/2025')
    expect(textoDaComparacao(kpi('recebido_mes'), rota)).toBe('ago/2026')
    expect(textoDaComparacao(kpi('estoque'), rota)).toBe('fim de set/2025')
    expect(textoDaComparacao(kpi('inadimplencia'), rota)).toBe('fim de set/2025')
    expect(textoDaComparacao(kpi('a_receber_12m'), rota)).toBe('fim de set/2025')
    expect(textoDaComparacao(kpi('vgv'), { ...rota, de: '2026-09' })).toBe('ago/2026')
  })
})

describe('frases de Dados', () => {
  it('qualidade: o total, a quarentena e a cascata', () => {
    const q = (regra: string, linhas_afetadas: number, acao: string) => ({ regra, origem: 'x', descricao: 'x', linhas_afetadas, acao })
    expect(respostaQualidade([q('R1', 634, 'mesclado'), q('R4', 4, 'quarentena'), q('R4', 42, 'cascata'), q('R7', 2, 'quarentena')]))
      .toBe('O pipeline tratou 682 linhas em 3 regras; 6 foram para a quarentena e 42 saíram com elas, em cascata')
    expect(respostaQualidade([q('R3', 10, 'corrigido')])).toBe('O pipeline tratou 10 linhas em 1 regra; nenhuma foi para a quarentena')
  })
})
