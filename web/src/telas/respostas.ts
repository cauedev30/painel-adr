// As frases-resposta dos cartões (seção 6.2): calculadas das linhas da consulta, nunca escritas à mão.
// Funções puras, testadas em web/testes/painel/respostas.test.ts.
import { inteiro, mes } from '../formatar.ts'

export type MesDeVendas = { mes: string; vendas: number; meta: number; media_movel_3m: number }

/** "Em set/2026 foram 6 vendas, 2 abaixo da meta": o último mês do período contra a meta dele. */
export function respostaVendasMensais(linhas: MesDeVendas[]): string {
  const { mes: m, vendas, meta } = linhas[linhas.length - 1]
  const quando = `Em ${mes(m)}`
  if (vendas === 0 && meta === 0) return `${quando} não houve venda, e não havia meta`
  const quantas = vendas === 0 ? 'não houve venda' : vendas === 1 ? 'foi 1 venda' : `foram ${inteiro(vendas)} vendas`
  if (meta === 0) return `${quando} ${quantas}, sem meta no mês`
  const diferenca = vendas - meta
  const contraMeta = diferenca === 0 ? 'bem na meta' : `${inteiro(Math.abs(diferenca))} ${diferenca < 0 ? 'abaixo' : 'acima'} da meta`
  return `${quando} ${quantas}, ${contraMeta}`
}
