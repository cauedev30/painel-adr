import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PALETA, RAMPA_ATRASO, variavelCss } from '../../src/tema/paleta.ts'

const TOKENS = readFileSync(fileURLToPath(new URL('../../src/estilos/tokens.css', import.meta.url)), 'utf-8')

/** Luminância relativa da WCAG 2.x. */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

describe('contraste WCAG', () => {
  it('a fórmula confere com valores conhecidos', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it.each(['fundo', 'superficie', 'superficie2'] as const)('texto e texto2 sobre %s passam de 4,5 (AA)', (fundo) => {
    expect(contraste(PALETA.texto, PALETA[fundo])).toBeGreaterThanOrEqual(4.5)
    expect(contraste(PALETA.texto2, PALETA[fundo])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['cobre', 'cobreForte', 'cinza', 'dourado', 'atraso1', 'atraso2', 'atraso3', 'atraso4'] as const)(
    '%s sobre a superfície passa de 3 (marca de gráfico e foco)', (cor) => {
      expect(contraste(PALETA[cor], PALETA.superficie)).toBeGreaterThanOrEqual(3)
    })
})

describe('rampa das faixas de atraso', () => {
  it('vai do mais claro (1–30 dias) ao mais intenso (mais de 90), com luminância sempre caindo', () => {
    expect(RAMPA_ATRASO).toHaveLength(4)
    for (let i = 1; i < RAMPA_ATRASO.length; i++) {
      expect(luminancia(RAMPA_ATRASO[i])).toBeLessThan(luminancia(RAMPA_ATRASO[i - 1]))
    }
  })
})

describe('tokens.css', () => {
  it('converte o nome da cor no nome da variável CSS', () => {
    expect(variavelCss('superficie2')).toBe('--superficie-2')
    expect(variavelCss('cobreForte')).toBe('--cobre-forte')
    expect(variavelCss('atraso4')).toBe('--atraso-4')
  })

  it.each(Object.entries(PALETA))('tem a cor %s igual à do paleta.ts', (nome, hex) => {
    expect(TOKENS).toContain(`${variavelCss(nome)}: ${hex};`)
  })

  it('tem as duas fontes', () => {
    expect(TOKENS).toMatch(/--fonte-titulo: 'Lexend Zetta'/)
    expect(TOKENS).toMatch(/--fonte-texto: 'Lexend Deca'/)
  })
})
