import { type ColunaDeTabela, textoDaCelula } from '../pdf/conteudo.ts'
import css from './TabelaDados.module.css'

/** Uma coluna: chave, título, formato (formatar.ts; sem formato, sai como veio) e se é numérica. */
export type Coluna<T> = ColunaDeTabela<T>

type Props<T> = { linhas: T[]; colunas: Coluna<T>[]; legenda: string }

/** "Ver como tabela": os mesmos dados do gráfico, em tabela (acessibilidade, seção 6.3). O PDF usa o mesmo texto de cada célula. */
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
                return <td key={c.chave} className={c.numerica ? css.numero : undefined}>{textoDaCelula(c, linha[c.chave])}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
