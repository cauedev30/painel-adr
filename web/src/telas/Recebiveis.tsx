import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function Recebiveis(_props: PropsDaTela) {
  return (
    <div className={css.tela}>
      <EmConstrucao cartoes={[
        'KPIs: a receber em 12 meses, recebido no mês e inadimplência',
        'previsto × recebido por mês',
        'saldo por faixa de atraso e o mapa de calor empreendimento × faixa',
        'inadimplência por empreendimento, por desconto e o distrato depois do atraso',
      ]} />
    </div>
  )
}
