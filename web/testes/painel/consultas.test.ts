import { describe, expect, it } from 'vitest'
import { CONSULTAS, filtravel } from '../../src/banco/consultas.ts'
import { lerSql, listarConsultas } from '../apoio/banco.ts'

describe('catálogo de consultas do painel', () => {
  it('tem exatamente os arquivos de sql/consultas/, com o id tela/cartao', () => {
    expect(Object.keys(CONSULTAS).sort()).toEqual(listarConsultas())
  })

  it('o texto de cada consulta é o do arquivo, cabeçalho incluído (o "Ver SQL" mostra o que roda)', () => {
    for (const id of listarConsultas()) expect(CONSULTAS[id]).toBe(lerSql(id))
  })

  it('filtravel diz se a consulta recebe o período e o empreendimento', () => {
    expect(filtravel('visao-geral/vendas_mensais')).toBe(true)
    expect(filtravel('recebiveis/faixas_atraso')).toBe(true)
    expect(filtravel('dados/der')).toBe(false)
    expect(filtravel('console/01_maiores_vendas')).toBe(false)
  })
})
