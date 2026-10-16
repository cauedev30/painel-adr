import { data } from '../formatar.ts'
import { DATA_DE_CORTE, type Rota, TELAS } from '../navegacao/rotas.ts'
import { BotaoPdfDaTela } from './BotaoPdf.tsx'
import css from './FaixaSuperior.module.css'
import { Filtros } from './Filtros.tsx'

type Props = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }

/** O nome da tela, os filtros (nas telas que os usam), até quando vão os dados e o PDF da tela. */
export function FaixaSuperior({ rota, navegar }: Props) {
  const tela = TELAS.find((t) => t.id === rota.tela) ?? TELAS[0]
  return (
    <header className={css.faixa}>
      <div className={css.titulo}>
        {/* a key remonta o título a cada tela, e ele entra com fade */}
        <h1 key={tela.id}>{tela.nome}</h1>
        <p className={css.corte}>dados até {data(DATA_DE_CORTE)}</p>
      </div>
      <div className={css.acoes}>
        {tela.filtros && <Filtros rota={rota} navegar={navegar} />}
        <BotaoPdfDaTela />
      </div>
    </header>
  )
}
