import { describe, expect, it } from 'vitest'
import {
  ANOS_DOS_DADOS, ATALHOS_DE_PERIODO, MESES_DOS_DADOS, PADRAO, PRIMEIRO_MES, TELAS, ULTIMO_MES, atalhoAtivo, escreverHash, lerHash, linkDoCartao,
  mesNosDados, mesesDoAno, ordenarIntervalo, paramsDaRota, periodoAnterior, posicaoNoIntervalo, resumoDoPeriodo,
} from '../../src/navegacao/rotas.ts'

describe('as telas', () => {
  it('são 5, com ids únicos, e a primeira é a visão geral', () => {
    expect(TELAS.map((t) => t.id)).toEqual(['visao-geral', 'vendas-estoque', 'funil-corretores', 'recebiveis', 'dados'])
    expect(TELAS.every((t) => t.nome && t.icone)).toBe(true)
  })
})

describe('lerHash e escreverHash', () => {
  it.each([
    '#/visao-geral?de=2025-10&ate=2026-09',
    '#/recebiveis?de=2026-01&ate=2026-09&emp=2',
    '#/dados?de=2025-10&ate=2026-09',
  ])('ida e volta: %s', (hash) => {
    expect(escreverHash(lerHash(hash))).toBe(hash)
  })

  it('hash vazio é a visão geral com os últimos 12 meses (D4.2)', () => {
    for (const hash of ['', '#', '#/']) {
      expect(lerHash(hash)).toEqual({ tela: 'visao-geral', de: '2025-10', ate: '2026-09', emp: null, extra: {} })
    }
    expect(PADRAO).toEqual({ tela: 'visao-geral', de: '2025-10', ate: '2026-09', emp: null, extra: {} })
  })

  it('tela desconhecida volta à visão geral e mantém os filtros', () => {
    expect(lerHash('#/nada?de=2026-01&ate=2026-03&emp=3')).toMatchObject({ tela: 'visao-geral', de: '2026-01', ate: '2026-03', emp: 3 })
    // o console saiu do painel; um link antigo abre a visão geral
    expect(lerHash('#/console?de=2026-01&ate=2026-03')).toMatchObject({ tela: 'visao-geral', de: '2026-01', ate: '2026-03' })
  })

  it('valor inválido volta ao padrão', () => {
    expect(lerHash('#/dados?de=2026-13&ate=abc&emp=99')).toMatchObject({ tela: 'dados', de: '2025-10', ate: '2026-09', emp: null })
    expect(lerHash('#/dados?emp=abc')).toMatchObject({ emp: null })
    // fora dos dados (jan/2023 a set/2026)
    expect(lerHash('#/dados?de=2019-01&ate=2027-01')).toMatchObject({ de: '2025-10', ate: '2026-09' })
  })

  it('de depois de ate é trocado', () => {
    expect(lerHash('#/visao-geral?de=2026-09&ate=2026-01')).toMatchObject({ de: '2026-01', ate: '2026-09' })
  })

  it('guarda os outros parâmetros em extra', () => {
    expect(lerHash('#/recebiveis?cartao=distratos').extra).toEqual({ cartao: 'distratos' })
  })
})

describe('os meses do filtro', () => {
  it('vão do primeiro ao último mês dos dados, sem pular nenhum', () => {
    expect(MESES_DOS_DADOS[0]).toBe(PRIMEIRO_MES)
    expect(MESES_DOS_DADOS.at(-1)).toBe(ULTIMO_MES)
    expect(new Set(MESES_DOS_DADOS).size).toBe(MESES_DOS_DADOS.length)
    expect(MESES_DOS_DADOS).toContain('2024-02')
  })
})

describe('o botão do período', () => {
  it('os atalhos: últimos 12 meses (o padrão), este ano e tudo', () => {
    expect(ATALHOS_DE_PERIODO.map(({ id, de, ate }) => [id, de, ate])).toEqual([
      ['12m', '2025-10', '2026-09'], ['ano', '2026-01', '2026-09'], ['tudo', PRIMEIRO_MES, ULTIMO_MES],
    ])
    expect(atalhoAtivo(PADRAO)).toBe('12m')
  })

  it('o atalho ativo é o que bate com o período; à mão, nenhum', () => {
    expect(atalhoAtivo(lerHash('#/visao-geral?de=2023-01&ate=2026-09'))).toBe('tudo')
    expect(atalhoAtivo(lerHash('#/visao-geral?de=2026-01&ate=2026-09'))).toBe('ano')
    expect(atalhoAtivo(lerHash('#/visao-geral?de=2026-02&ate=2026-09'))).toBeNull()
  })

  it('o resumo: "out 25 – set 26"; um mês só, sem traço', () => {
    expect(resumoDoPeriodo(PADRAO)).toBe('out 25 – set 26')
    expect(resumoDoPeriodo(lerHash('#/visao-geral?de=2026-09&ate=2026-09'))).toBe('set 26')
  })
})

describe('a grade de meses do filtro', () => {
  it('os anos dos dados e os 12 meses de cada um', () => {
    expect(ANOS_DOS_DADOS).toEqual([2023, 2024, 2025, 2026])
    expect(mesesDoAno(2026)).toHaveLength(12)
    expect(mesesDoAno(2026).slice(0, 2)).toEqual(['2026-01', '2026-02'])
    expect(mesesDoAno(2026).at(-1)).toBe('2026-12')
  })

  it('o mês fora dos dados fica apagado', () => {
    expect(mesNosDados('2026-09')).toBe(true)
    expect(mesNosDados('2026-10')).toBe(false)
    expect(mesNosDados('2022-12')).toBe(false)
  })

  it('a posição de cada mês no intervalo', () => {
    expect(['2025-01', '2025-02', '2025-03', '2025-04'].map((m) => posicaoNoIntervalo(m, '2025-01', '2025-03')))
      .toEqual(['inicio', 'meio', 'fim', null])
    expect(posicaoNoIntervalo('2025-05', '2025-05', '2025-05')).toBe('unico')
  })

  it('os dois cliques viram de–até, o menor primeiro', () => {
    expect(ordenarIntervalo('2025-03', '2025-01')).toEqual({ de: '2025-01', ate: '2025-03' })
    expect(ordenarIntervalo('2025-01', '2025-03')).toEqual({ de: '2025-01', ate: '2025-03' })
  })
})

describe('parâmetros das consultas', () => {
  it('início no dia 1 e fim no último dia do mês', () => {
    expect(paramsDaRota(lerHash(''))).toEqual(['2025-10-01', '2026-09-30', null])
    expect(paramsDaRota(lerHash('#/visao-geral?de=2024-01&ate=2024-02&emp=4'))).toEqual(['2024-01-01', '2024-02-29', 4])
    expect(paramsDaRota(lerHash('#/visao-geral?de=2025-02&ate=2025-02'))).toEqual(['2025-02-01', '2025-02-28', null])
  })

  it('o período anterior tem a mesma duração (D4.1)', () => {
    expect(periodoAnterior(lerHash(''))).toEqual({ de: '2024-10', ate: '2025-09' })
    expect(periodoAnterior(lerHash('#/visao-geral?de=2026-09&ate=2026-09'))).toEqual({ de: '2026-08', ate: '2026-08' })
    expect(periodoAnterior(lerHash('#/visao-geral?de=2026-01&ate=2026-03'))).toEqual({ de: '2025-10', ate: '2025-12' })
  })
})

describe('linkDoCartao', () => {
  it('leva para o cartão de outra tela com os mesmos filtros, e a ida e volta preserva o cartão', () => {
    const rota = { ...PADRAO, emp: 2, extra: { consulta: 'x' } }
    const link = linkDoCartao(rota, 'recebiveis', 'distratos')
    expect(link).toBe('#/recebiveis?de=2025-10&ate=2026-09&emp=2&cartao=distratos')
    expect(lerHash(link)).toEqual({ tela: 'recebiveis', de: '2025-10', ate: '2026-09', emp: 2, extra: { cartao: 'distratos' } })
  })
})
