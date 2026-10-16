import { useState } from 'react'
import { mesPorExtenso, nomeDoMes } from '../formatar.ts'
import { ANOS_DOS_DADOS, mesNosDados, mesesDoAno, ordenarIntervalo, posicaoNoIntervalo } from '../navegacao/rotas.ts'
import css from './GradeDeMeses.module.css'
import { Icone } from './Icone.tsx'

type Props = {
  de: string
  ate: string
  /** O intervalo escolhido nos dois cliques, já com o menor primeiro. */
  aoEscolher: (de: string, ate: string) => void
}

/**
 * O período exato do filtro (D13): um ano por vez, os 12 meses em grade. O 1º clique marca o início e o
 * 2º o fim; o intervalo fica pintado em cobre, e o provisório acompanha o mouse depois do 1º clique.
 */
export function GradeDeMeses({ de, ate, aoEscolher }: Props) {
  const [ano, setAno] = useState(Number(ate.slice(0, 4)))
  const [inicio, setInicio] = useState<string | null>(null)
  const [sobMouse, setSobMouse] = useState<string | null>(null)

  // o que a grade pinta: o intervalo atual ou, depois do 1º clique, o provisório até o mês sob o mouse
  const pintado = inicio ? ordenarIntervalo(inicio, sobMouse ?? inicio) : { de, ate }
  const primeiroAno = ANOS_DOS_DADOS[0]
  const ultimoAno = ANOS_DOS_DADOS.at(-1)!

  function clicar(mes: string) {
    if (!inicio) {
      setInicio(mes)
      return
    }
    const escolhido = ordenarIntervalo(inicio, mes)
    setInicio(null)
    aoEscolher(escolhido.de, escolhido.ate)
  }

  return (
    <div className={css.grade}>
      <div className={css.cabecalho}>
        <button type="button" className={css.seta} aria-label="Ano anterior" disabled={ano <= primeiroAno}
          onClick={() => setAno((a) => a - 1)}>
          <span className={css.esquerda}><Icone nome="seta" tamanho={16} /></span>
        </button>
        <p className={`${css.ano} numero`} aria-live="polite">{ano}</p>
        <button type="button" className={css.seta} aria-label="Próximo ano" disabled={ano >= ultimoAno}
          onClick={() => setAno((a) => a + 1)}>
          <span className={css.direita}><Icone nome="seta" tamanho={16} /></span>
        </button>
      </div>

      <div className={css.meses} onMouseLeave={() => setSobMouse(null)}>
        {mesesDoAno(ano).map((mes) => {
          const posicao = posicaoNoIntervalo(mes, pintado.de, pintado.ate)
          return (
            <button key={mes} type="button" className={css.mes} data-posicao={posicao ?? undefined}
              disabled={!mesNosDados(mes)} aria-label={mesPorExtenso(mes)}
              aria-pressed={posicao === 'inicio' || posicao === 'fim' || posicao === 'unico'}
              onMouseEnter={() => setSobMouse(mes)} onFocus={() => setSobMouse(mes)} onClick={() => clicar(mes)}>
              {nomeDoMes(mes)}
            </button>
          )
        })}
      </div>

      <p className={css.dica} aria-live="polite">{inicio ? 'Agora o mês de fim' : 'Clique no mês de início e no de fim'}</p>
    </div>
  )
}
