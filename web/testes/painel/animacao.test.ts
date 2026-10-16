import { describe, expect, it } from 'vitest'
import { ATRASO_MAXIMO, PASSO_DAS_BARRAS, animacaoDosGraficos } from '../../src/tema/echarts.ts'

describe('o movimento dos gráficos', () => {
  it('com "reduzir movimento" ligado, nada anima', () => {
    expect(animacaoDosGraficos(true)).toEqual({ animation: false })
  })

  it('as barras crescem em 600 ms e, na troca de filtro, mudam em 400 ms', () => {
    expect(animacaoDosGraficos(false)).toMatchObject({
      animation: true, animationDuration: 600, animationEasing: 'cubicOut', animationDurationUpdate: 400,
    })
  })

  it('cada barra sai 30 ms depois da anterior, até o teto de 300 ms', () => {
    const atraso = animacaoDosGraficos(false).animationDelay as (i: number) => number
    expect([0, 1, 2, 3].map(atraso)).toEqual([0, 30, 60, 90])
    expect(atraso(10)).toBe(ATRASO_MAXIMO)
    expect(atraso(72)).toBe(ATRASO_MAXIMO)
    expect(PASSO_DAS_BARRAS * 10).toBe(ATRASO_MAXIMO)
  })
})
