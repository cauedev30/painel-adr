import type { ReactNode } from 'react'
import { EMPREENDIMENTOS } from '../empreendimentos.ts'
import { mes } from '../formatar.ts'
import { ATALHOS_DE_PERIODO, MESES_DOS_DADOS, type Rota, atalhoAtivo, resumoDoPeriodo } from '../navegacao/rotas.ts'
import { BotaoFiltro } from './BotaoFiltro.tsx'
import css from './Filtros.module.css'
import { Icone } from './Icone.tsx'

type Props = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }

/** Um select sem a seta do navegador: a seta é um traço fino, desenhado por cima. */
function Seletor({ rotulo, valor, aoMudar, children }: {
  rotulo: string; valor: string; aoMudar: (valor: string) => void; children: ReactNode
}) {
  return (
    <span className={css.caixa}>
      <span className={css.seletor}>
        <select aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)}>{children}</select>
        <Icone nome="seta" tamanho={16} />
      </span>
    </span>
  )
}

// no filtro o mês sai como "out 2025": sem a barra, a leitura fica mais limpa
const opcoesDeMes = MESES_DOS_DADOS.map((m) => <option key={m} value={m}>{mes(m).replace('/', ' ')}</option>)

const OPCOES_DE_EMPREENDIMENTO = [{ id: null, nome: 'Todos' }, ...EMPREENDIMENTOS]

/**
 * Os filtros em dois botões (D13): o período, com atalhos de um clique e o De/Até para o período exato,
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
            <div className={css.exato}>
              <label>
                <span>De</span>
                <Seletor rotulo="De" valor={rota.de} aoMudar={(de) => navegar({ de })}>{opcoesDeMes}</Seletor>
              </label>
              <label>
                <span>Até</span>
                <Seletor rotulo="Até" valor={rota.ate} aoMudar={(ate) => navegar({ ate })}>{opcoesDeMes}</Seletor>
              </label>
            </div>
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
