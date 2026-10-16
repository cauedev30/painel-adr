import { describe, expect, it } from 'vitest'
import { inteiro, moedaCompacta, mes } from '../../src/formatar.ts'
import { PADRAO, type Rota } from '../../src/navegacao/rotas.ts'
import {
  type EntradaPdf, agruparKpis, clarear, linhasDeKpis, nomeDoArquivo, paraOPapel, periodoPorExtenso, tabelaDasColunas,
  textoDaCelula, textoDaGeracao, textoDosFiltros,
} from '../../src/pdf/conteudo.ts'
import { PALETA } from '../../src/tema/paleta.ts'
import { pdfCanais, pdfRitmo, tabelaMapaCalor, tabelaRitmo } from '../../src/telas/pdf.ts'

const rota = (mudanca: Partial<Rota> = {}): Rota => ({ ...PADRAO, tela: 'recebiveis', ...mudanca })

describe('cabeçalho do PDF', () => {
  it('escreve o período por extenso, com o ano inteiro', () => {
    expect(periodoPorExtenso({ de: '2025-01', ate: '2025-03' })).toBe('jan 2025 – mar 2025')
    expect(periodoPorExtenso({ de: '2026-09', ate: '2026-09' })).toBe('set 2026')
  })

  it('junta período e empreendimento, por extenso', () => {
    expect(textoDosFiltros(rota(), true)).toBe('out 2025 – set 2026 · Todos os empreendimentos')
    expect(textoDosFiltros(rota({ de: '2025-01', ate: '2025-03', emp: 4 }), true)).toBe('jan 2025 – mar 2025 · Mares Bessa')
  })

  it('a tela sem filtro diz que é o histórico inteiro', () => {
    expect(textoDosFiltros(rota({ tela: 'dados' }), false)).toBe('Todo o histórico, sem filtro de período ou empreendimento')
  })

  it('diz até quando vão os dados e a hora de João Pessoa', () => {
    expect(textoDaGeracao(new Date('2026-10-16T17:32:00Z'))).toBe('Dados até 30/09/2026 · gerado em 16/10/2026 às 14:32')
  })
})

describe('nome do arquivo', () => {
  it('ADR - tela - período, sem acento nem símbolo', () => {
    expect(nomeDoArquivo('Recebíveis', rota(), true)).toBe('ADR - Recebiveis - out 2025 a set 2026.pdf')
    expect(nomeDoArquivo('Visão geral', rota({ de: '2026-09', ate: '2026-09' }), true)).toBe('ADR - Visao geral - set 2026.pdf')
  })

  it('leva o empreendimento quando ele está filtrado', () => {
    expect(nomeDoArquivo('Funil e corretores', rota({ emp: 2 }), true)).toBe('ADR - Funil e corretores - out 2025 a set 2026 - Mares Seaside.pdf')
  })

  it('o título do cartão perde a interrogação e é cortado numa palavra inteira', () => {
    const nome = nomeDoArquivo('A cada mês, entrou o dinheiro que as parcelas previam? E mais um pedaço longo', rota(), true)
    expect(nome).toBe('ADR - A cada mes, entrou o dinheiro que as parcelas previam - out 2025 a set 2026.pdf')
    expect(nome).not.toMatch(/[?/\\:*"<>|–·]/)
  })

  it('a tela sem filtro não leva período', () => {
    expect(nomeDoArquivo('Dados', rota({ tela: 'dados' }), false)).toBe('ADR - Dados.pdf')
  })
})

describe('tabela do PDF', () => {
  type Linha = { mes: string; recebido: number; obs: string | null }
  const colunas = [
    { chave: 'mes' as const, titulo: 'Mês', formato: mes },
    { chave: 'recebido' as const, titulo: 'Recebido', numerica: true, formato: moedaCompacta },
    { chave: 'obs' as const, titulo: 'Obs.' },
  ]

  it('escreve cada célula como o "ver como tabela"', () => {
    const t = tabelaDasColunas<Linha>([{ mes: '2026-09', recebido: 1_234_567, obs: null }, { mes: '2026-08', recebido: 850_000, obs: 'ok' }], colunas)
    expect(t.cabecalho).toEqual(['Mês', 'Recebido', 'Obs.'])
    expect(t.linhas).toEqual([['set/2026', 'R$ 1,2 mi', '—'], ['ago/2026', 'R$ 850 mil', 'ok']])
    expect(t.numericas).toEqual([false, true, false])
  })

  it('sem formato, o valor sai como veio', () => {
    expect(textoDaCelula({ chave: 'x', titulo: 'X' }, 12)).toBe('12')
    expect(textoDaCelula({ chave: 'x', titulo: 'X', formato: inteiro }, 1234)).toBe('1.234')
  })

  it('o mapa de calor vira empreendimento × faixa, com o total', () => {
    const t = tabelaMapaCalor([
      { empreendimento_id: 1, nome: 'Mares Cabo Branco', faixa: '1–30', ordem: 1, saldo: 120_000 },
      { empreendimento_id: 1, nome: 'Mares Cabo Branco', faixa: '31–60', ordem: 2, saldo: 0 },
      { empreendimento_id: 2, nome: 'Mares Seaside', faixa: '1–30', ordem: 1, saldo: 0 },
      { empreendimento_id: 2, nome: 'Mares Seaside', faixa: '31–60', ordem: 2, saldo: 2_500_000 },
    ])
    expect(t.cabecalho).toEqual(['Empreendimento', '1–30 dias', '31–60 dias', 'Total'])
    expect(t.linhas).toEqual([['Mares Cabo Branco', 'R$ 120 mil', '—', 'R$ 120 mil'], ['Mares Seaside', '—', 'R$ 2,5 mi', 'R$ 2,5 mi']])
    expect(t.numericas).toEqual([false, true, true, true])
  })

  it('o ritmo no PDF fica numa linha por lançamento: onde ele está hoje', () => {
    const linhas = [
      { empreendimento_id: 1, nome: 'Mares Cabo Branco', mes_desde_lancamento: 1, vendidas_acumuladas: 10, pct_vendido: 0.1 },
      { empreendimento_id: 1, nome: 'Mares Cabo Branco', mes_desde_lancamento: 2, vendidas_acumuladas: 25, pct_vendido: 0.25 },
      { empreendimento_id: 4, nome: 'Mares Bessa', mes_desde_lancamento: 1, vendidas_acumuladas: 51, pct_vendido: 0.5 },
    ]
    expect(tabelaRitmo(linhas).linhas).toEqual([['Mares Cabo Branco', '2', '25', '25%'], ['Mares Bessa', '1', '51', '50%']])
    const { opcao, altura } = pdfRitmo(linhas)
    expect(altura).toBe(180)
    expect(opcao.series).toHaveLength(2)
  })

  it('os canais no PDF: dois gráficos lado a lado, com o maior de cada um em cobre', () => {
    const { opcao } = pdfCanais([
      { canal: 'site', leads: 900, vendas: 9, conversao: 0.01 },
      { canal: 'indicacao', leads: 100, vendas: 10, conversao: 0.1 },
    ], 'indicacao')
    const [leads, conversao] = opcao.series as { data: { itemStyle: { color: string } }[] }[]
    expect(leads.data.map((d) => d.itemStyle.color)).toEqual([PALETA.cobre, PALETA.cinza])
    expect(conversao.data.map((d) => d.itemStyle.color)).toEqual([PALETA.cinza, PALETA.cobre])
  })
})

describe('gráfico no papel', () => {
  it('troca as cores do tema escuro em qualquer nível e mantém o cobre e as funções', () => {
    const formatter = (v: number) => String(v)
    const opcao = {
      textStyle: { color: PALETA.texto2 },
      series: [{ itemStyle: { color: PALETA.cobre }, label: { color: PALETA.texto, formatter }, data: [{ value: 1, itemStyle: { color: PALETA.cinza } }] }],
      splitLine: { lineStyle: { color: PALETA.borda.toUpperCase() } },
    }
    const clara = clarear(opcao)
    expect(clara.textStyle.color).toBe('#595959')
    expect(clara.series[0].itemStyle.color).toBe(PALETA.cobre)
    expect(clara.series[0].label.color).toBe('#262626')
    expect(clara.series[0].label.formatter).toBe(formatter)
    expect(clara.series[0].data[0].itemStyle.color).toBe('#a8a8a8')
    expect(clara.splitLine.lineStyle.color).toBe('#dcdcdc')
    // não mexe na opção do painel
    expect(opcao.textStyle.color).toBe(PALETA.texto2)
  })

  it('troca o que a fonte do PDF não tem', () => {
    expect(paraOPapel('≈ 15 mil leads')).toBe('~15 mil leads')
    expect(paraOPapel('◔  1–30 dias')).toBe('1–30 dias')
    expect(paraOPapel('antes → depois')).toBe('antes › depois')
    expect(paraOPapel('Recebíveis · 1º')).toBe('Recebíveis · 1º')
  })
})

describe('ordem do relatório', () => {
  const kpi = (id: string): EntradaPdf => ({ tipo: 'kpi', ancora: id, titulo: id, valor: '1', seta: '=', variacao: '', tom: 'neutro', contra: '', pronto: true })
  const cartao: EntradaPdf = { tipo: 'cartao', ancora: 'c', titulo: 'c', frase: '', opcao: null, altura: 280, tabela: null, pronto: true }

  it('os KPIs seguidos viram um bloco só', () => {
    const grupos = agruparKpis([kpi('a'), kpi('b'), cartao, kpi('c')])
    expect(grupos.map((g) => (Array.isArray(g) ? g.map((k) => k.ancora) : g.ancora))).toEqual([['a', 'b'], 'c', ['c']])
  })

  it('3 KPIs por linha, e a sobra de 2 numa linha de 2', () => {
    expect(linhasDeKpis(3)).toEqual([3])
    expect(linhasDeKpis(4)).toEqual([2, 2])
    expect(linhasDeKpis(5)).toEqual([3, 2])
    expect(linhasDeKpis(6)).toEqual([3, 3])
  })
})
