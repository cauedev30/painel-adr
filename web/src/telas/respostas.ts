// As frases-resposta dos cartões (seção 6.2): calculadas das linhas da consulta, nunca escritas à mão.
// Funções puras, testadas em web/testes/painel/respostas.test.ts.
import { type Variacao, inteiro, mes, moedaCompacta, pct, reais, variacao } from '../formatar.ts'

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

export type LinhaKpi = { valor: number | null; valor_anterior: number | null }

export type DefinicaoKpi = {
  id: string
  titulo: string
  consulta: string
  formato: (valor: number) => string
  /** Fração (VSO, inadimplência) compara em pontos percentuais; o resto, em variação relativa. */
  modo: 'relativa' | 'pontos'
  /** No estoque e na inadimplência, subir é ruim: a cor da seta se inverte. */
  subirEhBom: boolean
}

/** Os 6 KPIs da visão geral (seção 6.1), com as definições da seção 3.4. */
export const KPIS: DefinicaoKpi[] = [
  { id: 'vgv', titulo: 'VGV vendido', consulta: 'visao-geral/kpi_vgv', formato: moedaCompacta, modo: 'relativa', subirEhBom: true },
  { id: 'vso', titulo: 'VSO', consulta: 'visao-geral/kpi_vso', formato: (v) => pct(v), modo: 'pontos', subirEhBom: true },
  { id: 'estoque', titulo: 'Estoque', consulta: 'visao-geral/kpi_estoque', formato: (v) => `${inteiro(v)} unidades`, modo: 'relativa', subirEhBom: false },
  { id: 'ticket_medio', titulo: 'Ticket médio', consulta: 'visao-geral/kpi_ticket_medio', formato: moedaCompacta, modo: 'relativa', subirEhBom: true },
  { id: 'preco_m2', titulo: 'Preço por m²', consulta: 'visao-geral/kpi_preco_m2', formato: reais, modo: 'relativa', subirEhBom: true },
  { id: 'inadimplencia', titulo: 'Inadimplência', consulta: 'visao-geral/kpi_inadimplencia', formato: (v) => pct(v), modo: 'pontos', subirEhBom: false },
]

export type LeituraKpi = { valor: string; variacao: Variacao; tom: 'bom' | 'ruim' | 'neutro' }

/** O valor formatado, a variação contra o período anterior e se ela é boa ou ruim. */
export function lerKpi(kpi: DefinicaoKpi, { valor, valor_anterior }: LinhaKpi): LeituraKpi {
  if (valor === null) return { valor: '—', variacao: { seta: '=', texto: 'sem vendas no período' }, tom: 'neutro' }
  const v = variacao(valor, valor_anterior, kpi.modo)
  const tom = v.seta === '=' ? 'neutro' : (v.seta === '▲') === kpi.subirEhBom ? 'bom' : 'ruim'
  return { valor: kpi.formato(valor), variacao: v, tom }
}
