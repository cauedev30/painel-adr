import { describe, expect, it } from 'vitest'
import { CONSULTAS, filtravel } from '../../src/banco/consultas.ts'
import { lerSql, listarConsultas } from '../apoio/banco.ts'

describe('catálogo de consultas do painel', () => {
  // os exemplos de console/ e o dados/der ficam só no repositório: o console e o DER saíram do painel
  const DO_PAINEL = listarConsultas().filter((id) => !id.startsWith('console/') && id !== 'dados/der')

  it('tem exatamente os arquivos de sql/consultas/ que o painel usa, com o id tela/cartao', () => {
    expect(Object.keys(CONSULTAS).sort()).toEqual(DO_PAINEL)
  })

  it('o texto de cada consulta é o do arquivo, cabeçalho incluído', () => {
    for (const id of DO_PAINEL) expect(CONSULTAS[id]).toBe(lerSql(id))
  })

  it('filtravel diz se a consulta recebe o período e o empreendimento', () => {
    expect(filtravel('visao-geral/vendas_mensais')).toBe(true)
    expect(filtravel('recebiveis/faixas_atraso')).toBe(true)
    expect(filtravel('dados/der')).toBe(false)
  })
})
