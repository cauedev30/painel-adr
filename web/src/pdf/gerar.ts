// O PDF do painel: página A4 clara, com o logo e o cobre da ADR, os KPIs, e cada cartão com título,
// frase, gráfico e tabela. Este módulo (com o jsPDF e o renderizador em canvas do ECharts) só é baixado
// no primeiro clique em "baixar PDF": import() dinâmico em BotaoPdf.tsx.
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import logoBranco from '../assets/logo-adr.png'
import { PALETA } from '../tema/paleta.ts'
import { TEMA_ECHARTS } from '../tema/echarts.ts'
import { type CartaoPdf, type EntradaPdf, type KpiPdf, type TextoPdf, agruparKpis, clarear, linhasDeKpis, paraOPapel } from './conteudo.ts'
import { paraTextoBinario, woffParaTtf } from './fonte.ts'
// o @fontsource só exporta os .css; o .woff é importado pelo caminho
import woff400 from '../../node_modules/@fontsource/lexend-deca/files/lexend-deca-latin-400-normal.woff?url'
import woff600 from '../../node_modules/@fontsource/lexend-deca/files/lexend-deca-latin-600-normal.woff?url'

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TitleComponent, CanvasRenderer])
const TEMA_CLARO = 'adr-papel'
echarts.registerTheme(TEMA_CLARO, clarear(TEMA_ECHARTS))

const FONTE = 'LexendDeca'
const COR = {
  tinta: '#262626',
  texto2: '#595959',
  apagado: '#8c8c8c',
  linha: '#e0e0e0',
  cobre: PALETA.cobre,
  // o cobre do texto, um pouco mais escuro para ler bem no branco
  cobreTexto: '#a3602a',
  bom: '#2f8a3f',
  ruim: '#c8372f',
}
const RGB = {
  cabecalhoTabela: [247, 239, 231] as [number, number, number],
  textoCabecalho: [92, 51, 16] as [number, number, number],
  zebra: [250, 250, 250] as [number, number, number],
  tinta: [38, 38, 38] as [number, number, number],
  linha: [230, 230, 230] as [number, number, number],
}

// A4 em mm
const LARGURA = 210
const ALTURA = 297
const MARGEM = 16
const UTIL = LARGURA - 2 * MARGEM
const TOPO_SEGUINTES = 25
const LIMITE = 277
// o gráfico é desenhado com 820 px de largura e cabe nos 178 mm úteis: o texto de 12 px sai com ~7 pt
const LARGURA_DO_GRAFICO_PX = 820
// a tabela que cabe numa página não se parte: vai inteira com o gráfico
const TABELA_CURTA = 15
const LINHA_DA_TABELA = 6.1
const PT = 0.3528
const ENTRELINHA = 1.3

export type PedidoDePdf = {
  /** O nome da tela, no título da primeira página. */
  nomeDaTela: string
  filtros: string
  geracao: string
  entradas: EntradaPdf[]
  arquivo: string
}

let fontes: Promise<[string, string]> | null = null

function carregarFontes(): Promise<[string, string]> {
  fontes ??= Promise.all([woff400, woff600].map(async (url) => {
    const resposta = await fetch(url)
    return paraTextoBinario(await woffParaTtf(await resposta.arrayBuffer()))
  })) as Promise<[string, string]>
  return fontes
}

/** O logo da ADR é branco (para o painel escuro); no papel ele sai em grafite, com a mesma forma. */
async function logoEscuro(): Promise<{ url: string; proporcao: number }> {
  const img = new Image()
  img.src = logoBranco
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#1f1f1f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return { url: canvas.toDataURL('image/png'), proporcao: img.naturalWidth / img.naturalHeight }
}

/** Desenha o gráfico de novo, fora da tela, com as cores do papel e sem animação, e devolve o PNG em 2x. */
function imagemDoGrafico(opcao: EChartsOption, alturaPx: number): string {
  const div = document.createElement('div')
  div.style.cssText = `position:fixed;left:-10000px;top:0;width:${LARGURA_DO_GRAFICO_PX}px;height:${alturaPx}px;`
  document.body.append(div)
  const grafico = echarts.init(div, TEMA_CLARO, { renderer: 'canvas', width: LARGURA_DO_GRAFICO_PX, height: alturaPx })
  try {
    grafico.setOption({ ...clarear(opcao), animation: false, tooltip: { show: false } })
    return grafico.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
  } finally {
    grafico.dispose()
    div.remove()
  }
}

type Estilo = { tamanho: number; cor?: string; negrito?: boolean; largura?: number; alinhar?: 'left' | 'right' }

/** Escreve o texto (quebrando na largura) com o topo em y; devolve a altura usada, em mm. */
function escrever(doc: jsPDF, texto: string, x: number, y: number, { tamanho, cor = COR.tinta, negrito = false, largura = UTIL, alinhar = 'left' }: Estilo): number {
  doc.setFont(FONTE, negrito ? 'bold' : 'normal')
  doc.setFontSize(tamanho)
  doc.setTextColor(cor)
  const linhas = doc.splitTextToSize(paraOPapel(texto), largura) as string[]
  doc.text(linhas, x, y, { baseline: 'top', lineHeightFactor: ENTRELINHA, align: alinhar })
  return alturaDoTexto(doc, texto, tamanho, largura, negrito)
}

function alturaDoTexto(doc: jsPDF, texto: string, tamanho: number, largura: number, negrito = false): number {
  doc.setFont(FONTE, negrito ? 'bold' : 'normal')
  doc.setFontSize(tamanho)
  return (doc.splitTextToSize(paraOPapel(texto), largura) as string[]).length * tamanho * PT * ENTRELINHA
}

function larguraDoTexto(doc: jsPDF, texto: string, tamanho: number, negrito = false): number {
  doc.setFont(FONTE, negrito ? 'bold' : 'normal')
  doc.setFontSize(tamanho)
  return doc.getTextWidth(paraOPapel(texto))
}

function cabecalhoDaPrimeira(doc: jsPDF, pedido: PedidoDePdf, logo: { url: string; proporcao: number }): number {
  doc.addImage(logo.url, 'PNG', MARGEM, 11, 9 * logo.proporcao, 9)
  escrever(doc, 'ADR · INTELIGÊNCIA COMERCIAL', LARGURA - MARGEM, 12.5, { tamanho: 8, cor: COR.cobreTexto, negrito: true, alinhar: 'right' })
  escrever(doc, pedido.geracao, LARGURA - MARGEM, 17, { tamanho: 7.5, cor: COR.apagado, alinhar: 'right' })
  doc.setDrawColor(COR.cobre)
  doc.setLineWidth(0.7)
  doc.line(MARGEM, 24.5, LARGURA - MARGEM, 24.5)
  let y = 30
  y += escrever(doc, pedido.nomeDaTela, MARGEM, y, { tamanho: 20, negrito: true })
  y += 1
  y += escrever(doc, pedido.filtros, MARGEM, y, { tamanho: 10.5, cor: COR.texto2 })
  return y + 8
}

function cabecalhoDasSeguintes(doc: jsPDF, pedido: PedidoDePdf, logo: { url: string; proporcao: number }) {
  doc.addImage(logo.url, 'PNG', MARGEM, 9, 6 * logo.proporcao, 6)
  escrever(doc, `${pedido.nomeDaTela} · ${pedido.filtros}`, LARGURA - MARGEM, 10.5, { tamanho: 7.5, cor: COR.texto2, alinhar: 'right', largura: 130 })
  doc.setDrawColor(COR.cobre)
  doc.setLineWidth(0.4)
  doc.line(MARGEM, 18, LARGURA - MARGEM, 18)
}

function rodape(doc: jsPDF, pagina: number, total: number) {
  doc.setDrawColor(COR.linha)
  doc.setLineWidth(0.2)
  doc.line(MARGEM, ALTURA - 14, LARGURA - MARGEM, ALTURA - 14)
  escrever(doc, 'Dados simulados · Painel de Dados ADR', MARGEM, ALTURA - 11.5, { tamanho: 7.5, cor: COR.apagado })
  escrever(doc, `Página ${pagina} de ${total}`, LARGURA - MARGEM, ALTURA - 11.5, { tamanho: 7.5, cor: COR.apagado, alinhar: 'right' })
}

/** Garante `altura` mm livres a partir de y; senão, abre página nova. Devolve o y onde desenhar. */
function espaco(doc: jsPDF, y: number, altura: number): number {
  if (y + altura <= LIMITE || y <= TOPO_SEGUINTES + 1) return y
  doc.addPage()
  return TOPO_SEGUINTES
}

function rotuloDeSecao(doc: jsPDF, texto: string, y: number): number {
  return y + escrever(doc, texto.toUpperCase(), MARGEM, y, { tamanho: 7.5, cor: COR.cobreTexto, negrito: true }) + 2
}

function seta(doc: jsPDF, tipo: KpiPdf['seta'], x: number, y: number, cor: string) {
  doc.setFillColor(cor)
  if (tipo === '▲') doc.triangle(x, y + 2.1, x + 2.4, y + 2.1, x + 1.2, y + 0.1, 'F')
  else if (tipo === '▼') doc.triangle(x, y + 0.1, x + 2.4, y + 0.1, x + 1.2, y + 2.1, 'F')
  else {
    doc.rect(x, y + 0.6, 2.4, 0.5, 'F')
    doc.rect(x, y + 1.5, 2.4, 0.5, 'F')
  }
}

function kpis(doc: jsPDF, lista: KpiPdf[], y: number): number {
  const ALTURA_DA_CAIXA = 27
  const VAO = 4
  y = espaco(doc, y, 8 + ALTURA_DA_CAIXA)
  y = rotuloDeSecao(doc, 'Indicadores do período', y)
  let i = 0
  for (const porLinha of linhasDeKpis(lista.length)) {
    y = espaco(doc, y, ALTURA_DA_CAIXA)
    const largura = (UTIL - VAO * (porLinha - 1)) / porLinha
    for (let c = 0; c < porLinha; c++, i++) {
      const k = lista[i]
      const x = MARGEM + c * (largura + VAO)
      doc.setFillColor('#fbf8f5')
      doc.setDrawColor('#ece3da')
      doc.setLineWidth(0.25)
      doc.roundedRect(x, y, largura, ALTURA_DA_CAIXA, 1.5, 1.5, 'FD')
      doc.setFillColor(COR.cobre)
      doc.rect(x, y + 4, 0.9, ALTURA_DA_CAIXA - 8, 'F')
      const dentro = x + 5
      const util = largura - 9
      escrever(doc, k.titulo, dentro, y + 3.5, { tamanho: 8.5, negrito: true, largura: util })
      if (k.extenso) escrever(doc, k.extenso, dentro, y + 7.6, { tamanho: 7, cor: COR.apagado, largura: util })
      escrever(doc, k.valor, dentro, y + 11.2, { tamanho: 15, negrito: true, largura: util })
      // a variação: seta desenhada (a fonte não tem ▲▼), o número na cor do tom e o "vs." em cinza
      const cor = k.tom === 'bom' ? COR.bom : k.tom === 'ruim' ? COR.ruim : COR.apagado
      const yv = y + 19
      seta(doc, k.seta, dentro, yv + 0.2, cor)
      const xNumero = dentro + 3.6
      escrever(doc, k.variacao, xNumero, yv, { tamanho: 7.5, cor, negrito: true, largura: util })
      const contra = `vs. ${k.contra}`
      const xContra = xNumero + larguraDoTexto(doc, k.variacao, 7.5, true) + 1.5
      if (xContra + larguraDoTexto(doc, contra, 7.5) <= dentro + util) escrever(doc, contra, xContra, yv, { tamanho: 7.5, cor: COR.apagado })
      else escrever(doc, contra, dentro, yv + 3.3, { tamanho: 7.5, cor: COR.apagado, largura: util })
    }
    y += ALTURA_DA_CAIXA + VAO
  }
  return y + 3
}

/** O título com a barra de cobre ao lado; devolve a altura usada. */
function tituloDoBloco(doc: jsPDF, titulo: string, y: number): number {
  const altura = alturaDoTexto(doc, titulo, 12.5, UTIL - 4.5, true)
  doc.setFillColor(COR.cobre)
  doc.rect(MARGEM, y + 0.3, 1.1, altura - 0.8, 'F')
  escrever(doc, titulo, MARGEM + 4.5, y, { tamanho: 12.5, negrito: true, largura: UTIL - 4.5 })
  return altura
}

function cartao(doc: jsPDF, c: CartaoPdf, imagem: string | null, y: number): number {
  const alturaTitulo = alturaDoTexto(doc, c.titulo, 12.5, UTIL - 4.5, true)
  const alturaFrase = alturaDoTexto(doc, c.frase, 9.5, UTIL - 4.5)
  const alturaImagem = imagem ? (UTIL * c.altura) / LARGURA_DO_GRAFICO_PX : 0
  const linhas = c.tabela?.linhas.length ?? 0
  const comecoDaTabela = linhas === 0 ? 0 : (1 + (linhas <= TABELA_CURTA ? linhas : 3)) * LINHA_DA_TABELA
  // título, frase, gráfico e a tabela curta (ou o começo da longa) ficam juntos na mesma página
  y = espaco(doc, y, alturaTitulo + 1.5 + alturaFrase + 4 + alturaImagem + comecoDaTabela)
  y += tituloDoBloco(doc, c.titulo, y) + 1.5
  y += escrever(doc, c.frase, MARGEM + 4.5, y, { tamanho: 9.5, cor: COR.texto2, largura: UTIL - 4.5 }) + 3
  if (imagem) {
    doc.addImage(imagem, 'PNG', MARGEM, y, UTIL, alturaImagem)
    y += alturaImagem + 3
  }
  if (c.tabela && c.tabela.linhas.length > 0) {
    const numericas = c.tabela.numericas
    autoTable(doc, {
      startY: y,
      head: [c.tabela.cabecalho.map(paraOPapel)],
      body: c.tabela.linhas.map((l) => l.map(paraOPapel)),
      theme: 'plain',
      margin: { left: MARGEM, right: MARGEM, top: TOPO_SEGUINTES, bottom: ALTURA - LIMITE },
      styles: { font: FONTE, fontSize: 8.2, textColor: RGB.tinta, cellPadding: { top: 1.4, bottom: 1.4, left: 2.2, right: 2.2 }, lineColor: RGB.linha, lineWidth: { bottom: 0.2 }, valign: 'middle' },
      // número não quebra linha ("R$ 4,4 mi" inteiro); o texto ocupa o resto
      columnStyles: Object.fromEntries(numericas.flatMap((n, i) => (n ? [[i, { cellWidth: 'wrap' as const, halign: 'right' as const }]] : []))),
      headStyles: { fontStyle: 'bold', fillColor: RGB.cabecalhoTabela, textColor: RGB.textoCabecalho },
      alternateRowStyles: { fillColor: RGB.zebra },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      didParseCell: (d) => {
        if (numericas[d.column.index]) d.cell.styles.halign = 'right'
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  }
  return y + 7
}

function texto(doc: jsPDF, t: TextoPdf, y: number): number {
  y = espaco(doc, y, 30)
  y += tituloDoBloco(doc, t.titulo, y) + 3
  for (const bloco of t.blocos) {
    y = espaco(doc, y, 14)
    y += escrever(doc, bloco.titulo, MARGEM + 4.5, y, { tamanho: 10, negrito: true }) + 1.5
    for (const item of bloco.itens) {
      const altura = alturaDoTexto(doc, item, 9, UTIL - 10)
      y = espaco(doc, y, altura)
      doc.setFillColor(COR.cobre)
      doc.circle(MARGEM + 6.2, y + 1.6, 0.6, 'F')
      y += escrever(doc, item, MARGEM + 9, y, { tamanho: 9, cor: COR.texto2, largura: UTIL - 10 }) + 1.2
    }
    y += 3
  }
  return y + 5
}

/** Monta o PDF e baixa o arquivo. */
export async function gerarPdf(pedido: PedidoDePdf): Promise<void> {
  // as fontes do canvas (o gráfico) e as do PDF, e o logo, antes de desenhar
  const [[normal, negrito], logo] = await Promise.all([carregarFontes(), logoEscuro(), document.fonts.ready])

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.addFileToVFS('LexendDeca-400.ttf', normal)
  doc.addFont('LexendDeca-400.ttf', FONTE, 'normal')
  doc.addFileToVFS('LexendDeca-600.ttf', negrito)
  doc.addFont('LexendDeca-600.ttf', FONTE, 'bold')
  doc.setProperties({ title: `ADR · ${pedido.nomeDaTela} · ${pedido.filtros}`, subject: 'Painel de Dados ADR (dados simulados)', author: 'Painel de Dados ADR', creator: 'Painel de Dados ADR' })

  let y = cabecalhoDaPrimeira(doc, pedido, logo)
  for (const grupo of agruparKpis(pedido.entradas)) {
    if (Array.isArray(grupo)) y = kpis(doc, grupo, y)
    else if (grupo.tipo === 'texto') y = texto(doc, grupo, y)
    else y = cartao(doc, grupo, grupo.opcao ? imagemDoGrafico(grupo.opcao, grupo.altura) : null, y)
  }

  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    if (p > 1) cabecalhoDasSeguintes(doc, pedido, logo)
    rodape(doc, p, total)
  }
  doc.save(pedido.arquivo)
}
