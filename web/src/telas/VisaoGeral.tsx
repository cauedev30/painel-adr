import faixa from '../assets/faixa-noturna.webp'
import { Cartao } from '../componentes/Cartao.tsx'
import { Conclusoes } from '../componentes/Conclusoes.tsx'
import { Kpi } from '../componentes/Kpi.tsx'
import { inteiro, mes } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'
import { KPIS, type MesDeVendas, respostaVendasMensais, textoDaComparacao } from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

const umaCasa = (v: number) => v.toFixed(1).replace('.', ',')

export function VisaoGeral({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
      <figure className={css.faixaFoto}>
        <img src={faixa} alt="O Mares Seaview à noite" />
        <p className={css.slogan}>Ousadia que constrói valor</p>
        <figcaption>Mares Seaview à noite</figcaption>
      </figure>

      <section aria-label="Indicadores do período" className={css.kpis}>
        {KPIS.map((k) => <Kpi key={k.id} kpi={k} params={params} periodoAnterior={textoDaComparacao(k, rota)} />)}
      </section>

      <Cartao<MesDeVendas>
        id="vendas-mensais"
        titulo="As vendas estão no ritmo da meta?"
        consulta="visao-geral/vendas_mensais"
        params={params}
        resposta={respostaVendasMensais}
        formatoDoValor={(v) => (Number.isInteger(v) ? inteiro(v) : umaCasa(v))}
        grafico={(linhas) => ({
          grid: { left: 40, right: 16, top: 64, bottom: 32 },
          // 3 séries: legenda sempre (seção 6.3); a forma separa além da cor (barra, tracejado, linha)
          legend: { top: 0, left: 0, data: ['Vendas', 'Meta', 'Média móvel de 3 meses'] },
          xAxis: { type: 'category', data: linhas.map((l) => mes(l.mes)) },
          yAxis: { type: 'value', minInterval: 1, name: 'unidades', nameTextStyle: { align: 'left' } },
          series: [
            {
              type: 'bar', name: 'Vendas', data: linhas.map((l) => l.vendas), barMaxWidth: 28,
              itemStyle: { color: PALETA.cobre, borderRadius: [4, 4, 0, 0] },
              emphasis: { itemStyle: { color: PALETA.cobreForte } },
            },
            {
              type: 'line', name: 'Meta', data: linhas.map((l) => l.meta), step: 'middle', symbol: 'none',
              lineStyle: { color: PALETA.cinza, width: 2, type: 'dashed' }, itemStyle: { color: PALETA.cinza },
              z: 3,
            },
            {
              type: 'line', name: 'Média móvel de 3 meses', data: linhas.map((l) => l.media_movel_3m), smooth: 0.3,
              symbol: 'circle', symbolSize: 6, showSymbol: false,
              lineStyle: { color: PALETA.texto2, width: 2 }, itemStyle: { color: PALETA.texto2 },
              z: 4,
            },
          ],
        })}
        colunas={[
          { chave: 'mes', titulo: 'Mês', formato: mes },
          { chave: 'vendas', titulo: 'Vendas', numerica: true, formato: inteiro },
          { chave: 'meta', titulo: 'Meta', numerica: true, formato: inteiro },
          { chave: 'media_movel_3m', titulo: 'Média móvel de 3 meses', numerica: true, formato: umaCasa },
        ]}
      />

      <Conclusoes rota={rota} params={params} />
    </div>
  )
}
