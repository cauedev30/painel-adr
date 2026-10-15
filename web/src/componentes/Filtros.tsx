import { EMPREENDIMENTOS } from '../empreendimentos.ts'
import { mes } from '../formatar.ts'
import { MESES_DOS_DADOS, type Rota } from '../navegacao/rotas.ts'
import css from './Filtros.module.css'

type Props = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }

/** Período (mês de, mês até) e empreendimento, numa linha só; cada mudança vai para o hash da URL. */
export function Filtros({ rota, navegar }: Props) {
  return (
    <form className={css.filtros} aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
      <label>
        <span>De</span>
        <select value={rota.de} onChange={(e) => navegar({ de: e.target.value })}>
          {MESES_DOS_DADOS.map((m) => <option key={m} value={m}>{mes(m)}</option>)}
        </select>
      </label>
      <label>
        <span>Até</span>
        <select value={rota.ate} onChange={(e) => navegar({ ate: e.target.value })}>
          {MESES_DOS_DADOS.map((m) => <option key={m} value={m}>{mes(m)}</option>)}
        </select>
      </label>
      <label className={css.empreendimento}>
        <span>Empreendimento</span>
        <select value={rota.emp ?? ''} onChange={(e) => navegar({ emp: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Todos</option>
          {EMPREENDIMENTOS.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </label>
    </form>
  )
}
