import { useState } from 'react'
import { Cartao } from '../componentes/Cartao.tsx'
import { FotoEmpreendimento } from '../componentes/FotoEmpreendimento.tsx'
import { Grafico } from '../componentes/Grafico.tsx'
import { EMPREENDIMENTOS, STATUS } from '../empreendimentos.ts'
import { inteiro, moedaCompacta, pct, reais } from '../formatar.ts'
import { GLOSSARIO } from '../glossario.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'
import {
  type LinhaCaixa, type LinhaEmpreendimento, type LinhaEstatisticas, type LinhaRitmo, type LinhaVistaMar,
  respostaDistribuicao, respostaEmpreendimentos, respostaEstatisticas, respostaRitmo, respostaVistaMar,
} from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

const fracao = (v: number | null) => (v === null ? '—' : pct(v))
const fracaoInteira = (v: number) => pct(v, 0)

export function VendasEstoque({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
      <Cartao<LinhaEmpreendimento>
        id="empreendimentos"
        titulo="Como está cada empreendimento?"
        consulta="vendas-estoque/empreendimentos"
        params={params}
        resposta={respostaEmpreendimentos}
        conteudo={(linhas) => <Empreendimentos linhas={linhas} />}
        colunas={[
          { chave: 'nome', titulo: 'Empreendimento' },
          { chave: 'status', titulo: 'Status', formato: (s: string) => STATUS[s] ?? s },
          { chave: 'unidades', titulo: 'Unidades', numerica: true, formato: inteiro },
          { chave: 'vendidas', titulo: 'Vendidas', numerica: true, formato: inteiro },
          { chave: 'estoque', titulo: 'Estoque', numerica: true, formato: inteiro },
          { chave: 'vso', titulo: 'VSO', numerica: true, formato: fracao },
          { chave: 'vgv', titulo: 'VGV do período', numerica: true, formato: moedaCompacta },
          { chave: 'interessados', titulo: 'Lista de interesse', numerica: true, formato: inteiro },
        ]}
      />

      <Cartao<LinhaRitmo>
        id="ritmo"
        titulo="Em que ritmo cada lançamento vendeu?"
        consulta="vendas-estoque/ritmo_acumulado"
        params={params}
        resposta={respostaRitmo}
        altura={190}
        conteudo={(linhas) => <Ritmo linhas={linhas} />}
        colunas={[
          { chave: 'nome', titulo: 'Empreendimento' },
          { chave: 'mes_desde_lancamento', titulo: 'Mês desde o lançamento', numerica: true, formato: inteiro },
          { chave: 'vendidas_acumuladas', titulo: 'Vendidas (acumulado)', numerica: true, formato: inteiro },
          { chave: 'pct_vendido', titulo: 'Parte vendida', numerica: true, formato: fracaoInteira },
        ]}
      />

      <Cartao<LinhaCaixa>
        id="preco-m2"
        titulo="Quanto custa o m² em cada empreendimento?"
        consulta="vendas-estoque/preco_m2_distribuicao"
        params={params}
        resposta={respostaDistribuicao}
        formatoDoValor={reais}
        altura={260}
        grafico={(linhas) => graficoDaCaixa(linhas)}
        colunas={[
          { chave: 'nome', titulo: 'Empreendimento' },
          { chave: 'minimo', titulo: 'Mínimo', numerica: true, formato: reais },
          { chave: 'q1', titulo: 'Q1', numerica: true, formato: reais },
          { chave: 'mediana', titulo: 'Mediana', numerica: true, formato: reais },
          { chave: 'q3', titulo: 'Q3', numerica: true, formato: reais },
          { chave: 'maximo', titulo: 'Máximo', numerica: true, formato: reais },
          { chave: 'outliers', titulo: 'Fora da curva', formato: (o: number[]) => (o.length === 0 ? 'nenhuma' : o.map(reais).join('; ')) },
        ]}
      />

      <Cartao<LinhaEstatisticas>
        id="estatisticas"
        titulo="Qual o preço por m² típico, e quanto ele varia?"
        consulta="vendas-estoque/preco_m2_estatisticas"
        params={params}
        resposta={respostaEstatisticas}
        altura={110}
        conteudo={([l]) => <Estatisticas linha={l} />}
        colunas={[
          { chave: 'n', titulo: 'Vendas', numerica: true, formato: inteiro },
          ...(['media', 'mediana', 'moda', 'desvio_padrao', 'p25', 'p50', 'p75', 'p90'] as const).map((chave) => ({
            chave, titulo: GLOSSARIO[chave].termo, numerica: true, formato: (v: number | null) => (v === null ? '—' : reais(v)),
          })),
        ]}
      />

      <Cartao<LinhaVistaMar>
        id="vista-mar"
        titulo="A vista mar faz a unidade valer mais e vender mais rápido?"
        consulta="vendas-estoque/vista_mar"
        params={params}
        resposta={respostaVistaMar}
        altura={110}
        conteudo={(linhas) => <VistaMar linhas={linhas} />}
        colunas={[
          { chave: 'vista_mar', titulo: 'Vista mar', formato: (v: boolean) => (v ? 'com vista' : 'sem vista') },
          { chave: 'unidades', titulo: 'Unidades', numerica: true, formato: inteiro },
          { chave: 'vendas', titulo: 'Vendas no período', numerica: true, formato: inteiro },
          { chave: 'preco_m2_medio', titulo: 'Preço médio do m²', numerica: true, formato: (v: number | null) => (v === null ? '—' : reais(v)) },
          { chave: 'pct_vendidas_6_meses', titulo: 'Vendidas nos 6 primeiros meses', numerica: true, formato: (v: number | null) => (v === null ? '—' : pct(v, 0)) },
        ]}
      />
    </div>
  )
}

/** Um cartão por empreendimento: foto, status, barra vendido × estoque, VSO; o pré-lançamento, só a lista de interesse. */
function Empreendimentos({ linhas }: { linhas: LinhaEmpreendimento[] }) {
  const lancados = linhas.filter((l) => l.unidades > 0)
  const preLancamento = linhas.filter((l) => l.unidades === 0)
  return (
    <>
      {lancados.length > 0 && (
        <ul className={css.empreendimentos} aria-label="Lançados">
          {lancados.map((l) => {
            const parte = l.vendidas / l.unidades
            return (
              <li key={l.empreendimento_id} className={css.empreendimento}>
                <FotoEmpreendimento empreendimento={EMPREENDIMENTOS.find((e) => e.id === l.empreendimento_id)!} />
                <Topo linha={l} />
                <div className={css.barra} role="img" aria-label={`${inteiro(l.vendidas)} de ${inteiro(l.unidades)} unidades vendidas`}>
                  <span style={{ width: `${parte * 100}%` }} />
                </div>
                <p className={css.legendaBarra}>
                  <span className="numero">{inteiro(l.vendidas)}</span> vendidas ({pct(parte, 0)}) · <span className="numero">{inteiro(l.estoque)}</span> em estoque
                </p>
                <dl className={css.numeros}>
                  <div><dt>VSO no período</dt><dd className="numero">{fracao(l.vso)}</dd></div>
                  <div><dt>VGV no período</dt><dd className="numero">{moedaCompacta(l.vgv)}</dd></div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}
      {preLancamento.length > 0 && (
        <ul className={css.preLancamento} aria-label="Em pré-lançamento: só a lista de interesse">
          {preLancamento.map((l) => (
            <li key={l.empreendimento_id} className={css.empreendimento}>
              <Topo linha={l} />
              <dl className={css.numeros}>
                <div><dt>Lista de interesse</dt><dd className="numero">{inteiro(l.interessados)} {l.interessados === 1 ? 'pessoa' : 'pessoas'}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Topo({ linha }: { linha: LinhaEmpreendimento }) {
  return (
    <div className={css.empreendimentoTopo}>
      <h3>{linha.nome}</h3>
      <span className={css.status}>{STATUS[linha.status] ?? linha.status}</span>
    </div>
  )
}

/** Um gráfico pequeno por lançamento, com o mesmo eixo nos 4 (0 a 100% e os mesmos meses), para comparar a forma. */
function Ritmo({ linhas }: { linhas: LinhaRitmo[] }) {
  const ids = [...new Set(linhas.map((l) => l.empreendimento_id))]
  const meses = Math.max(...linhas.map((l) => l.mes_desde_lancamento))
  return (
    <ul className={css.multiplos}>
      {ids.map((id) => {
        const serie = linhas.filter((l) => l.empreendimento_id === id)
        const nome = serie[0].nome
        const ultima = serie.at(-1)!
        return (
          <li key={id}>
            <h3 className={css.multiploTitulo}>{nome} <span>{pct(ultima.pct_vendido, 0)} em {inteiro(ultima.mes_desde_lancamento)} meses</span></h3>
            <Grafico
              altura={160}
              rotulo={`${nome}: parte das unidades vendida mês a mês desde o lançamento.`}
              formatoDoValor={fracaoInteira}
              opcao={{
                grid: { left: 40, right: 12, top: 12, bottom: 28 },
                tooltip: {
                  trigger: 'axis', axisPointer: { type: 'line' },
                  formatter: (p) => {
                    const [ponto] = p as unknown as { data: [number, number] }[]
                    return `mês ${ponto.data[0]} desde o lançamento<br/><b>${pct(ponto.data[1], 0)}</b> vendido`
                  },
                },
                xAxis: { type: 'value', min: 1, max: meses, minInterval: 1, axisLabel: { showMaxLabel: false }, name: 'meses', nameLocation: 'end', nameGap: 4, nameTextStyle: { verticalAlign: 'top', padding: [8, 0, 0, 0] } },
                yAxis: { type: 'value', min: 0, max: 1, interval: 0.5, axisLabel: { formatter: (v: number) => pct(v, 0) } },
                series: [{
                  type: 'line', data: serie.map((l) => [l.mes_desde_lancamento, l.pct_vendido]), showSymbol: false,
                  lineStyle: { color: PALETA.cobre, width: 2 }, itemStyle: { color: PALETA.cobre },
                  areaStyle: { color: PALETA.cobre, opacity: 0.12 },
                }],
              }}
            />
          </li>
        )
      })}
    </ul>
  )
}

/** Boxplot deitado (o nome cabe no eixo), com as vendas fora da curva como pontos. */
function graficoDaCaixa(linhas: LinhaCaixa[]) {
  const nomes = linhas.map((l) => l.nome)
  const temFora = linhas.some((l) => l.outliers.length > 0)
  return {
    grid: { left: 130, right: 24, top: temFora ? 36 : 12, bottom: 32 },
    legend: temFora ? { top: 0, right: 0, data: ['Vendas do período', 'Fora da curva'] } : undefined,
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: unknown) => {
        const { seriesType, name, data } = p as { seriesType: string; name: string; data: number[] }
        if (seriesType === 'scatter') return `${nomes[data[1]]}<br/>fora da curva: <b>${reais(data[0])}</b> por m²`
        const [, min, q1, med, q3, max] = data
        return `${name}<br/>máximo ${reais(max)}<br/>Q3 ${reais(q3)}<br/><b>mediana ${reais(med)}</b><br/>Q1 ${reais(q1)}<br/>mínimo ${reais(min)}`
      },
    },
    xAxis: { type: 'value' as const, scale: true, name: 'R$ por m²', nameLocation: 'middle' as const, nameGap: 24, axisLabel: { formatter: (v: number) => `${inteiro(v / 1000)} mil` } },
    yAxis: { type: 'category' as const, data: nomes, inverse: true },
    series: [
      {
        type: 'boxplot' as const, name: 'Vendas do período', boxWidth: [8, 22],
        data: linhas.map((l) => [l.minimo, l.q1, l.mediana, l.q3, l.maximo]),
      },
      {
        type: 'scatter' as const, name: 'Fora da curva', symbolSize: 8,
        itemStyle: { color: PALETA.fundo, borderColor: PALETA.texto, borderWidth: 2 },
        data: linhas.flatMap((l, i) => l.outliers.map((o) => [o, i])),
      },
    ],
  }
}

/** As estatísticas do preço/m², cada uma com o "?" que explica o termo numa frase. */
function Estatisticas({ linha }: { linha: LinhaEstatisticas }) {
  const [aberto, setAberto] = useState<string | null>(null)
  const chaves = ['media', 'mediana', 'moda', 'desvio_padrao', 'p25', 'p50', 'p75', 'p90'] as const
  if (linha.n === 0) return null  // a frase-resposta já diz que não há vendas
  return (
    <div className={css.estatisticas}>
      <dl>
        {chaves.map((chave) => {
          const valor = linha[chave]
          const { termo, explicacao } = GLOSSARIO[chave]
          return (
            <div key={chave} className={css.estatistica}>
              <dt>
                {termo}
                <button type="button" className={css.ajuda} aria-expanded={aberto === chave} aria-controls={`ajuda-${chave}`}
                  aria-label={`O que é ${termo}?`} onClick={() => setAberto(aberto === chave ? null : chave)}>?</button>
              </dt>
              <dd className="numero">{valor === null ? '—' : reais(valor)}</dd>
              <p id={`ajuda-${chave}`} className={css.explicacao} hidden={aberto !== chave}>{explicacao}</p>
            </div>
          )
        })}
      </dl>
      <p className={css.notaRodape}>Sobre {inteiro(linha.n)} {linha.n === 1 ? 'venda' : 'vendas'} do período.</p>
    </div>
  )
}

/** Dois gráficos pequenos, um eixo cada: o preço do m² e a parte vendida nos 6 primeiros meses. */
function VistaMar({ linhas }: { linhas: LinhaVistaMar[] }) {
  const com = linhas.find((l) => l.vista_mar)!
  const sem = linhas.find((l) => !l.vista_mar)!
  if (com.preco_m2_medio === null && sem.preco_m2_medio === null && com.pct_vendidas_6_meses === null && sem.pct_vendidas_6_meses === null) return null
  const categorias = ['Com vista mar', 'Sem vista']
  const barras = (valores: (number | null)[], formato: (v: number) => string) => ({
    grid: { left: 104, right: 72, top: 4, bottom: 4 },
    xAxis: { type: 'value' as const, show: false, min: 0 },
    yAxis: { type: 'category' as const, data: categorias, inverse: true, axisLine: { show: false } },
    tooltip: { show: false },
    series: [{
      type: 'bar' as const, barWidth: 20,
      data: valores.map((v, i) => ({ value: v, itemStyle: { color: i === 0 ? PALETA.cobre : PALETA.cinza, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: PALETA.texto, formatter: (p: { value: unknown }) => (typeof p.value === 'number' ? formato(p.value) : '—') },
    }],
  })
  return (
    <div className={css.multiplosDois}>
      <div>
        <h3 className={css.multiploTitulo}>Preço médio do m² (vendas do período)</h3>
        <Grafico altura={90} rotulo={`Preço médio do m²: com vista mar ${com.preco_m2_medio === null ? 'sem vendas' : reais(com.preco_m2_medio)}, sem vista ${sem.preco_m2_medio === null ? 'sem vendas' : reais(sem.preco_m2_medio)}.`}
          opcao={barras([com.preco_m2_medio, sem.preco_m2_medio], reais)} />
      </div>
      <div>
        <h3 className={css.multiploTitulo}>Unidades vendidas nos 6 primeiros meses do lançamento</h3>
        <Grafico altura={90} rotulo={`Vendidas nos 6 primeiros meses: com vista mar ${com.pct_vendidas_6_meses === null ? '—' : pct(com.pct_vendidas_6_meses, 0)}, sem vista ${sem.pct_vendidas_6_meses === null ? '—' : pct(sem.pct_vendidas_6_meses, 0)}.`}
          opcao={barras([com.pct_vendidas_6_meses, sem.pct_vendidas_6_meses], fracaoInteira)} />
      </div>
    </div>
  )
}
