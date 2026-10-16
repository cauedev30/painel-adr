import { describe, expect, it } from 'vitest'
import {
  ATRASO_DA_ENTRADA, ATRASO_MAXIMO, FIM_DA_ENTRADA, PASSO_DAS_BARRAS, animacaoDoRedimensionamento, animacaoDosGraficos,
} from '../../src/tema/echarts.ts'

describe('o movimento dos gráficos', () => {
  it('anima sempre, sem olhar o "reduzir movimento" do sistema (D14)', () => {
    expect(animacaoDosGraficos()).toMatchObject({ animation: true })
    expect(animacaoDosGraficos(true)).toMatchObject({ animation: true })
  })

  it('as barras crescem em 600 ms e, na troca de filtro, mudam em 400 ms', () => {
    expect(animacaoDosGraficos()).toMatchObject({
      animation: true, animationDuration: 600, animationEasing: 'cubicOut', animationDurationUpdate: 400,
    })
  })

  it('cada barra sai 30 ms depois da anterior, até o teto de 300 ms', () => {
    const atraso = animacaoDosGraficos().animationDelay as (i: number) => number
    expect([0, 1, 2, 3].map(atraso)).toEqual([0, 30, 60, 90])
    expect(atraso(10)).toBe(ATRASO_MAXIMO)
    expect(atraso(72)).toBe(ATRASO_MAXIMO)
    expect(PASSO_DAS_BARRAS * 10).toBe(ATRASO_MAXIMO)
  })

  it('a linha pede o atraso sem índice e sai junto com a primeira barra', () => {
    const atraso = animacaoDosGraficos().animationDelay as (i?: number | null) => number
    expect(atraso(undefined)).toBe(0)
    expect(atraso(null)).toBe(0)
  })

  it('ao entrar na tela, as barras esperam a entrada do cartão (320 ms), como a barra vendido × estoque', () => {
    const atraso = animacaoDosGraficos(true).animationDelay as (i?: number) => number
    expect([0, 1, 2].map(atraso)).toEqual([320, 350, 380])
    expect(atraso(72)).toBe(ATRASO_DA_ENTRADA + ATRASO_MAXIMO)
    expect(atraso(undefined)).toBe(ATRASO_DA_ENTRADA)
  })

  it('redimensionar no meio da entrada segue animado; depois, é imediato', () => {
    expect(FIM_DA_ENTRADA).toBe(320 + 300 + 600)
    expect(animacaoDoRedimensionamento(100)).toEqual({ animation: { duration: 600, easing: 'cubicOut' } })
    expect(animacaoDoRedimensionamento(FIM_DA_ENTRADA)).toBeUndefined()
    expect(animacaoDoRedimensionamento(Infinity)).toBeUndefined()
  })
})
