import css from './TabelaDados.module.css'

export type Coluna<T> = {
  chave: keyof T & string
  titulo: string
  /** Como escrever o valor (formatar.ts); sem formato, sai como veio. */
  formato?: (valor: never) => string
  numerica?: boolean
}

type Props<T> = { linhas: T[]; colunas: Coluna<T>[]; legenda: string }

/** "Ver como tabela": os mesmos dados do gráfico, em tabela (acessibilidade, seção 6.3). */
export function TabelaDados<T>({ linhas, colunas, legenda }: Props<T>) {
  return (
    <div className={css.rolagem}>
      <table className={css.tabela}>
        <caption className="so-leitor">{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((c) => <th key={c.chave} scope="col" className={c.numerica ? css.numero : undefined}>{c.titulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i}>
              {colunas.map((c) => {
                const valor = linha[c.chave]
                const texto = c.formato ? (c.formato as (v: unknown) => string)(valor) : String(valor ?? '—')
                return <td key={c.chave} className={c.numerica ? css.numero : undefined}>{texto}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
