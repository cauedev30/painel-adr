import { expect, it } from 'vitest'
import { EMPREENDIMENTOS } from '../../src/empreendimentos.ts'
import { abrirBanco } from '../apoio/banco.ts'

it('a lista do filtro é a mesma de adr.empreendimento', async () => {
  const db = await abrirBanco()
  const r = await db.query<{ id: number; nome: string; slug: string }>('select id, nome, slug from adr.empreendimento order by id')
  await db.close()
  expect(r.rows).toEqual(EMPREENDIMENTOS.map(({ id, nome, slug }) => ({ id, nome, slug })))
})
