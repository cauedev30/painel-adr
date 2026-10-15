import faixa from '../assets/faixa-noturna.webp'
import { Cartao } from '../componentes/Cartao.tsx'
import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import { inteiro, mes } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { PALETA } from '../tema/paleta.ts'
import { type MesDeVendas, respostaVendasMensais } from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function VisaoGeral({ rota }: PropsDaTela) {
  return (
    <div className={css.tela}>
      <figure className={css.faixaFoto}>
        <img src={faixa} alt="O Mares Seaview à noite" />
        <figcaption>Mares Seaview à noite</figcaption>
      </figure>

      <Cartao<MesDeVendas>
        id="vendas-mensais"
        titulo="As vendas estão no ritmo da meta?"
        consulta="visao-geral/vendas_mensais"
        params={paramsDaRota(rota)}
        resposta={respostaVendasMensais}
        grafico={(linhas) => ({
          grid: { left: 40, right: 16, top: 40, bottom: 32 },
          // 2 séries: legenda sempre (seção 6.3); a forma (barra × linha tracejada) separa além da cor
          legend: { top: 0, right: 0, data: ['Vendas', 'Meta'] },
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
          ],
        })}
        colunas={[
          { chave: 'mes', titulo: 'Mês', formato: mes },
          { chave: 'vendas', titulo: 'Vendas', numerica: true, formato: inteiro },
          { chave: 'meta', titulo: 'Meta', numerica: true, formato: inteiro },
          { chave: 'media_movel_3m', titulo: 'Média móvel de 3 meses', numerica: true, formato: (v: number) => v.toFixed(1).replace('.', ',') },
        ]}
      />

      <EmConstrucao cartoes={[
        '6 KPIs: VGV vendido, VSO, estoque, ticket médio, preço/m² e inadimplência, cada um com a variação',
        'O que os dados dizem: as 5 conclusões, cada uma com o link para o gráfico que a prova',
      ]} />
    </div>
  )
}
