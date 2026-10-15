import css from './EmConstrucao.module.css'

/** Aviso das telas provisórias: os cartões de cada uma entram na etapa 6. */
export function EmConstrucao({ cartoes }: { cartoes: string[] }) {
  return (
    <section className={css.aviso} aria-label="Tela em construção">
      <p>Esta tela ganha os cartões na próxima etapa:</p>
      <ul>
        {cartoes.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </section>
  )
}
