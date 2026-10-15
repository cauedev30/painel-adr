import { describe, expect, it } from 'vitest'
import {
  MESES_DOS_DADOS, PADRAO, PRIMEIRO_MES, TELAS, ULTIMO_MES, escreverHash, lerHash, linkDoCartao, paramsDaRota, periodoAnterior,
} from '../../src/navegacao/rotas.ts'

describe('as telas', () => {
  it('são 6, com ids únicos, e a primeira é a visão geral', () => {
    expect(TELAS.map((t) => t.id)).toEqual(['visao-geral', 'vendas-estoque', 'funil-corretores', 'recebiveis', 'dados', 'console'])
    expect(TELAS.every((t) => t.nome && t.icone)).toBe(true)
  })
})

describe('lerHash e escreverHash', () => {
  it.each([
    '#/visao-geral?de=2025-10&ate=2026-09',
    '#/recebiveis?de=2026-01&ate=2026-09&emp=2',
    '#/console?de=2025-10&ate=2026-09&consulta=visao-geral%2Fvendas_mensais',
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
    expect(lerHash('#/console?consulta=dados%2Fder').extra).toEqual({ consulta: 'dados/der' })
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
