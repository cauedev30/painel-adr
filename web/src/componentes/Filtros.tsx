import { EMPREENDIMENTOS } from '../empreendimentos.ts'
import { ATALHOS_DE_PERIODO, type Rota, atalhoAtivo, resumoDoPeriodo } from '../navegacao/rotas.ts'
import { BotaoFiltro } from './BotaoFiltro.tsx'
import css from './Filtros.module.css'
import { GradeDeMeses } from './GradeDeMeses.tsx'
import { Icone } from './Icone.tsx'

type Props = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }

const OPCOES_DE_EMPREENDIMENTO = [{ id: null, nome: 'Todos' }, ...EMPREENDIMENTOS]

/**
 * Os filtros em dois botões (D13): o período, com atalhos de um clique e a grade de meses para o período exato,
 * e o empreendimento, numa lista. Cada mudança vai para o hash da URL, como antes.
 */
export function Filtros({ rota, navegar }: Props) {
  const ativo = atalhoAtivo(rota)
  const empreendimento = OPCOES_DE_EMPREENDIMENTO.find((e) => e.id === rota.emp) ?? OPCOES_DE_EMPREENDIMENTO[0]

  return (
    <div className={css.filtros} role="group" aria-label="Filtros">
      <BotaoFiltro icone="calendario" rotulo="Período" resumo={resumoDoPeriodo(rota)}>
        {(fechar) => (
          <>
            <div className={css.atalhos}>
              {ATALHOS_DE_PERIODO.map((a) => (
                <button key={a.id} type="button" aria-pressed={ativo === a.id}
                  onClick={() => { navegar({ de: a.de, ate: a.ate }); fechar() }}>
                  {a.nome}
                </button>
              ))}
            </div>
            <GradeDeMeses de={rota.de} ate={rota.ate} aoEscolher={(de, ate) => { navegar({ de, ate }); fechar() }} />
          </>
        )}
      </BotaoFiltro>

      <BotaoFiltro icone="predio" rotulo="Empreendimento" resumo={empreendimento.nome}>
        {(fechar) => (
          <ul className={css.lista}>
            {OPCOES_DE_EMPREENDIMENTO.map((e) => (
              <li key={e.id ?? 'todos'}>
                <button type="button" aria-pressed={e.id === rota.emp} onClick={() => { navegar({ emp: e.id }); fechar() }}>
                  {e.nome}
                  {e.id === rota.emp && <Icone nome="marcado" tamanho={16} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </BotaoFiltro>
    </div>
  )
}
