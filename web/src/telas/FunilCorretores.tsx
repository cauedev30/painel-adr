import { MIN_LEADS_CANAL, nomeDoCanal } from '../canais.ts'
import { Cartao } from '../componentes/Cartao.tsx'
import { Grafico } from '../componentes/Grafico.tsx'
import { inteiro, moedaCompacta, pct } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'
import {
  type LinhaCanal, type LinhaFunil, type LinhaRanking, NOMES_DAS_ETAPAS, canalQueMaisConverte, respostaCanais, respostaFunil,
  respostaRanking, variacaoDePosicao,
} from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

const conversao = (v: number | null) => (v === null ? '—' : pct(v))

export function FunilCorretores({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
      <Cartao<LinhaFunil>
        id="funil"
        titulo="Dos leads que chegam, quantos viram venda?"
        consulta="funil-corretores/funil"
        params={params}
        resposta={respostaFunil}
        altura={220}
        grafico={(linhas) => ({
          grid: { left: 72, right: 110, top: 8, bottom: 8 },
          xAxis: { type: 'value', show: false, max: linhas[0].leads || 1 },
          yAxis: { type: 'category', data: linhas.map((l) => NOMES_DAS_ETAPAS[l.etapa] ?? l.etapa), inverse: true, axisLine: { show: false } },
          tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            formatter: (p) => {
              const [{ dataIndex }] = p as unknown as { dataIndex: number }[]
              const l = linhas[dataIndex]
              const passo = l.conversao === null ? '' : `<br/>${pct(l.conversao)} da etapa anterior`
              return `${NOMES_DAS_ETAPAS[l.etapa] ?? l.etapa}: <b>${inteiro(l.leads)}</b>${passo}`
            },
          },
          series: [{
            type: 'bar', barWidth: 26, data: linhas.map((l) => l.leads),
            itemStyle: { color: PALETA.cobre, borderRadius: [0, 4, 4, 0] },
            // a barra da venda fica fininha perto da de leads: o rótulo à direita diz o número e a conversão
            label: {
              show: true, position: 'right', color: PALETA.texto,
              formatter: ({ dataIndex }: { dataIndex: number }) => {
                const l = linhas[dataIndex]
                return l.conversao === null ? inteiro(l.leads) : `${inteiro(l.leads)} · ${pct(l.conversao)}`
              },
            },
          }],
        })}
        colunas={[
          { chave: 'etapa', titulo: 'Etapa', formato: (e: string) => NOMES_DAS_ETAPAS[e] ?? e },
          { chave: 'leads', titulo: 'Leads', numerica: true, formato: inteiro },
          { chave: 'conversao', titulo: 'Conversão da etapa anterior', numerica: true, formato: conversao },
        ]}
      />

      <Cartao<LinhaCanal>
        id="canais"
        titulo="O canal que traz mais leads é o que mais vende?"
        consulta="funil-corretores/canais"
        params={params}
        resposta={respostaCanais}
        altura={260}
        conteudo={(linhas) => <Canais linhas={linhas} />}
        nomeDoConteudo="gráfico"
        colunas={[
          { chave: 'canal', titulo: 'Canal', formato: nomeDoCanal },
          { chave: 'leads', titulo: 'Leads', numerica: true, formato: inteiro },
          { chave: 'vendas', titulo: 'Vendas', numerica: true, formato: inteiro },
          { chave: 'conversao', titulo: 'Conversão', numerica: true, formato: (v: number) => pct(v) },
        ]}
      />

      <Cartao<LinhaRanking>
        id="ranking"
        titulo="Quem são os corretores que mais vendem?"
        consulta="funil-corretores/ranking_corretores"
        params={params}
        resposta={respostaRanking}
        altura={200}
        conteudo={(linhas) => <Ranking linhas={linhas} />}
        nomeDoConteudo="ranking"
        colunas={[
          { chave: 'posicao', titulo: 'Posição', numerica: true, formato: (v: number) => `${v}º` },
          { chave: 'nome', titulo: 'Corretor' },
          { chave: 'imobiliaria', titulo: 'Imobiliária', formato: (v: string | null) => v ?? 'autônomo' },
          { chave: 'vendas', titulo: 'Vendas', numerica: true, formato: inteiro },
          { chave: 'vgv', titulo: 'VGV', numerica: true, formato: moedaCompacta },
          { chave: 'posicao_anterior', titulo: 'Posição anterior', numerica: true, formato: (v: number | null) => (v === null ? '—' : `${v}º`) },
          { chave: 'variacao', titulo: 'Variação', numerica: true, formato: (v: number | null) => (v === null ? 'novo' : v > 0 ? `+${v}` : String(v)) },
        ]}
      />
    </div>
  )
}

/** Leads e conversão por canal, lado a lado e na mesma ordem (a do volume), com o maior de cada um em cobre. */
function Canais({ linhas }: { linhas: LinhaCanal[] }) {
  const nomes = linhas.map((l) => nomeDoCanal(l.canal))
  const maisLeads = linhas.reduce((a, b) => (b.leads > a.leads ? b : a)).canal
  const maisConverte = canalQueMaisConverte(linhas)?.canal
  const barras = (valores: number[], destaque: string | undefined, formato: (v: number) => string) => ({
    grid: { left: 92, right: 64, top: 4, bottom: 4 },
    xAxis: { type: 'value' as const, show: false, min: 0 },
    yAxis: { type: 'category' as const, data: nomes, inverse: true, axisLine: { show: false } },
    tooltip: { show: false },
    series: [{
      type: 'bar' as const, barWidth: 14,
      data: valores.map((v, i) => ({ value: v, itemStyle: { color: linhas[i].canal === destaque ? PALETA.cobre : PALETA.cinza, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: PALETA.texto, formatter: (p: { value: unknown }) => formato(Number(p.value)) },
    }],
  })
  const altura = 24 + linhas.length * 26
  return (
    <div className={css.multiplosDois}>
      <div>
        <h3 className={css.multiploTitulo}>Leads que entraram</h3>
        <Grafico altura={altura} rotulo={`Leads por canal: ${linhas.map((l) => `${nomeDoCanal(l.canal)} ${inteiro(l.leads)}`).join(', ')}.`}
          opcao={barras(linhas.map((l) => l.leads), maisLeads, inteiro)} />
      </div>
      <div>
        <h3 className={css.multiploTitulo}>Conversão em venda <span>(o destaque vai para canais com {inteiro(MIN_LEADS_CANAL)} leads ou mais)</span></h3>
        <Grafico altura={altura} rotulo={`Conversão por canal: ${linhas.map((l) => `${nomeDoCanal(l.canal)} ${pct(l.conversao)}`).join(', ')}.`}
          opcao={barras(linhas.map((l) => l.conversao), maisConverte, (v) => pct(v))} />
      </div>
    </div>
  )
}

/** O ranking como tabela: posição, corretor, imobiliária, vendas, VGV e a variação de posição. */
function Ranking({ linhas }: { linhas: LinhaRanking[] }) {
  return (
    <div className={css.rolagemRanking}>
      <table className={css.ranking}>
        <caption className="so-leitor">Ranking de corretores por vendas no período, com a variação contra o período anterior</caption>
        <thead>
          <tr>
            <th scope="col" className={css.direita}>#</th>
            <th scope="col">Corretor</th>
            <th scope="col" className={css.direita}>Vendas</th>
            <th scope="col" className={`${css.direita} ${css.vgv}`}>VGV</th>
            <th scope="col" className={css.direita}>Variação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const v = variacaoDePosicao(l)
            return (
              <tr key={l.corretor_id}>
                <td className={`${css.direita} numero`}>{l.posicao}º</td>
                <td>
                  <span className={css.corretor}>{l.nome}</span>
                  <span className={css.imobiliaria}>{l.imobiliaria ?? 'autônomo'}</span>
                </td>
                <td className={`${css.direita} numero`}>{inteiro(l.vendas)}</td>
                <td className={`${css.direita} ${css.vgv} numero`}>{moedaCompacta(l.vgv)}</td>
                <td className={`${css.direita} numero`} title={v.descricao}>
                  {v.texto === 'novo' ? (
                    <span className={css.novo}>novo</span>
                  ) : (
                    <>
                      <span className={css.setaPosicao} data-tom={v.tom} aria-hidden="true">{v.seta}</span> {v.texto}
                    </>
                  )}
                  <span className="so-leitor">{v.descricao}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
