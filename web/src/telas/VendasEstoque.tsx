import { Cartao } from '../componentes/Cartao.tsx'
import { FotoEmpreendimento } from '../componentes/FotoEmpreendimento.tsx'
import { Grafico } from '../componentes/Grafico.tsx'
import { EMPREENDIMENTOS, STATUS } from '../empreendimentos.ts'
import { inteiro, moedaCompacta, pct } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'
import {
  type LinhaEmpreendimento, type LinhaRitmo, respostaEmpreendimentos, respostaRitmo,
} from './respostas.ts'
import { pdfEmpreendimentos, pdfRitmo, tabelaRitmo } from './pdf.ts'
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
        pdf={{ grafico: pdfEmpreendimentos }}
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
        pdf={{ grafico: pdfRitmo, tabela: tabelaRitmo }}
        colunas={[
          { chave: 'nome', titulo: 'Empreendimento' },
          { chave: 'mes_desde_lancamento', titulo: 'Mês desde o lançamento', numerica: true, formato: inteiro },
          { chave: 'vendidas_acumuladas', titulo: 'Vendidas (acumulado)', numerica: true, formato: inteiro },
          { chave: 'pct_vendido', titulo: 'Parte vendida', numerica: true, formato: fracaoInteira },
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
