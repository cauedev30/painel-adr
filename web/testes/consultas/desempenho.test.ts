import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { abrirBanco, listarConsultas, rodar } from '../apoio/banco.ts'

// O painel roda várias consultas a cada troca de filtro; cada uma precisa ser rápida no navegador
const LIMITE_MS = 300

let db: PGlite

beforeAll(async () => {
  db = await abrirBanco()
})

afterAll(async () => {
  await db?.close()
})

describe('desempenho', () => {
  // a mais rápida de 3 execuções depois do aquecimento: os testes rodam em paralelo, e um pico de
  // processador de outro arquivo não deve reprovar uma consulta rápida; a lenta é lenta nas 3
  it.each(listarConsultas())(`%s roda em menos de ${LIMITE_MS} ms depois do aquecimento`, async (id) => {
    await rodar(db, id)  // aquecimento: o primeiro uso planeja a consulta e carrega as páginas
    const tempos: number[] = []
    for (let i = 0; i < 3; i++) {
      const inicio = performance.now()
      await rodar(db, id)
      tempos.push(performance.now() - inicio)
    }
    expect(Math.min(...tempos)).toBeLessThan(LIMITE_MS)
  })
})
