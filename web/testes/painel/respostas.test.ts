import { describe, expect, it } from 'vitest'
import { respostaVendasMensais } from '../../src/telas/respostas.ts'
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
