import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function Console({ rota }: PropsDaTela) {
  return (
    <div className={css.tela}>
      {rota.extra.consulta && <p className={css.nota}>Consulta pedida: <code>{rota.extra.consulta}</code></p>}
      <EmConstrucao cartoes={[
        'editor de SQL (PostgreSQL) com o resultado em tabela',
        'exemplos prontos na lateral e a lista de tabelas e colunas',
        '"Restaurar banco"',
      ]} />
    </div>
  )
}
