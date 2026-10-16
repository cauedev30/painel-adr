// Tema dos gráficos (D5.4): fundo transparente, eixos e grade recessivos em cinza, a série principal
// em cobre e as outras em cinza, balão na superfície 2 e a fonte do texto. O componente Grafico
// registra este tema uma vez, com o nome TEMA.
import type { EChartsOption } from 'echarts'
import { PALETA } from './paleta.ts'

export const TEMA = 'adr'

const fonte = "'Lexend Deca', system-ui, sans-serif"

const eixo = {
  axisLine: { show: true, lineStyle: { color: PALETA.borda } },
  axisTick: { show: false },
  axisLabel: { color: PALETA.texto2, fontFamily: fonte, fontSize: 12 },
  splitLine: { show: false },
  nameTextStyle: { color: PALETA.texto2, fontFamily: fonte },
}

export const TEMA_ECHARTS = {
  color: [PALETA.cobre, PALETA.cinza],
  backgroundColor: 'transparent',
  textStyle: { fontFamily: fonte, color: PALETA.texto2 },
  legend: {
    textStyle: { color: PALETA.texto2, fontFamily: fonte, fontSize: 12 },
    itemWidth: 12,
    itemHeight: 12,
    icon: 'roundRect',
  },
  tooltip: {
    backgroundColor: PALETA.superficie2,
    borderColor: PALETA.borda,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: PALETA.texto, fontFamily: fonte, fontSize: 13 },
    axisPointer: {
      lineStyle: { color: PALETA.texto2, type: 'dashed' },
      crossStyle: { color: PALETA.texto2 },
      shadowStyle: { color: 'rgba(255, 255, 255, 0.04)' },
    },
  },
  categoryAxis: eixo,
  timeAxis: eixo,
  valueAxis: {
    ...eixo,
    axisLine: { show: false },
    splitLine: { show: true, lineStyle: { color: PALETA.borda, opacity: 0.7 } },
  },
  // marcas finas: linha de 2 px, marcador de 8 px, barra com a ponta arredondada (dataviz)
  line: { lineStyle: { width: 2 }, symbolSize: 8, symbol: 'circle' },
  bar: { itemStyle: { borderRadius: [4, 4, 0, 0] } },
}

/** Atraso entre uma barra e a seguinte, e o teto dele: o gráfico de muitos pontos não fica esperando. */
export const PASSO_DAS_BARRAS = 30
export const ATRASO_MAXIMO = 300
/** Quanto a barra leva para crescer (--duracao-barra). */
export const DURACAO_DA_BARRA = 600
/** A espera do primeiro desenho: a duração da entrada do cartão (--duracao-entrada), como a barra vendido × estoque. */
export const ATRASO_DA_ENTRADA = 320

/**
 * O movimento dos gráficos (os mesmos tempos de estilos/tokens.css): no primeiro desenho (`entrada`), as
 * barras crescem do eixo em 600 ms, depois da entrada do cartão e uma 30 ms depois da outra, e as linhas
 * se desenham da esquerda; na troca de filtro, mudam em 400 ms. Anima sempre, mesmo com "reduzir
 * movimento" ligado no sistema (D14): o painel é apresentado em máquinas que não são a do Cauê.
 */
export function animacaoDosGraficos(entrada = false): EChartsOption {
  const espera = entrada ? ATRASO_DA_ENTRADA : 0
  return {
    animation: true,
    animationDuration: DURACAO_DA_BARRA,
    animationEasing: 'cubicOut',
    // a linha e a área pedem o atraso sem índice: valem como o primeiro ponto
    animationDelay: (i: number) => espera + Math.min((i || 0) * PASSO_DAS_BARRAS, ATRASO_MAXIMO),
    animationDurationUpdate: 400,
  }
}

/** Do primeiro desenho até a última barra terminar de crescer. */
export const FIM_DA_ENTRADA = ATRASO_DA_ENTRADA + ATRASO_MAXIMO + DURACAO_DA_BARRA

/**
 * Como redimensionar o gráfico `ms` depois do primeiro desenho. O resize do ECharts redesenha sem
 * animação e cortaria o crescimento das barras (o cartão muda de largura quando a barra de rolagem
 * aparece, enquanto os outros cartões carregam): durante a entrada, ele segue animado, com o mesmo ritmo.
 */
export function animacaoDoRedimensionamento(ms: number): { animation: { duration: number; easing: 'cubicOut' } } | undefined {
  if (ms >= FIM_DA_ENTRADA) return undefined
  return { animation: { duration: DURACAO_DA_BARRA, easing: 'cubicOut' } }
}
