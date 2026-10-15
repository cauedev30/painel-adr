import { useEffect, useId, useRef, useState } from 'react'
import { PALETA } from '../tema/paleta.ts'
import css from './Diagrama.module.css'

type Props = {
  /** O texto Mermaid (erDiagram, flowchart). */
  texto: string
  /** Descrição para o leitor de tela; a lista ao lado do diagrama é o caminho pelo teclado. */
  rotulo: string
  /** Clique numa entidade do erDiagram: recebe o nome dela no diagrama. */
  aoClicar?: (entidade: string) => void
  /** A entidade marcada em dourado (seleção, seção 6.3). */
  selecionada?: string | null
  /** Diagrama maior que a tela: rola dentro de uma caixa. */
  alto?: boolean
}

type Mermaid = typeof import('mermaid')['default']
let carregado: Promise<Mermaid> | null = null

/** O Mermaid só baixa quando a primeira tela que o usa abre (D6.2): ~600 kB fora da primeira abertura. */
function carregarMermaid(): Promise<Mermaid> {
  carregado ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      // rótulo em texto SVG, não em HTML: o rótulo HTML vazio (a coluna de comentário do erDiagram) é
      // medido com a largura da página e estica todas as caixas
      htmlLabels: false,
      fontFamily: "'Lexend Deca', system-ui, sans-serif",
      themeVariables: {
        darkMode: true,
        background: PALETA.superficie,
        primaryColor: PALETA.superficie2,
        primaryTextColor: PALETA.texto,
        primaryBorderColor: PALETA.cobre,
        secondaryColor: PALETA.superficie,
        tertiaryColor: PALETA.superficie,
        lineColor: PALETA.texto2,
        textColor: PALETA.texto,
        mainBkg: PALETA.superficie2,
        nodeBorder: PALETA.cobre,
        edgeLabelBackground: PALETA.superficie,
        attributeBackgroundColorOdd: '#1c1c1c',
        attributeBackgroundColorEven: PALETA.superficie2,
      },
      // nome de entidade numa linha só ("Empreendimento" quebrava no meio)
      flowchart: { wrappingWidth: 400 },
    })
    return mermaid
  })
  return carregado
}

/** O nome da entidade a partir do id que o Mermaid dá ao grupo dela: "mermaid-r1-entity-venda-3" → "venda". */
function entidadeDoGrupo(id: string): string | null {
  return /entity-(.+)-\d+$/.exec(id)?.[1] ?? null
}

/** Um diagrama Mermaid renderizado em SVG; no erDiagram, cada tabela pode ser clicada. */
export function Diagrama({ texto, rotulo, aoClicar, selecionada, alto = false }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const id = `mermaid-${useId().replace(/:/g, '')}`
  const [estado, setEstado] = useState<'carregando' | 'pronto' | string>('carregando')
  const clique = useRef(aoClicar)
  clique.current = aoClicar

  useEffect(() => {
    let valendo = true
    setEstado('carregando')
    // a medida do texto precisa da Lexend já carregada; com a fonte reserva, as caixas saem estreitas
    Promise.all([carregarMermaid(), document.fonts.ready])
      .then(([mermaid]) => mermaid.render(id, texto))
      .then(({ svg }) => {
        if (!valendo || !caixa.current) return
        caixa.current.innerHTML = svg
        const desenho = caixa.current.querySelector('svg')
        if (desenho) {
          desenho.setAttribute('role', 'img')
          desenho.setAttribute('aria-label', rotulo)
          // o enquadramento sai do desenho de verdade: o que o Mermaid calcula às vezes corta a ponta
          const b = desenho.getBBox()
          const margem = 8
          desenho.setAttribute('viewBox', `${b.x - margem} ${b.y - margem} ${b.width + 2 * margem} ${b.height + 2 * margem}`)
          desenho.style.maxWidth = `${b.width + 2 * margem}px`
        }
        for (const g of caixa.current.querySelectorAll<SVGGElement>('g[id*="entity-"]')) {
          const entidade = entidadeDoGrupo(g.id)
          if (!entidade) continue
          g.dataset.entidade = entidade
          g.addEventListener('click', () => clique.current?.(entidade))
        }
        setEstado('pronto')
      })
      .catch((erro: unknown) => valendo && setEstado(erro instanceof Error ? erro.message : String(erro)))
    return () => {
      valendo = false
    }
  }, [texto, id, rotulo])

  // a seleção muda sem desenhar de novo: só a marca no grupo
  useEffect(() => {
    for (const g of caixa.current?.querySelectorAll<SVGGElement>('g[data-entidade]') ?? []) {
      g.toggleAttribute('data-selecionada', g.dataset.entidade === selecionada)
    }
  }, [selecionada, estado])

  return (
    <div className={css.diagrama} data-clicavel={Boolean(aoClicar)} data-alto={alto}>
      {estado === 'carregando' && <p className={css.aviso}>Desenhando o diagrama…</p>}
      {estado !== 'carregando' && estado !== 'pronto' && <p className={css.aviso} role="alert">O diagrama não desenhou: {estado}</p>}
      <div ref={caixa} />
    </div>
  )
}
