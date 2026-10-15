import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function FunilCorretores(_props: PropsDaTela) {
  return (
    <div className={css.tela}>
      <EmConstrucao cartoes={[
        'funil lead → visita → proposta → venda, com a conversão entre etapas',
        'leads e conversão por canal',
        'ranking de corretores com a variação de posição',
      ]} />
    </div>
  )
}
