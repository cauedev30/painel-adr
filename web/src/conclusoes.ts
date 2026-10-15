// "O que os dados dizem" (D6.1): uma conclusão por padrão plantado (seção 3.2), escrita a partir das
// linhas das consultas, nunca à mão. Se o filtro deixa o padrão sem dados, ou os dados não o mostram,
// a conclusão some: melhor uma a menos do que uma frase falsa. Testado em testes/painel/conclusoes.test.ts.
import { comArtigo } from './canais.ts'
import { inteiro, pct, reais } from './formatar.ts'
import type { IdTela } from './navegacao/rotas.ts'

export type LinhaCanal = { canal: string; leads: number; vendas: number; conversao: number }
export type LinhaRanking = { corretor_id: number; nome: string; vendas: number }
export type LinhaVistaMar = { vista_mar: boolean; preco_m2_medio: number | null; pct_vendidas_6_meses: number | null }
export type LinhaInadEmpreendimento = { empreendimento_id: number; nome: string; inadimplencia: number }
export type LinhaInadDesconto = { faixa_desconto: string; ordem: number; vendas: number; inadimplencia: number | null }
export type LinhaDistratos = { distratos: number; com_atraso_60: number; pct: number | null }

export type DadosDasConclusoes = {
  canais: LinhaCanal[]
  ranking: LinhaRanking[]
  vistaMar: LinhaVistaMar[]
  inadimplenciaPorEmpreendimento: LinhaInadEmpreendimento[]
  inadimplenciaPorDesconto: LinhaInadDesconto[]
  distratos: LinhaDistratos[]
}

/** As consultas de onde vêm os dados de cada parte, na ordem de DadosDasConclusoes. */
export const CONSULTAS_DAS_CONCLUSOES: Record<keyof DadosDasConclusoes, string> = {
  canais: 'funil-corretores/canais',
  ranking: 'funil-corretores/ranking_corretores',
  vistaMar: 'vendas-estoque/vista_mar',
  inadimplenciaPorEmpreendimento: 'recebiveis/inadimplencia_por_empreendimento',
  inadimplenciaPorDesconto: 'recebiveis/inadimplencia_por_desconto',
  distratos: 'recebiveis/distratos_e_atraso',
}

/** A conclusão e o cartão que a prova (tela e id do cartão). */
export type Conclusao = { id: string; texto: string; tela: IdTela; cartao: string }

/** Canal com menos leads que isso não entra na disputa da maior conversão: 2 vendas em 5 leads não é padrão. */
export const MIN_LEADS_CANAL = 30

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "a, b, c e d" */
function lista(itens: string[]): string {
  return itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`
}

/** 1. O canal que mais traz leads não é o que mais converte. */
function canais(linhas: LinhaCanal[]): Conclusao | null {
  const total = linhas.reduce((s, l) => s + l.leads, 0)
  const candidatos = linhas.filter((l) => l.leads >= MIN_LEADS_CANAL && l.vendas > 0)
  if (total === 0 || candidatos.length === 0) return null
  const volume = linhas.reduce((a, b) => (b.leads > a.leads ? b : a))
  const conversao = candidatos.reduce((a, b) => (b.conversao > a.conversao ? b : a))
  if (conversao.canal === volume.canal || conversao.conversao <= volume.conversao) return null
  const texto = `${maiuscula(comArtigo(volume.canal))} traz ${pct(volume.leads / total, 0)} dos leads, mas converte ${pct(volume.conversao)}; `
    + `${comArtigo(conversao.canal)} traz ${pct(conversao.leads / total, 0)} e converte ${pct(conversao.conversao)}.`
  return { id: 'canais', texto, tela: 'funil-corretores', cartao: 'canais' }
}

/** 2. Poucos corretores fazem boa parte das vendas. */
function corretores(linhas: LinhaRanking[]): Conclusao | null {
  if (linhas.length <= 5) return null
  const top = linhas.slice(0, 5)
  const doTop = top.reduce((s, l) => s + l.vendas, 0)
  const total = linhas.reduce((s, l) => s + l.vendas, 0)
  // só é concentração se os 5 fizeram mais do que a parte deles no número de corretores
  if (total === 0 || doTop / total <= 5 / linhas.length) return null
  const texto = `Os 5 primeiros do ranking (${lista(top.map((l) => l.nome))}) fizeram ${doTop} das ${total} vendas, `
    + `${pct(doTop / total, 0)}; os outros ${linhas.length - 5} corretores dividem o resto.`
  return { id: 'corretores', texto, tela: 'funil-corretores', cartao: 'ranking' }
}

/** 3. A vista mar cobra mais pelo m² e vende mais rápido. */
function vistaMar(linhas: LinhaVistaMar[]): Conclusao | null {
  const com = linhas.find((l) => l.vista_mar)
  const sem = linhas.find((l) => !l.vista_mar)
  if (!com?.preco_m2_medio || !sem?.preco_m2_medio) return null
  const premio = com.preco_m2_medio / sem.preco_m2_medio - 1
  let texto = `Com vista mar, o m² sai ${pct(Math.abs(premio), 0)} ${premio >= 0 ? 'mais caro' : 'mais barato'} `
    + `(${reais(com.preco_m2_medio)} contra ${reais(sem.preco_m2_medio)})`
  if (com.pct_vendidas_6_meses !== null && sem.pct_vendidas_6_meses !== null) {
    texto += `, e ${pct(com.pct_vendidas_6_meses, 0)} dessas unidades venderam nos 6 primeiros meses do lançamento, `
      + `contra ${pct(sem.pct_vendidas_6_meses, 0)} das sem vista`
  }
  return { id: 'vista-mar', texto: `${texto}.`, tela: 'vendas-estoque', cartao: 'vista-mar' }
}

/** 4. A inadimplência se concentra num empreendimento e nas vendas com desconto alto. */
function inadimplencia(porEmpreendimento: LinhaInadEmpreendimento[], porDesconto: LinhaInadDesconto[]): Conclusao | null {
  const partes: string[] = []
  let cartao = 'inadimplencia-desconto'

  if (porEmpreendimento.length >= 2) {
    const [pior, ...outros] = [...porEmpreendimento].sort((a, b) => b.inadimplencia - a.inadimplencia)
    const menor = Math.min(...outros.map((o) => o.inadimplencia))
    const maior = Math.max(...outros.map((o) => o.inadimplencia))
    const faixa = outros.length === 1 ? pct(menor) : `${pct(menor)} a ${pct(maior)}`
    partes.push(`A inadimplência se concentra no ${pior.nome}: ${pct(pior.inadimplencia)} do que venceu não foi pago, contra ${faixa} nos outros.`)
    cartao = 'inadimplencia-empreendimento'
  }

  const baixo = porDesconto.find((l) => l.ordem === 1)
  const alto = porDesconto.find((l) => l.ordem === 3)
  const piorFaixa = porDesconto.reduce<LinhaInadDesconto | null>(
    (a, b) => (b.inadimplencia !== null && (a === null || b.inadimplencia > (a.inadimplencia ?? -1)) ? b : a), null)
  if (alto && baixo && alto.vendas > 0 && alto.inadimplencia !== null && baixo.inadimplencia !== null && piorFaixa === alto) {
    const sujeito = partes.length > 0 ? 'ela' : 'a inadimplência'
    partes.push(`Nas vendas com desconto de ${alto.faixa_desconto}, ${sujeito} chega a ${pct(alto.inadimplencia)}, contra ${pct(baixo.inadimplencia)} nas de desconto até 3%.`)
  }

  if (partes.length === 0) return null
  return { id: 'inadimplencia', texto: partes.join(' '), tela: 'recebiveis', cartao }
}

/** 5. O distrato costuma vir depois de um atraso longo. */
function distratos(linhas: LinhaDistratos[]): Conclusao | null {
  const [l] = linhas
  if (!l || l.distratos === 0 || l.pct === null || l.pct < 0.5) return null
  const depois = 'depois de uma parcela com mais de 60 dias de atraso.'
  let texto: string
  if (l.distratos === 1) texto = `O único distrato do período veio ${depois}`
  else if (l.com_atraso_60 === l.distratos) texto = `Os ${inteiro(l.distratos)} distratos do período vieram ${depois}`
  else texto = `${inteiro(l.com_atraso_60)} dos ${inteiro(l.distratos)} distratos do período (${pct(l.pct, 0)}) vieram ${depois}`
  return { id: 'distratos', texto, tela: 'recebiveis', cartao: 'distratos' }
}

/** As conclusões que os dados sustentam, na ordem dos padrões da seção 3.2. */
export function gerarConclusoes(d: DadosDasConclusoes): Conclusao[] {
  return [
    canais(d.canais),
    corretores(d.ranking),
    vistaMar(d.vistaMar),
    inadimplencia(d.inadimplenciaPorEmpreendimento, d.inadimplenciaPorDesconto),
    distratos(d.distratos),
  ].filter((c): c is Conclusao => c !== null)
}
