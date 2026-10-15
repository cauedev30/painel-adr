import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { abrirBanco, filtravel, lerSql, listarConsultas, rodar } from '../apoio/banco.ts'

let db: PGlite

beforeAll(async () => {
  db = await abrirBanco()
})

afterAll(async () => {
  await db?.close()
})

const EXEMPLOS = listarConsultas().filter((id) => id.startsWith('console/'))

describe('exemplos do console SQL', () => {
  it('são 5', () => {
    expect(EXEMPLOS).toHaveLength(5)
  })

  it.each(EXEMPLOS)('%s roda sem parâmetros e devolve linhas', async (id) => {
    expect(filtravel(lerSql(id))).toBe(false)
    const linhas = await rodar(db, id)
    expect(linhas.length).toBeGreaterThan(0)
  })
})
