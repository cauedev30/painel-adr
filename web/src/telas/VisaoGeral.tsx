import faixa from '../assets/faixa-noturna.webp'
import { Cartao } from '../componentes/Cartao.tsx'
import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import { inteiro, mes } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

type Mes = { mes: string; vendas: number; meta: number; media_movel_3m: number }

export function VisaoGeral({ rota }: PropsDaTela) {
  return (
    <div className={css.tela}>
      <figure className={css.faixaFoto}>
        <img src={faixa} alt="O Mares Seaview à noite" />
        <figcaption>Mares Seaview à noite</figcaption>
      </figure>
      <Cartao<Mes>
        id="vendas-mensais"
        titulo="As vendas estão no ritmo da meta?"
        consulta="visao-geral/vendas_mensais"
        params={paramsDaRota(rota)}
        resposta={(linhas) => `${inteiro(linhas.reduce((s, l) => s + l.vendas, 0))} vendas no período`}
        grafico={(linhas) => ({
          grid: { left: 40, right: 16, top: 24, bottom: 32 },
          xAxis: { type: 'category', data: linhas.map((l) => mes(l.mes)) },
          yAxis: { type: 'value', minInterval: 1 },
          series: [{ type: 'bar', name: 'Vendas', data: linhas.map((l) => l.vendas), barMaxWidth: 28 }],
        })}
        colunas={[
          { chave: 'mes', titulo: 'Mês', formato: mes },
          { chave: 'vendas', titulo: 'Vendas', numerica: true, formato: inteiro },
          { chave: 'meta', titulo: 'Meta', numerica: true, formato: inteiro },
        ]}
      />
      <EmConstrucao cartoes={[
        '6 KPIs: VGV vendido, VSO, estoque, ticket médio, preço/m² e inadimplência, cada um com a variação',
        'O que os dados dizem: as 5 conclusões, cada uma com o link para o gráfico que a prova',
      ]} />
    </div>
  )
}
