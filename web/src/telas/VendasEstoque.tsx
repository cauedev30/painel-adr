import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import { FotoEmpreendimento } from '../componentes/FotoEmpreendimento.tsx'
import { EMPREENDIMENTOS } from '../empreendimentos.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function VendasEstoque(_props: PropsDaTela) {
  return (
    <div className={css.tela}>
      <ul className={css.grade} aria-label="Empreendimentos">
        {EMPREENDIMENTOS.map((e) => (
          <li key={e.id} className={css.miniCartao}>
            <FotoEmpreendimento empreendimento={e} />
            <span>{e.nome}</span>
          </li>
        ))}
      </ul>
      <EmConstrucao cartoes={[
        'cartão por empreendimento: status, barra vendido × estoque e VSO',
        'ritmo de vendas acumulado desde o lançamento, um gráfico pequeno por empreendimento',
        'boxplot do preço/m² e a tabela de estatísticas',
        'vista mar: prêmio de preço e de velocidade',
      ]} />
    </div>
  )
}
