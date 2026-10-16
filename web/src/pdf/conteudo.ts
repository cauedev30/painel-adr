// O que vai para o PDF, em partes puras (sem jsPDF nem ECharts): os textos do cabeçalho, o nome do
// arquivo, as linhas da tabela e o gráfico com as cores do papel. O desenho do PDF fica em gerar.ts.
import type { EChartsOption } from 'echarts'
import { nomeDoEmpreendimento } from '../empreendimentos.ts'
import { data, nomeDoMes } from '../formatar.ts'
import { DATA_DE_CORTE, type Rota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'

/** Uma coluna de tabela, como o cartão a define (o mesmo formato de TabelaDados). */
export type ColunaDeTabela<T> = {
  chave: keyof T & string
  titulo: string
  formato?: (valor: never) => string
  numerica?: boolean
}

export type TabelaPdf = { cabecalho: string[]; linhas: string[][]; numericas: boolean[] }

export type CartaoPdf = {
  tipo: 'cartao'
  /** O id do elemento na tela: dá a ordem do relatório. */
  ancora: string
  titulo: string
  frase: string
  opcao: EChartsOption | null
  /** A altura do gráfico, em px de tela. */
  altura: number
  tabela: TabelaPdf | null
  pronto: boolean
}

export type KpiPdf = {
  tipo: 'kpi'
  ancora: string
  titulo: string
  extenso?: string
  valor: string
  seta: '▲' | '▼' | '='
  variacao: string
  tom: 'bom' | 'ruim' | 'neutro'
  contra: string
  pronto: boolean
}

export type TextoPdf = {
  tipo: 'texto'
  ancora: string
  titulo: string
  blocos: { titulo: string; itens: string[] }[]
  pronto: boolean
}

export type EntradaPdf = CartaoPdf | KpiPdf | TextoPdf

/** O texto de uma célula: o mesmo do "ver como tabela". */
export function textoDaCelula<T>(coluna: ColunaDeTabela<T>, valor: unknown): string {
  return coluna.formato ? (coluna.formato as (v: unknown) => string)(valor) : String(valor ?? '—')
}

/** As linhas do cartão já escritas, coluna a coluna. */
export function tabelaDasColunas<T>(linhas: T[], colunas: ColunaDeTabela<T>[]): TabelaPdf {
  return {
    cabecalho: colunas.map((c) => c.titulo),
    linhas: linhas.map((l) => colunas.map((c) => textoDaCelula(c, l[c.chave]))),
    numericas: colunas.map((c) => c.numerica === true),
  }
}

/** "jan 2025", para o cabeçalho do PDF. */
function mesEAno(anoMes: string): string {
  return `${nomeDoMes(anoMes)} ${anoMes.slice(0, 4)}`
}

/** "out 2025 – set 2026"; um mês só: "set 2026". */
export function periodoPorExtenso(rota: Pick<Rota, 'de' | 'ate'>): string {
  return rota.de === rota.ate ? mesEAno(rota.de) : `${mesEAno(rota.de)} – ${mesEAno(rota.ate)}`
}

/** Os filtros aplicados, por extenso: "out 2025 – set 2026 · Todos os empreendimentos". */
export function textoDosFiltros(rota: Rota, comFiltros: boolean): string {
  if (!comFiltros) return 'Todo o histórico, sem filtro de período ou empreendimento'
  return `${periodoPorExtenso(rota)} · ${nomeDoEmpreendimento(rota.emp)}`
}

/** "Dados até 30/09/2026 · gerado em 16/10/2026 às 14:32" (hora de João Pessoa). */
export function textoDaGeracao(agora: Date): string {
  const dia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Fortaleza' }).format(agora)
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }).format(agora)
  return `Dados até ${data(DATA_DE_CORTE)} · gerado em ${dia} às ${hora}`
}

/** Tira acento e o que não serve em nome de arquivo; corta o texto longo numa palavra inteira. */
function limpar(texto: string, maximo = 60): string {
  const simples = texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[–—·/\\|]/g, '-')
    .replace(/[^A-Za-z0-9 ,.()-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s,.-]+$/, '')
    .trim()
  if (simples.length <= maximo) return simples
  const corte = simples.slice(0, maximo)
  return corte.slice(0, corte.lastIndexOf(' ') > 20 ? corte.lastIndexOf(' ') : maximo).replace(/[\s,.-]+$/, '')
}

/** "ADR - Recebiveis - out 2025 a set 2026.pdf"; sem filtro: "ADR - Dados.pdf". */
export function nomeDoArquivo(nome: string, rota: Rota, comFiltros: boolean): string {
  // o título do cartão é uma pergunta: o nome fica com ela, sem o "?" e o que vier depois
  const partes = ['ADR', limpar(nome.split('?')[0])]
  if (comFiltros) {
    partes.push(limpar(rota.de === rota.ate ? mesEAno(rota.de) : `${mesEAno(rota.de)} a ${mesEAno(rota.ate)}`))
    if (rota.emp !== null) partes.push(limpar(nomeDoEmpreendimento(rota.emp)))
  }
  return `${partes.join(' - ')}.pdf`
}

// As cores do tema escuro e as do papel: texto escuro, grade clara, cinza mais leve; o cobre fica.
const NO_PAPEL: Record<string, string> = {
  [PALETA.fundo]: '#ffffff',
  [PALETA.superficie]: '#ffffff',
  [PALETA.superficie2]: '#f5f5f5',
  [PALETA.borda]: '#dcdcdc',
  [PALETA.texto]: '#262626',
  [PALETA.texto2]: '#595959',
  [PALETA.cinza]: '#a8a8a8',
  [PALETA.cobreForte]: '#b86b2c',
}

/** A opção do gráfico com as cores do papel: troca cada cor do tema escuro, em qualquer nível; o resto (funções inclusive) fica. */
export function clarear<T>(opcao: T): T {
  if (typeof opcao === 'string') return (NO_PAPEL[opcao.toLowerCase()] ?? opcao) as T
  if (Array.isArray(opcao)) return opcao.map((x) => clarear(x)) as T
  if (opcao !== null && typeof opcao === 'object' && Object.getPrototypeOf(opcao) === Object.prototype) {
    return Object.fromEntries(Object.entries(opcao).map(([k, v]) => [k, clarear(v)])) as T
  }
  return opcao
}

// A Lexend Deca embutida tem só o alfabeto latino: o que sai dele vira um equivalente que ela tem
const TROCAS: [RegExp, string][] = [
  [/≈\s?/g, '~'],
  [/→/g, '›'],
  [/[◔◑◕●▲▼]\s*/g, ''],
]

/** O texto pronto para a fonte do PDF. */
export function paraOPapel(texto: string): string {
  return TROCAS.reduce((t, [de, para]) => t.replace(de, para), texto)
}

/** Os KPIs seguidos viram um bloco só (a grade do topo); cartões e textos ficam como estão. */
export function agruparKpis(entradas: EntradaPdf[]): (KpiPdf[] | CartaoPdf | TextoPdf)[] {
  const grupos: (KpiPdf[] | CartaoPdf | TextoPdf)[] = []
  for (const e of entradas) {
    const ultimo = grupos.at(-1)
    if (e.tipo === 'kpi') {
      if (Array.isArray(ultimo)) ultimo.push(e)
      else grupos.push([e])
    } else grupos.push(e)
  }
  return grupos
}

/** Quantos KPIs em cada linha da grade: 3 por linha; a sobra de 2 fica numa linha de 2 (5 = 3 + 2, 4 = 2 + 2). */
export function linhasDeKpis(n: number): number[] {
  if (n <= 3) return [n]
  if (n === 4) return [2, 2]
  return [3, ...linhasDeKpis(n - 3)]
}
