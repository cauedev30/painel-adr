import faixa from '../assets/faixa-noturna.webp'
import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function VisaoGeral(_props: PropsDaTela) {
  return (
    <div className={css.tela}>
      <figure className={css.faixaFoto}>
        <img src={faixa} alt="O Mares Seaview à noite" />
        <figcaption>Mares Seaview à noite</figcaption>
      </figure>
      <EmConstrucao cartoes={[
        '6 KPIs: VGV vendido, VSO, estoque, ticket médio, preço/m² e inadimplência, cada um com a variação',
        'vendas mensais com a linha da meta',
        'O que os dados dizem: as 5 conclusões, cada uma com o link para o gráfico que a prova',
      ]} />
    </div>
  )
}
