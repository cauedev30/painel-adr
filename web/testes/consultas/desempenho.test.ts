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
  it.each(listarConsultas())(`%s roda em menos de ${LIMITE_MS} ms depois do aquecimento`, async (id) => {
    await rodar(db, id)  // aquecimento: o primeiro uso planeja a consulta e carrega as páginas
    const inicio = performance.now()
    await rodar(db, id)
    expect(performance.now() - inicio).toBeLessThan(LIMITE_MS)
  })
})
