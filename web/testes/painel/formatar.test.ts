import { describe, expect, it } from 'vitest'
import { data, inteiro, mes, moeda, moedaCompacta, pct, variacao } from '../../src/formatar.ts'

describe('moedaCompacta', () => {
  it.each([
    [12_400_000, 'R$ 12,4 mi'],
    [25_184_918.87, 'R$ 25,2 mi'],
    [850_000, 'R$ 850 mil'],
    [312, 'R$ 312'],
    [0, 'R$ 0'],
    [999_400, 'R$ 999 mil'],
    [999_600, 'R$ 1,0 mi'],  // 999,6 mil arredondaria para "1.000 mil"
    [999.6, 'R$ 1 mil'],
    [-850_000, '-R$ 850 mil'],
    [2_500_000_000, 'R$ 2,5 bi'],
  ])('%d → %s', (valor, texto) => {
    expect(moedaCompacta(valor)).toBe(texto)
  })

  it('o espaço depois de R$ é um espaço comum, não o não separável do Intl', () => {
    expect(moedaCompacta(312)[2]).toBe(' ')
    expect(moeda(312)[2]).toBe(' ')
  })
})

describe('moeda, pct e inteiro', () => {
  it('moeda com centavos', () => {
    expect(moeda(312_450)).toBe('R$ 312.450,00')
    expect(moeda(-850.5)).toBe('-R$ 850,50')
    expect(moeda(0)).toBe('R$ 0,00')
  })

  it('porcentagem a partir da fração', () => {
    expect(pct(0.081)).toBe('8,1%')
    expect(pct(0.37305)).toBe('37,3%')
    expect(pct(0.0744, 2)).toBe('7,44%')
    expect(pct(1)).toBe('100,0%')
    expect(pct(0)).toBe('0,0%')
    expect(pct(-0.05)).toBe('-5,0%')
  })

  it('inteiro com ponto de milhar', () => {
    expect(inteiro(1234)).toBe('1.234')
    expect(inteiro(15_842)).toBe('15.842')
    expect(inteiro(0)).toBe('0')
    expect(inteiro(-1234)).toBe('-1.234')
  })
})

describe('datas', () => {
  it('data em dd/mm/aaaa, sem cair no dia anterior pelo fuso', () => {
    expect(data('2026-09-30')).toBe('30/09/2026')
    expect(data(new Date('2026-09-30T00:00:00.000Z'))).toBe('30/09/2026')  // como o PGlite devolve date
    expect(data('2024-02-29')).toBe('29/02/2024')
  })

  it('mês abreviado sem ponto', () => {
    expect(mes('2026-09')).toBe('set/2026')
    expect(mes('2025-01')).toBe('jan/2025')
    expect(mes('2023-12')).toBe('dez/2023')
  })
})

describe('variacao', () => {
  it('relativa ao período anterior, com seta', () => {
    expect(variacao(112.3, 100)).toEqual({ seta: '▲', texto: '+12,3%' })
    expect(variacao(96, 100)).toEqual({ seta: '▼', texto: '-4,0%' })
    expect(variacao(100, 100)).toEqual({ seta: '=', texto: '0,0%' })
  })

  it('o que arredonda para zero fica igual', () => {
    expect(variacao(100.04, 100)).toEqual({ seta: '=', texto: '0,0%' })
  })

  it('anterior zero vira "novo", e anterior negativo usa o módulo', () => {
    expect(variacao(5, 0)).toEqual({ seta: '▲', texto: 'novo' })
    expect(variacao(0, 0)).toEqual({ seta: '=', texto: '0,0%' })
    expect(variacao(-50, -100)).toEqual({ seta: '▲', texto: '+50,0%' })
  })

  it('sem período anterior não há comparação', () => {
    expect(variacao(5, null)).toEqual({ seta: '=', texto: 'sem comparação' })
  })

  it('em pontos percentuais, para KPI que já é fração (inadimplência, VSO)', () => {
    expect(variacao(0.02287, 0.0334, 'pontos')).toEqual({ seta: '▼', texto: '-1,1 p.p.' })
    expect(variacao(0.0745, 0.0745, 'pontos')).toEqual({ seta: '=', texto: '0,0 p.p.' })
    expect(variacao(0.373, 0.336, 'pontos')).toEqual({ seta: '▲', texto: '+3,7 p.p.' })
    expect(variacao(0.2, 0, 'pontos')).toEqual({ seta: '▲', texto: '+20,0 p.p.' })
  })
})
