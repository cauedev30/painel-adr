// Todo número e toda data do painel passam por aqui, no padrão brasileiro (seção 6.2).
// O Intl põe um espaço não separável depois de "R$"; aqui ele vira espaço comum, para o texto copiado
// e as frases-resposta saírem iguais em qualquer lugar. Datas sempre em UTC: o PGlite devolve `date`
// como meia-noite UTC, e no fuso de Brasília isso cairia no dia anterior.

const LOCALE = 'pt-BR'
const ESPACO_DURO = / /g

function decimal(casas: number, sinal: 'auto' | 'exceptZero' = 'auto'): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: casas, maximumFractionDigits: casas, signDisplay: sinal })
}

function porcentagem(casas: number, sinal: 'auto' | 'exceptZero' = 'auto'): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: casas, maximumFractionDigits: casas, signDisplay: sinal })
}

const MOEDA = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' })
const DATA = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })

/** R$ 12,4 mi · R$ 850 mil · R$ 312. A escala é escolhida depois do arredondamento: 999,6 mil vira R$ 1,0 mi. */
export function moedaCompacta(valor: number): string {
  const sinal = valor < 0 ? '-' : ''
  const a = Math.abs(valor)
  let texto: string
  if (Math.round(a / 1e5) / 10 >= 1000) texto = `${decimal(1).format(a / 1e9)} bi`
  else if (Math.round(a / 1e3) >= 1000) texto = `${decimal(1).format(a / 1e6)} mi`
  else if (Math.round(a) >= 1000) texto = `${decimal(0).format(a / 1e3)} mil`
  else texto = decimal(0).format(a)
  return `${sinal}R$ ${texto}`
}

/** R$ 312.450,00 */
export function moeda(valor: number): string {
  return MOEDA.format(valor).replace(ESPACO_DURO, ' ')
}

/** R$ 18.193: reais inteiros, para preço por m² (os centavos não dizem nada ali). */
export function reais(valor: number): string {
  return `R$ ${decimal(0).format(valor)}`
}

/** 0,081 → 8,1% */
export function pct(fracao: number, casas = 1): string {
  return porcentagem(casas).format(fracao)
}

/** 1234 → 1.234 */
export function inteiro(n: number): string {
  return decimal(0).format(n)
}

function paraData(valor: string | Date): Date {
  return valor instanceof Date ? valor : new Date(`${valor}T00:00:00Z`)
}

/** '2026-09-30' (ou o Date do PGlite) → 30/09/2026 */
export function data(valor: string | Date): string {
  return DATA.format(paraData(valor))
}

/** '2026-09' → set/2026 */
export function mes(anoMes: string): string {
  const d = paraData(`${anoMes}-01`)
  return `${MES.format(d).replace('.', '')}/${d.getUTCFullYear()}`
}

export type Variacao = { seta: '▲' | '▼' | '='; texto: string }

/** A seta sai do próprio texto arredondado: o que aparece como 0,0% é "=". */
function comSeta(texto: string): Variacao {
  return { seta: texto.startsWith('+') ? '▲' : texto.startsWith('-') ? '▼' : '=', texto }
}

/**
 * Variação contra o período anterior. `relativa` (padrão): +12,3% sobre o anterior; anterior zero é
 * "novo". `pontos`: para KPI que já é fração (VSO, inadimplência), a diferença em pontos percentuais.
 */
export function variacao(atual: number, anterior: number | null | undefined, modo: 'relativa' | 'pontos' = 'relativa'): Variacao {
  if (anterior === null || anterior === undefined) return { seta: '=', texto: 'sem comparação' }
  if (modo === 'pontos') return comSeta(`${decimal(1, 'exceptZero').format((atual - anterior) * 100)} p.p.`)
  if (anterior === 0) return atual === 0 ? { seta: '=', texto: porcentagem(1).format(0) } : { seta: atual > 0 ? '▲' : '▼', texto: 'novo' }
  return comSeta(porcentagem(1, 'exceptZero').format((atual - anterior) / Math.abs(anterior)))
}
