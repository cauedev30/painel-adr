// O PDF dos cartões que na tela não são um gráfico só (fotos, gráficos pequenos lado a lado, mapa de calor):
// aqui fica o gráfico que vai para o papel e, quando a tabela da tela é longa demais, uma tabela enxuta.
// As cores são as do painel; gerar.ts as troca pelas do papel.
import type { EChartsOption } from 'echarts'
import { nomeDoCanal } from '../canais.ts'
import { inteiro, moedaCompacta, pct } from '../formatar.ts'
import type { TabelaPdf } from '../pdf/conteudo.ts'
import { PALETA } from '../tema/paleta.ts'
import type { LinhaCanal, LinhaEmpreendimento, LinhaMapaCalor, LinhaRitmo } from './respostas.ts'
import { rotuloDaFaixa } from './respostas.ts'

type GraficoDoPdf = { opcao: EChartsOption; altura: number }

const tituloPequeno = { fontSize: 13, fontWeight: 600, color: PALETA.texto }

/** Vendidas × estoque de cada lançado, em barra empilhada, com a parte vendida e o VSO ao lado. */
export function pdfEmpreendimentos(linhas: LinhaEmpreendimento[]): GraficoDoPdf {
  const lancados = linhas.filter((l) => l.unidades > 0)
  return {
    altura: 44 + lancados.length * 38,
    opcao: {
      grid: { left: 150, right: 190, top: 34, bottom: 4 },
      legend: { top: 0, left: 0, data: ['Vendidas', 'Em estoque'] },
      xAxis: { type: 'value', show: false, min: 0 },
      yAxis: { type: 'category', data: lancados.map((l) => l.nome), inverse: true, axisLine: { show: false } },
      series: [
        {
          type: 'bar', name: 'Vendidas', stack: 'unidades', barWidth: 20, data: lancados.map((l) => l.vendidas),
          itemStyle: { color: PALETA.cobre },
          label: { show: true, position: 'insideLeft', color: '#ffffff', formatter: (p: { value: unknown }) => inteiro(Number(p.value)) },
        },
        {
          type: 'bar', name: 'Em estoque', stack: 'unidades', data: lancados.map((l) => l.estoque),
          itemStyle: { color: PALETA.cinza, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true, position: 'right', color: PALETA.texto,
            formatter: ({ dataIndex }: { dataIndex: number }) => {
              const l = lancados[dataIndex]
              return `${pct(l.vendidas / l.unidades, 0)} vendido · VSO ${l.vso === null ? '—' : pct(l.vso)}`
            },
          },
        },
      ],
    },
  }
}

/** Os lançamentos em gráficos pequenos, 2 por linha, com o mesmo eixo (0 a 100% e os mesmos meses). */
export function pdfRitmo(linhas: LinhaRitmo[]): GraficoDoPdf {
  const ids = [...new Set(linhas.map((l) => l.empreendimento_id))]
  const meses = Math.max(...linhas.map((l) => l.mes_desde_lancamento))
  const ALTURA_DA_LINHA = 180
  const pos = (i: number) => ({ esquerda: i % 2 === 0 ? 48 : 458, topo: Math.floor(i / 2) * ALTURA_DA_LINHA })
  return {
    altura: Math.ceil(ids.length / 2) * ALTURA_DA_LINHA,
    opcao: {
      title: ids.map((id, i) => {
        const serie = linhas.filter((l) => l.empreendimento_id === id)
        const ultima = serie.at(-1)!
        return { text: `${ultima.nome} · ${pct(ultima.pct_vendido, 0)} em ${inteiro(ultima.mes_desde_lancamento)} meses`, left: pos(i).esquerda - 40, top: pos(i).topo + 4, textStyle: tituloPequeno }
      }),
      grid: ids.map((_, i) => ({ left: pos(i).esquerda, top: pos(i).topo + 36, width: 320, height: 110 })),
      // o eixo x são os meses desde o lançamento: o título de cada um já diz "em N meses"
      xAxis: ids.map((_, i) => ({ type: 'value' as const, gridIndex: i, min: 1, max: meses, minInterval: 1, axisLabel: { showMaxLabel: false } })),
      yAxis: ids.map((_, i) => ({ type: 'value' as const, gridIndex: i, min: 0, max: 1, interval: 0.5, axisLabel: { formatter: (v: number) => pct(v, 0) } })),
      series: ids.map((id, i) => ({
        type: 'line' as const, xAxisIndex: i, yAxisIndex: i, showSymbol: false,
        data: linhas.filter((l) => l.empreendimento_id === id).map((l) => [l.mes_desde_lancamento, l.pct_vendido]),
        lineStyle: { color: PALETA.cobre, width: 2 }, itemStyle: { color: PALETA.cobre }, areaStyle: { color: PALETA.cobre, opacity: 0.12 },
      })),
    },
  }
}

/** A tabela do ritmo no PDF: onde cada lançamento está hoje (a tela tem a série mês a mês). */
export function tabelaRitmo(linhas: LinhaRitmo[]): TabelaPdf {
  const ultimas = [...new Set(linhas.map((l) => l.empreendimento_id))].map((id) => linhas.filter((l) => l.empreendimento_id === id).at(-1)!)
  return {
    cabecalho: ['Empreendimento', 'Meses desde o lançamento', 'Vendidas (acumulado)', 'Parte vendida'],
    linhas: ultimas.map((l) => [l.nome, inteiro(l.mes_desde_lancamento), inteiro(l.vendidas_acumuladas), pct(l.pct_vendido, 0)]),
    numericas: [false, true, true, true],
  }
}

/** Leads e conversão por canal, lado a lado e na mesma ordem, com o maior de cada um em cobre. */
export function pdfCanais(linhas: LinhaCanal[], maisConverte: string | undefined): GraficoDoPdf {
  const nomes = linhas.map((l) => nomeDoCanal(l.canal))
  const maisLeads = linhas.reduce((a, b) => (b.leads > a.leads ? b : a)).canal
  const lado = (i: number, valores: number[], destaque: string | undefined, formato: (v: number) => string) => ({
    grid: { left: i === 0 ? 100 : 520, top: 30, width: 210, bottom: 4 },
    xAxis: { type: 'value' as const, gridIndex: i, show: false, min: 0 },
    yAxis: { type: 'category' as const, gridIndex: i, data: nomes, inverse: true, axisLine: { show: false } },
    series: {
      type: 'bar' as const, xAxisIndex: i, yAxisIndex: i, barWidth: 14,
      data: valores.map((v, j) => ({ value: v, itemStyle: { color: linhas[j].canal === destaque ? PALETA.cobre : PALETA.cinza, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: PALETA.texto, formatter: (p: { value: unknown }) => formato(Number(p.value)) },
    },
  })
  const leads = lado(0, linhas.map((l) => l.leads), maisLeads, inteiro)
  const conversao = lado(1, linhas.map((l) => l.conversao), maisConverte, (v) => pct(v))
  return {
    altura: 40 + linhas.length * 26,
    opcao: {
      title: [
        { text: 'Leads que entraram', left: 0, top: 0, textStyle: tituloPequeno },
        { text: 'Conversão em venda', left: 420, top: 0, textStyle: tituloPequeno },
      ],
      grid: [leads.grid, conversao.grid],
      xAxis: [leads.xAxis, conversao.xAxis],
      yAxis: [leads.yAxis, conversao.yAxis],
      series: [leads.series, conversao.series],
    },
  }
}

/** O mapa de calor no PDF: empreendimento nas linhas, faixa de atraso nas colunas e o total. */
export function tabelaMapaCalor(linhas: LinhaMapaCalor[]): TabelaPdf {
  const nomes = [...new Map(linhas.map((l) => [l.empreendimento_id, l.nome])).entries()]
  const faixas = [...new Map(linhas.map((l) => [l.ordem, l.faixa])).entries()].sort((a, b) => a[0] - b[0])
  const saldo = (id: number, ordem: number) => linhas.find((l) => l.empreendimento_id === id && l.ordem === ordem)?.saldo ?? 0
  const escrever = (v: number) => (v === 0 ? '—' : moedaCompacta(v))
  return {
    cabecalho: ['Empreendimento', ...faixas.map(([, f]) => rotuloDaFaixa(f)), 'Total'],
    linhas: nomes.map(([id, nome]) => {
      const valores = faixas.map(([ordem]) => saldo(id, ordem))
      return [nome, ...valores.map(escrever), escrever(valores.reduce((a, b) => a + b, 0))]
    }),
    numericas: [false, ...faixas.map(() => true), true],
  }
}
