import type { ReactNode } from 'react'
import { EMPREENDIMENTOS } from '../empreendimentos.ts'
import { mes } from '../formatar.ts'
import { MESES_DOS_DADOS, type Rota } from '../navegacao/rotas.ts'
import css from './Filtros.module.css'
import { Icone } from './Icone.tsx'

type Props = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }

/** Um select sem a seta do navegador: a seta é um traço fino, desenhado por cima. */
function Seletor({ rotulo, valor, aoMudar, children }: {
  rotulo: string; valor: string; aoMudar: (valor: string) => void; children: ReactNode
}) {
  return (
    <span className={css.seletor}>
      <select aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)}>{children}</select>
      <Icone nome="seta" tamanho={16} />
    </span>
  )
}

// no filtro o mês sai como "out 2025": sem a barra, a leitura fica mais limpa
const opcoesDeMes = MESES_DOS_DADOS.map((m) => <option key={m} value={m}>{mes(m).replace('/', ' ')}</option>)

/** Período (de, até) numa peça só e o empreendimento; cada mudança vai para o hash da URL. */
export function Filtros({ rota, navegar }: Props) {
  return (
    <form className={css.filtros} aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
      <fieldset className={css.grupo}>
        <legend className={css.rotulo}>Período</legend>
        <div className={css.caixa}>
          <Seletor rotulo="De" valor={rota.de} aoMudar={(de) => navegar({ de })}>{opcoesDeMes}</Seletor>
          <span className={css.traco} aria-hidden="true">→</span>
          <Seletor rotulo="Até" valor={rota.ate} aoMudar={(ate) => navegar({ ate })}>{opcoesDeMes}</Seletor>
        </div>
      </fieldset>

      <fieldset className={`${css.grupo} ${css.empreendimento}`}>
        <legend className={css.rotulo}>Empreendimento</legend>
        <div className={css.caixa}>
          <Seletor rotulo="Empreendimento" valor={String(rota.emp ?? '')}
            aoMudar={(v) => navegar({ emp: v === '' ? null : Number(v) })}>
            <option value="">Todos</option>
            {EMPREENDIMENTOS.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Seletor>
        </div>
      </fieldset>
    </form>
  )
}
