// O ECharts do painel (D5.4): só o que se usa, importado de echarts/core, com o tema da ADR. Este
// componente cuida do init, do redimensionamento e do dispose; o cartão só monta a opção.
import type { EChartsOption } from 'echarts'
import { BarChart, BoxplotChart, LineChart, ScatterChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { inteiro } from '../formatar.ts'
import { TEMA, TEMA_ECHARTS, animacaoDosGraficos } from '../tema/echarts.ts'

echarts.use([BarChart, BoxplotChart, LineChart, ScatterChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, SVGRenderer])
echarts.registerTheme(TEMA, TEMA_ECHARTS)

type Props = {
  opcao: EChartsOption
  /** Descrição do gráfico para leitor de tela (o ECharts acrescenta os dados). */
  rotulo: string
  /** Como o balão escreve cada valor; o padrão é o inteiro com ponto de milhar. */
  formatoDoValor?: (valor: number) => string
  altura?: number
}

export function Grafico({ opcao, rotulo, formatoDoValor = inteiro, altura = 280 }: Props) {
  const div = useRef<HTMLDivElement>(null)
  const grafico = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const g = echarts.init(div.current!, TEMA, { renderer: 'svg' })
    grafico.current = g
    const observador = new ResizeObserver(() => g.resize())
    observador.observe(div.current!)
    return () => {
      observador.disconnect()
      g.dispose()
      grafico.current = null
    }
  }, [])

  useEffect(() => {
    // o balão de todo gráfico escreve os valores no formato brasileiro (formatar.ts)
    const base: EChartsOption = {
      ...animacaoDosGraficos(window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      aria: { enabled: true, label: { description: rotulo } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => (typeof v === 'number' ? formatoDoValor(v) : String(v ?? '—')),
      },
    }
    grafico.current?.setOption({ ...base, ...opcao }, true)
  }, [opcao, rotulo, formatoDoValor])

  return <div ref={div} className="grafico" style={{ height: altura, width: '100%' }} />
}
