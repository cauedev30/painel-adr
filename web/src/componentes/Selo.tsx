import css from './Selo.module.css'

export const REPOSITORIO = 'https://github.com/cauedev30/painel-adr'

/** O selo do D7: deixa claro que é um projeto de candidatura, com dados simulados, e de quem é. */
export function Selo() {
  return (
    <p className={css.selo}>
      <span>Projeto conceitual de candidatura · dados simulados</span>
      <a href={REPOSITORIO} target="_blank" rel="noopener noreferrer">por Cauê Franco</a>
    </p>
  )
}
