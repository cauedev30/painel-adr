// As frases-resposta dos cartões (seção 6.2): calculadas das linhas da consulta, nunca escritas à mão.
// Funções puras, testadas em web/testes/painel/respostas.test.ts.
import { comArtigo } from '../canais.ts'
import { MIN_LEADS_CANAL } from '../conclusoes.ts'
import { type Variacao, inteiro, mes, moedaCompacta, pct, reais, variacao } from '../formatar.ts'
import { type Rota, periodoAnterior } from '../navegacao/rotas.ts'

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
  /**
   * Contra o quê o valor_anterior compara: o período anterior de mesma duração (padrão), o mês anterior
   * ao último do período, ou o fim do período anterior (KPI que é foto de um dia: estoque, carteira).
   */
  comparacao?: 'periodo' | 'mes' | 'fim'
}

/** Os 6 KPIs da visão geral (seção 6.1), com as definições da seção 3.4. */
export const KPIS: DefinicaoKpi[] = [
  { id: 'vgv', titulo: 'VGV vendido', consulta: 'visao-geral/kpi_vgv', formato: moedaCompacta, modo: 'relativa', subirEhBom: true },
  { id: 'vso', titulo: 'VSO', consulta: 'visao-geral/kpi_vso', formato: (v) => pct(v), modo: 'pontos', subirEhBom: true },
  { id: 'estoque', titulo: 'Estoque', consulta: 'visao-geral/kpi_estoque', formato: (v) => `${inteiro(v)} unidades`, modo: 'relativa', subirEhBom: false, comparacao: 'fim' },
  { id: 'ticket_medio', titulo: 'Ticket médio', consulta: 'visao-geral/kpi_ticket_medio', formato: moedaCompacta, modo: 'relativa', subirEhBom: true },
  { id: 'preco_m2', titulo: 'Preço por m²', consulta: 'visao-geral/kpi_preco_m2', formato: reais, modo: 'relativa', subirEhBom: true },
  { id: 'inadimplencia', titulo: 'Inadimplência', consulta: 'visao-geral/kpi_inadimplencia', formato: (v) => pct(v), modo: 'pontos', subirEhBom: false, comparacao: 'fim' },
]

/** "out/2024–set/2025" (período anterior), "ago/2026" (mês anterior) ou "fim de set/2025" (foto de um dia). */
export function textoDaComparacao(kpi: DefinicaoKpi, rota: Rota): string {
  if (kpi.comparacao === 'mes') return mes(periodoAnterior({ ...rota, de: rota.ate }).de)
  const anterior = periodoAnterior(rota)
  if (kpi.comparacao === 'fim') return `fim de ${mes(anterior.ate)}`
  return anterior.de === anterior.ate ? mes(anterior.de) : `${mes(anterior.de)}–${mes(anterior.ate)}`
}

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

// ---- Funil e corretores ----

export type LinhaFunil = { etapa: string; ordem: number; leads: number; conversao: number | null }

export const NOMES_DAS_ETAPAS: Record<string, string> = { lead: 'Lead', visita: 'Visita', proposta: 'Proposta', venda: 'Venda' }

/** "Dos 4.656 leads do período, 53 viraram venda (1,1%); o maior gargalo é de lead para visita (9,4%)". */
export function respostaFunil(linhas: LinhaFunil[]): string {
  const [primeira] = linhas
  const ultima = linhas.at(-1)!
  if (primeira.leads === 0) return 'Nenhum lead entrou no período'
  const vendas = ultima.leads === 1 ? '1 virou venda' : `${inteiro(ultima.leads)} viraram venda`
  const passos = linhas.filter((l) => l.conversao !== null)
  const gargalo = passos.reduce((a, b) => (b.conversao! < a.conversao! ? b : a))
  const anterior = linhas.find((l) => l.ordem === gargalo.ordem - 1)!
  return `Dos ${inteiro(primeira.leads)} leads do período, ${vendas} (${pct(ultima.leads / primeira.leads)}); `
    + `o maior gargalo é de ${anterior.etapa} para ${gargalo.etapa} (${pct(gargalo.conversao!)})`
}

export type LinhaCanal = { canal: string; leads: number; vendas: number; conversao: number }

/** O canal de maior conversão entre os que têm volume (o mesmo critério das conclusões); nulo se nenhum vendeu. */
export function canalQueMaisConverte(linhas: LinhaCanal[]): LinhaCanal | null {
  const candidatos = linhas.filter((l) => l.leads >= MIN_LEADS_CANAL && l.vendas > 0)
  return candidatos.length === 0 ? null : candidatos.reduce((a, b) => (b.conversao > a.conversao ? b : a))
}

export function respostaCanais(linhas: LinhaCanal[]): string {
  const total = linhas.reduce((s, l) => s + l.leads, 0)
  const volume = linhas.reduce((a, b) => (b.leads > a.leads ? b : a))
  const melhor = canalQueMaisConverte(linhas)
  const traz = `${comArtigo(volume.canal)} traz ${pct(volume.leads / total, 0)} dos leads`
  const frase = traz.charAt(0).toUpperCase() + traz.slice(1)
  if (melhor === null) return `${frase}, e nenhum canal com volume chegou à venda`
  if (melhor.canal === volume.canal) return `${frase} e também é o que mais converte (${pct(melhor.conversao)})`
  return `${frase} e converte ${pct(volume.conversao)}; quem mais converte é ${comArtigo(melhor.canal)}, com ${pct(melhor.conversao)}`
}

export type LinhaRanking = {
  corretor_id: number; nome: string; imobiliaria: string | null; vendas: number; vgv: number
  posicao: number; posicao_anterior: number | null; variacao: number | null
}

export type VariacaoDePosicao = { seta: '▲' | '▼' | '=' | ''; texto: string; descricao: string; tom: 'bom' | 'ruim' | 'neutro' }

/** ▲ 2 (subiu 2 posições), ▼ 1, = (mesma posição) ou "novo" (não vendeu no período anterior). */
export function variacaoDePosicao({ posicao_anterior, variacao: v }: LinhaRanking): VariacaoDePosicao {
  if (posicao_anterior === null || v === null) return { seta: '', texto: 'novo', descricao: 'não vendeu no período anterior', tom: 'neutro' }
  if (v === 0) return { seta: '=', texto: '', descricao: 'mesma posição', tom: 'neutro' }
  const n = Math.abs(v)
  const posicoes = n === 1 ? '1 posição' : `${inteiro(n)} posições`
  return v > 0
    ? { seta: '▲', texto: inteiro(n), descricao: `subiu ${posicoes}`, tom: 'bom' }
    : { seta: '▼', texto: inteiro(n), descricao: `caiu ${posicoes}`, tom: 'ruim' }
}

/** "Kaique Mendes lidera com 12 vendas (R$ 4,4 mi); quem mais subiu foi Luiza das Neves, 8 posições". */
export function respostaRanking(linhas: LinhaRanking[]): string {
  const [lider] = linhas
  const empatados = linhas.filter((l) => l.posicao === 1)
  const vendas = lider.vendas === 1 ? '1 venda' : `${inteiro(lider.vendas)} vendas`
  const topo = empatados.length > 1
    ? `${empatados.length} corretores dividem o 1º lugar, com ${vendas} cada`
    : `${lider.nome} lidera com ${vendas} (${moedaCompacta(lider.vgv)})`
  const subiram = linhas.filter((l) => (l.variacao ?? 0) > 0)
  if (subiram.length === 0) return topo
  const salto = subiram.reduce((a, b) => (b.variacao! > a.variacao! ? b : a))
  return `${topo}; quem mais subiu foi ${salto.nome}, ${variacaoDePosicao(salto).descricao.replace('subiu ', '')}`
}

// ---- Recebíveis ----

/** Os KPIs da seção 6.1, tela 4; a inadimplência é a mesma consulta da visão geral. */
export const KPIS_RECEBIVEIS: DefinicaoKpi[] = [
  { id: 'a_receber_12m', titulo: 'A receber em 12 meses', consulta: 'recebiveis/kpi_a_receber_12m', formato: moedaCompacta, modo: 'relativa', subirEhBom: true, comparacao: 'fim' },
  { id: 'recebido_mes', titulo: 'Recebido no último mês', consulta: 'recebiveis/kpi_recebido_mes', formato: moedaCompacta, modo: 'relativa', subirEhBom: true, comparacao: 'mes' },
  KPIS.find((k) => k.id === 'inadimplencia')!,
]

export type LinhaPrevistoRecebido = { mes: string; previsto: number; recebido: number }

/** "No período entrou R$ 9,4 mi, 102% do previsto; em set/2026, 96%". */
export function respostaPrevistoRecebido(linhas: LinhaPrevistoRecebido[]): string {
  const previsto = linhas.reduce((s, l) => s + l.previsto, 0)
  const recebido = linhas.reduce((s, l) => s + l.recebido, 0)
  if (previsto === 0) return recebido === 0 ? 'Nenhuma parcela vencia no período' : `No período entrou ${moedaCompacta(recebido)}, sem parcela prevista`
  const ultimo = linhas.at(-1)!
  const noUltimo = ultimo.previsto === 0 ? '' : `; em ${mes(ultimo.mes)}, ${pct(ultimo.recebido / ultimo.previsto, 0)}`
  return `No período entrou ${moedaCompacta(recebido)}, ${pct(recebido / previsto, 0)} do previsto${noUltimo}`
}

export type LinhaFaixa = { faixa: string; ordem: number; saldo: number; parcelas: number }

/** Um ícone por faixa, que enche com o atraso: a faixa nunca é só a cor (seção 6.3). */
export const ICONES_DAS_FAIXAS = ['◔', '◑', '◕', '●']

export function rotuloDaFaixa(faixa: string): string {
  return `${faixa} dias`
}

/** "R$ 603 mil, 72% do atraso, está há mais de 90 dias". */
export function respostaFaixas(linhas: LinhaFaixa[]): string {
  const total = linhas.reduce((s, l) => s + l.saldo, 0)
  if (total === 0) return 'Nenhuma parcela em atraso no fim do período'
  const maior = linhas.reduce((a, b) => (b.saldo > a.saldo ? b : a))
  const verbo = maior.ordem === 4 ? 'está há' : 'está entre'
  return `${moedaCompacta(maior.saldo)}, ${pct(maior.saldo / total, 0)} do atraso, ${verbo} ${rotuloDaFaixa(maior.faixa)}; o total em atraso é ${moedaCompacta(total)}`
}

export type LinhaMapaCalor = { empreendimento_id: number; nome: string; faixa: string; ordem: number; saldo: number }

export function respostaMapaCalor(linhas: LinhaMapaCalor[]): string {
  const maior = linhas.reduce((a, b) => (b.saldo > a.saldo ? b : a))
  if (maior.saldo === 0) return 'Nenhum empreendimento tem parcela em atraso no fim do período'
  return `O dinheiro mais parado está no ${maior.nome}: ${moedaCompacta(maior.saldo)} em atraso de ${rotuloDaFaixa(maior.faixa)}`
}

export type LinhaInadEmpreendimento = { empreendimento_id: number; nome: string; inadimplencia: number }

export function respostaInadEmpreendimento(linhas: LinhaInadEmpreendimento[]): string {
  const ordem = [...linhas].sort((a, b) => b.inadimplencia - a.inadimplencia)
  const [pior, ...outros] = ordem
  if (outros.length === 0) return `No ${pior.nome}, ${pct(pior.inadimplencia)} do que venceu não foi pago`
  const faixa = outros.length === 1
    ? pct(outros[0].inadimplencia)
    : `${pct(outros.at(-1)!.inadimplencia)} a ${pct(outros[0].inadimplencia)}`
  return `No ${pior.nome}, ${pct(pior.inadimplencia)} do que venceu não foi pago; nos outros, ${faixa}`
}

export type LinhaInadDesconto = { faixa_desconto: string; ordem: number; vendas: number; inadimplencia: number | null }

export function respostaInadDesconto(linhas: LinhaInadDesconto[]): string {
  const comDados = linhas.filter((l) => l.inadimplencia !== null)
  if (comDados.length === 0) return 'Sem parcela vencida neste filtro'
  const pior = comDados.reduce((a, b) => (b.inadimplencia! > a.inadimplencia! ? b : a))
  const baixo = linhas.find((l) => l.ordem === 1)
  const contra = baixo && baixo !== pior && baixo.inadimplencia !== null ? `, contra ${pct(baixo.inadimplencia)} nas de até 3%` : ''
  return `Nas vendas com desconto de ${pior.faixa_desconto}, ${pct(pior.inadimplencia!)} do vencido está em aberto${contra}`
}

export type LinhaDistratos = { distratos: number; com_atraso_60: number; pct: number | null }

export function respostaDistratos([l]: LinhaDistratos[]): string {
  if (!l || l.distratos === 0) return 'Nenhum distrato no período'
  const depois = 'depois de uma parcela com mais de 60 dias de atraso'
  if (l.distratos === 1) return l.com_atraso_60 === 1 ? `O único distrato do período veio ${depois}` : 'O único distrato do período não teve atraso acima de 60 dias antes'
  if (l.com_atraso_60 === l.distratos) return `Os ${inteiro(l.distratos)} distratos do período vieram ${depois}`
  return `${inteiro(l.com_atraso_60)} dos ${inteiro(l.distratos)} distratos do período (${pct(l.pct ?? 0, 0)}) vieram ${depois}`
}

// ---- Dados ----

export function respostaDer(linhas: { tabela: string; fk_tabela: string | null }[]): string {
  const tabelas = new Set(linhas.map((l) => l.tabela)).size
  const relacoes = linhas.filter((l) => l.fk_tabela !== null).length
  return `${inteiro(tabelas)} ${tabelas === 1 ? 'tabela' : 'tabelas'} e ${inteiro(relacoes)} ${relacoes === 1 ? 'relação' : 'relações'}, lidas do catálogo do próprio banco; escolha uma tabela para ver o dicionário`
}

export type LinhaQualidade = { regra: string; origem: string; descricao: string; linhas_afetadas: number; acao: string }

/** "O pipeline tratou 4.312 linhas em 7 regras; 22 foram para a quarentena e 57 saíram com elas, em cascata". */
export function respostaQualidade(linhas: LinhaQualidade[]): string {
  const total = linhas.reduce((s, l) => s + l.linhas_afetadas, 0)
  const regras = new Set(linhas.map((l) => l.regra)).size
  const quarentena = linhas.filter((l) => l.acao === 'quarentena').reduce((s, l) => s + l.linhas_afetadas, 0)
  const cascata = linhas.filter((l) => l.acao === 'cascata').reduce((s, l) => s + l.linhas_afetadas, 0)
  const barradas = quarentena === 0 ? 'nenhuma foi para a quarentena' : `${inteiro(quarentena)} foram para a quarentena`
  const emCascata = cascata === 0 ? '' : ` e ${inteiro(cascata)} saíram com elas, em cascata`
  return `O pipeline tratou ${inteiro(total)} linhas em ${inteiro(regras)} ${regras === 1 ? 'regra' : 'regras'}; ${barradas}${emCascata}`
}
