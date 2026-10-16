import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import css from './BotaoFiltro.module.css'
import { Icone, type Nome } from './Icone.tsx'

type Props = {
  icone: Nome
  /** O nome do filtro, para o leitor de tela e o título do painel: "Período", "Empreendimento". */
  rotulo: string
  /** O filtro ativo, escrito curto no botão: "out 25 – set 26", "Todos". */
  resumo: string
  /** O conteúdo do painel; recebe `fechar`, para fechar ao escolher. */
  children: (fechar: () => void) => ReactNode
}

/**
 * Um botão com ícone e o filtro ativo, que abre um painel flutuante com o filtro (D13). O painel fecha
 * com Esc (o foco volta ao botão), com um clique fora e quando o conteúdo chama `fechar`.
 */
export function BotaoFiltro({ icone, rotulo, resumo, children }: Props) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!aberto) return
    const cliqueFora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setAberto(false)
      botao.current?.focus()
    }
    document.addEventListener('pointerdown', cliqueFora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', cliqueFora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  function fechar() {
    setAberto(false)
    botao.current?.focus()
  }

  return (
    <div ref={raiz} className={css.raiz}>
      <button ref={botao} type="button" className={css.botao} aria-expanded={aberto} aria-controls={id}
        onClick={() => setAberto((a) => !a)}>
        <span className={css.icone}><Icone nome={icone} tamanho={18} /></span>
        <span className="so-leitor">{rotulo}: </span>
        <span className={css.resumo}>{resumo}</span>
        <span className={css.seta}><Icone nome="seta" tamanho={16} /></span>
      </button>
      {aberto && (
        <div id={id} role="dialog" aria-label={rotulo} className={css.painel}>
          <p className={css.titulo}>{rotulo}</p>
          {children(fechar)}
        </div>
      )}
    </div>
  )
}
