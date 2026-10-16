import { describe, expect, it } from 'vitest'
import { CONSULTAS, filtravel } from '../../src/banco/consultas.ts'
import { lerSql, listarConsultas } from '../apoio/banco.ts'

describe('catálogo de consultas do painel', () => {
  // as consultas que saíram do painel ficam só no repositório (a mesma lista do glob em consultas.ts)
  const FORA_DO_PAINEL = [
    'dados/der', 'visao-geral/kpi_preco_m2', 'vendas-estoque/preco_m2_estatisticas', 'vendas-estoque/vista_mar',
    'recebiveis/distratos_e_atraso',
  ]
  const DO_PAINEL = listarConsultas().filter((id) => !id.startsWith('console/') && !FORA_DO_PAINEL.includes(id))

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
