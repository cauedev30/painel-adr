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

// ---- Vendas e estoque ----

export type LinhaEmpreendimento = {
  empreendimento_id: number; nome: string; slug: string; status: string
  unidades: number; vendidas: number; estoque: number; vso: number | null; vgv: number; interessados: number
}

/** "O Mares Seaview teve o maior VSO do período (39,2%), e o Mares Bessa tem o maior estoque (51 unidades)". */
export function respostaEmpreendimentos(linhas: LinhaEmpreendimento[]): string {
  const lancados = linhas.filter((l) => l.unidades > 0)
  if (lancados.length === 0) {
    const interessados = linhas.reduce((s, l) => s + l.interessados, 0)
    return `Nada lançado neste filtro; a lista de interesse tem ${inteiro(interessados)} ${interessados === 1 ? 'pessoa' : 'pessoas'}`
  }
  if (lancados.length === 1) {
    const [l] = lancados
    const vso = l.vso === null ? '' : `, com VSO de ${pct(l.vso)} no período`
    return `O ${l.nome} tem ${inteiro(l.estoque)} de ${inteiro(l.unidades)} unidades à venda${vso}`
  }
  const maisRapido = lancados.reduce((a, b) => ((b.vso ?? -1) > (a.vso ?? -1) ? b : a))
  const maiorEstoque = lancados.reduce((a, b) => (b.estoque > a.estoque ? b : a))
  return `O ${maisRapido.nome} teve o maior VSO do período (${pct(maisRapido.vso ?? 0)}), e o ${maiorEstoque.nome} tem o maior estoque (${inteiro(maiorEstoque.estoque)} unidades)`
}

export type LinhaRitmo = { empreendimento_id: number; nome: string; mes_desde_lancamento: number; vendidas_acumuladas: number; pct_vendido: number }

/** Compara os lançamentos no mesmo ponto: a parte vendida nos 6 primeiros meses. */
export function respostaRitmo(linhas: LinhaRitmo[]): string {
  const aos6 = linhas.filter((l) => l.mes_desde_lancamento === 6)
  if (aos6.length === 0) {
    const ultima = linhas.at(-1)!
    return `O ${ultima.nome} vendeu ${pct(ultima.pct_vendido, 0)} das unidades em ${inteiro(ultima.mes_desde_lancamento)} ${ultima.mes_desde_lancamento === 1 ? 'mês' : 'meses'}`
  }
  const melhor = aos6.reduce((a, b) => (b.pct_vendido > a.pct_vendido ? b : a))
  if (aos6.length === 1) return `Nos 6 primeiros meses, o ${melhor.nome} vendeu ${pct(melhor.pct_vendido, 0)} das unidades`
  return `Nos 6 primeiros meses, o ${melhor.nome} vendeu ${pct(melhor.pct_vendido, 0)} das unidades, o lançamento mais rápido`
}

export type LinhaCaixa = { empreendimento_id: number; nome: string; minimo: number; q1: number; mediana: number; q3: number; maximo: number; outliers: number[] }

/** As medianas de cada empreendimento e quantas vendas ficaram fora da curva. */
export function respostaDistribuicao(linhas: LinhaCaixa[]): string {
  const fora = linhas.reduce((s, l) => s + l.outliers.length, 0)
  const foraDaCurva = fora === 0 ? 'nenhuma venda fora da curva' : fora === 1 ? '1 venda fora da curva' : `${inteiro(fora)} vendas fora da curva`
  if (linhas.length === 1) return `Mediana de ${reais(linhas[0].mediana)} por m², e ${foraDaCurva}`
  const ordem = [...linhas].sort((a, b) => a.mediana - b.mediana)
  const [menor, maior] = [ordem[0], ordem.at(-1)!]
  return `A mediana vai de ${reais(menor.mediana)} por m² no ${menor.nome} a ${reais(maior.mediana)} no ${maior.nome}, e ${foraDaCurva}`
}

export type LinhaEstatisticas = {
  n: number; media: number | null; mediana: number | null; moda: number | null; desvio_padrao: number | null
  p25: number | null; p50: number | null; p75: number | null; p90: number | null
}

export function respostaEstatisticas([l]: LinhaEstatisticas[]): string {
  if (!l || l.n === 0 || l.mediana === null || l.media === null) return 'Sem vendas no período'
  return `Metade das ${inteiro(l.n)} vendas saiu acima de ${reais(l.mediana)} por m²; a média é ${reais(l.media)}`
}

export type LinhaVistaMar = { vista_mar: boolean; unidades: number; vendas: number; preco_m2_medio: number | null; pct_vendidas_6_meses: number | null }

export function respostaVistaMar(linhas: LinhaVistaMar[]): string {
  const com = linhas.find((l) => l.vista_mar)
  const sem = linhas.find((l) => !l.vista_mar)
  if (!com?.preco_m2_medio || !sem?.preco_m2_medio) return 'Sem vendas com e sem vista mar no período para comparar'
  const premio = com.preco_m2_medio / sem.preco_m2_medio - 1
  const preco = `Com vista mar, o m² sai ${pct(Math.abs(premio), 0)} ${premio >= 0 ? 'mais caro' : 'mais barato'}`
  if (com.pct_vendidas_6_meses === null || sem.pct_vendidas_6_meses === null) return preco
  return `${preco}, e ${pct(com.pct_vendidas_6_meses, 0)} das unidades venderam em 6 meses, contra ${pct(sem.pct_vendidas_6_meses, 0)} sem vista`
}
