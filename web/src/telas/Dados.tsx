import { EmConstrucao } from '../componentes/EmConstrucao.tsx'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

export function Dados(_props: PropsDaTela) {
  return (
    <div className={css.tela}>
      <EmConstrucao cartoes={[
        'DER clicável, gerado do catálogo do banco, com o dicionário de cada coluna',
        'modelos conceitual, lógico e físico (DDL)',
        'relatório de qualidade em cartões "antes → depois"',
        'o que é real e o que é simulado',
      ]} />
    </div>
  )
}
