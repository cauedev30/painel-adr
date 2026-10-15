import { Cartao } from '../componentes/Cartao.tsx'
import { Kpi } from '../componentes/Kpi.tsx'
import { inteiro, mes, moedaCompacta, pct } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA, RAMPA_ATRASO } from '../tema/paleta.ts'
import {
  ICONES_DAS_FAIXAS, KPIS_RECEBIVEIS, type LinhaDistratos, type LinhaFaixa, type LinhaInadDesconto,
  type LinhaInadEmpreendimento, type LinhaMapaCalor, type LinhaPrevistoRecebido, respostaDistratos, respostaFaixas,
  respostaInadDesconto, respostaInadEmpreendimento, respostaMapaCalor, respostaPrevistoRecebido, rotuloDaFaixa, textoDaComparacao,
} from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

const fracao = (v: number | null) => (v === null ? '—' : pct(v))

/** Barras deitadas de uma série só, com o maior em cobre e o resto em cinza (seção 6.3). */
function barrasComDestaque(nomes: string[], valores: number[], formato: (v: number) => string) {
  const maior = Math.max(...valores)
  return {
    grid: { left: 140, right: 72, top: 4, bottom: 4 },
    xAxis: { type: 'value' as const, show: false, min: 0 },
    yAxis: { type: 'category' as const, data: nomes, inverse: true, axisLine: { show: false } },
    tooltip: { show: false },
    series: [{
      type: 'bar' as const, barWidth: 18,
      data: valores.map((v) => ({ value: v, itemStyle: { color: v === maior ? PALETA.cobre : PALETA.cinza, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: PALETA.texto, formatter: (p: { value: unknown }) => formato(Number(p.value)) },
    }],
  }
}

export function Recebiveis({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
      <section aria-label="Indicadores de recebíveis" className={css.kpis}>
        {KPIS_RECEBIVEIS.map((k) => <Kpi key={k.id} kpi={k} params={params} periodoAnterior={textoDaComparacao(k, rota)} />)}
      </section>

      <Cartao<LinhaPrevistoRecebido>
        id="previsto-recebido"
        titulo="A cada mês, entrou o dinheiro que as parcelas previam?"
        consulta="recebiveis/previsto_recebido"
        params={params}
        resposta={respostaPrevistoRecebido}
        formatoDoValor={moedaCompacta}
        grafico={(linhas) => ({
          grid: { left: 64, right: 16, top: 40, bottom: 32 },
          legend: { top: 0, right: 0, data: ['Previsto', 'Recebido'] },
          xAxis: { type: 'category', data: linhas.map((l) => mes(l.mes)) },
          yAxis: { type: 'value', axisLabel: { formatter: (v: number) => moedaCompacta(v) } },
          series: [
            { type: 'bar', name: 'Previsto', data: linhas.map((l) => l.previsto), barMaxWidth: 18, barGap: '15%', itemStyle: { color: PALETA.cinza, borderRadius: [4, 4, 0, 0] } },
            { type: 'bar', name: 'Recebido', data: linhas.map((l) => l.recebido), barMaxWidth: 18, itemStyle: { color: PALETA.cobre, borderRadius: [4, 4, 0, 0] } },
          ],
        })}
        colunas={[
          { chave: 'mes', titulo: 'Mês', formato: mes },
          { chave: 'previsto', titulo: 'Previsto', numerica: true, formato: moedaCompacta },
          { chave: 'recebido', titulo: 'Recebido', numerica: true, formato: moedaCompacta },
        ]}
      />

      <Cartao<LinhaFaixa>
        id="faixas-atraso"
        titulo="Quanto está em atraso, e há quanto tempo?"
        consulta="recebiveis/faixas_atraso"
        params={params}
        resposta={respostaFaixas}
        altura={200}
        formatoDoValor={moedaCompacta}
        grafico={(linhas) => ({
          grid: { left: 112, right: 96, top: 4, bottom: 4 },
          xAxis: { type: 'value', show: false, min: 0 },
          // o ícone enche com o atraso e o rótulo diz a faixa: a cor nunca é a única pista
          yAxis: { type: 'category', data: linhas.map((l, i) => `${ICONES_DAS_FAIXAS[i]}  ${rotuloDaFaixa(l.faixa)}`), inverse: true, axisLine: { show: false } },
          tooltip: { show: false },
          series: [{
            type: 'bar', barWidth: 22,
            data: linhas.map((l, i) => ({ value: l.saldo, itemStyle: { color: RAMPA_ATRASO[i], borderRadius: [0, 4, 4, 0] } })),
            label: {
              show: true, position: 'right', color: PALETA.texto,
              lineHeight: 15,
              formatter: ({ dataIndex }: { dataIndex: number }) => `${moedaCompacta(linhas[dataIndex].saldo)}\n${inteiro(linhas[dataIndex].parcelas)} parcelas`,
            },
          }],
        })}
        colunas={[
          { chave: 'faixa', titulo: 'Faixa de atraso', formato: rotuloDaFaixa },
          { chave: 'saldo', titulo: 'Saldo em atraso', numerica: true, formato: moedaCompacta },
          { chave: 'parcelas', titulo: 'Parcelas', numerica: true, formato: inteiro },
        ]}
      />

      <Cartao<LinhaMapaCalor>
        id="mapa-calor"
        titulo="Em que empreendimento e em que faixa o dinheiro está parado?"
        consulta="recebiveis/mapa_calor"
        params={params}
        resposta={respostaMapaCalor}
        altura={180}
        conteudo={(linhas) => <MapaCalor linhas={linhas} />}
        nomeDoConteudo="mapa"
        colunas={[
          { chave: 'nome', titulo: 'Empreendimento' },
          { chave: 'faixa', titulo: 'Faixa de atraso', formato: rotuloDaFaixa },
          { chave: 'saldo', titulo: 'Saldo em atraso', numerica: true, formato: moedaCompacta },
        ]}
      />

      <div className={css.lado}>
        <Cartao<LinhaInadEmpreendimento>
          id="inadimplencia-empreendimento"
          titulo="A inadimplência está concentrada num empreendimento?"
          consulta="recebiveis/inadimplencia_por_empreendimento"
          params={params}
          resposta={respostaInadEmpreendimento}
          altura={180}
          formatoDoValor={(v) => pct(v)}
          grafico={(linhas) => barrasComDestaque(linhas.map((l) => l.nome), linhas.map((l) => l.inadimplencia), (v) => pct(v))}
          colunas={[
            { chave: 'nome', titulo: 'Empreendimento' },
            { chave: 'inadimplencia', titulo: 'Inadimplência', numerica: true, formato: fracao },
          ]}
        />

        <Cartao<LinhaInadDesconto>
          id="inadimplencia-desconto"
          titulo="Quem comprou com desconto alto paga pior?"
          consulta="recebiveis/inadimplencia_por_desconto"
          params={params}
          resposta={respostaInadDesconto}
          altura={180}
          formatoDoValor={(v) => pct(v)}
          grafico={(linhas) => barrasComDestaque(linhas.map((l) => `desconto ${l.faixa_desconto}`), linhas.map((l) => l.inadimplencia ?? 0), (v) => pct(v))}
          colunas={[
            { chave: 'faixa_desconto', titulo: 'Desconto' },
            { chave: 'vendas', titulo: 'Vendas ativas', numerica: true, formato: inteiro },
            { chave: 'inadimplencia', titulo: 'Inadimplência', numerica: true, formato: fracao },
          ]}
        />
      </div>

      <Cartao<LinhaDistratos>
        id="distratos"
        titulo="O distrato costuma vir depois de um atraso longo?"
        consulta="recebiveis/distratos_e_atraso"
        params={params}
        resposta={respostaDistratos}
        altura={90}
        conteudo={([l]) => <Distratos linha={l} />}
        colunas={[
          { chave: 'distratos', titulo: 'Distratos no período', numerica: true, formato: inteiro },
          { chave: 'com_atraso_60', titulo: 'Com atraso acima de 60 dias antes', numerica: true, formato: inteiro },
          { chave: 'pct', titulo: 'Parte', numerica: true, formato: (v: number | null) => (v === null ? '—' : pct(v, 0)) },
        ]}
      />
    </div>
  )
}

/**
 * Empreendimento × faixa de atraso em tabela, com o fundo de cada célula na rampa de um tom só: quanto
 * mais saldo, mais intenso. O valor está escrito em cada célula, então a cor só reforça.
 */
function MapaCalor({ linhas }: { linhas: LinhaMapaCalor[] }) {
  const nomes = [...new Map(linhas.map((l) => [l.empreendimento_id, l.nome])).entries()]
  const faixas = [...new Map(linhas.map((l) => [l.ordem, l.faixa])).entries()].sort((a, b) => a[0] - b[0])
  const maior = Math.max(...linhas.map((l) => l.saldo)) || 1
  return (
    <div className={css.rolagemMapa}>
      <table className={css.mapa}>
        <caption className="so-leitor">Saldo em atraso por empreendimento e faixa de atraso</caption>
        <thead>
          <tr>
            <th scope="col">Empreendimento</th>
            {faixas.map(([ordem, faixa]) => <th key={ordem} scope="col">{ICONES_DAS_FAIXAS[ordem - 1]} {rotuloDaFaixa(faixa)}</th>)}
          </tr>
        </thead>
        <tbody>
          {nomes.map(([id, nome]) => (
            <tr key={id}>
              <th scope="row">{nome}</th>
              {faixas.map(([ordem]) => {
                const saldo = linhas.find((l) => l.empreendimento_id === id && l.ordem === ordem)?.saldo ?? 0
                // de 8% a 70% de vermelho sobre a superfície: o texto branco passa em AA em toda a rampa
                const intensidade = saldo === 0 ? 0 : 8 + Math.round((saldo / maior) * 62)
                return (
                  <td key={ordem} className="numero"
                    style={{ background: saldo === 0 ? undefined : `color-mix(in srgb, ${PALETA.atraso4} ${intensidade}%, ${PALETA.superficie})` }}>
                    {saldo === 0 ? '—' : moedaCompacta(saldo)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Distratos({ linha }: { linha: LinhaDistratos }) {
  if (linha.distratos === 0) return null
  return (
    <dl className={css.numerosGrandes}>
      <div><dt>Distratos no período</dt><dd className="numero">{inteiro(linha.distratos)}</dd></div>
      <div><dt>Com uma parcela atrasada mais de 60 dias antes</dt><dd className="numero">{inteiro(linha.com_atraso_60)}</dd></div>
      <div><dt>Parte dos distratos</dt><dd className="numero">{linha.pct === null ? '—' : pct(linha.pct, 0)}</dd></div>
    </dl>
  )
}
