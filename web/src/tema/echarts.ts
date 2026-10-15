// Tema dos gráficos (D5.4): fundo transparente, eixos e grade recessivos em cinza, a série principal
// em cobre e as outras em cinza, balão na superfície 2 e a fonte do texto. O componente Grafico
// registra este tema uma vez, com o nome TEMA.
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
  boxplot: { itemStyle: { color: PALETA.superficie2, borderColor: PALETA.cobre, borderWidth: 2 } },
}
