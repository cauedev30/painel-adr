// O "Baixar PDF da tela" precisa do que cada cartão e cada KPI já consultou. Em vez de consultar de
// novo, cada um deixa aqui o que mostra (título, frase, gráfico, tabela), e o botão da tela junta tudo
// na ordem em que aparece na página.
import { type ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { TELAS, type Rota } from '../navegacao/rotas.ts'
import type { EntradaPdf } from './conteudo.ts'

type Registro = { rota: Rota; entradas: Map<string, EntradaPdf> }

const Contexto = createContext<Registro | null>(null)

export function RegistroDoPdf({ rota, children }: { rota: Rota; children: ReactNode }) {
  const entradas = useRef(new Map<string, EntradaPdf>()).current
  return <Contexto.Provider value={{ rota, entradas }}>{children}</Contexto.Provider>
}

function usarRegistro(): Registro {
  const registro = useContext(Contexto)
  if (!registro) throw new Error('falta o RegistroDoPdf em volta do painel')
  return registro
}

/** Deixa no registro o que este cartão ou KPI mostra agora; sai do registro ao desmontar. */
export function usarEntradaDoPdf(entrada: EntradaPdf): void {
  const { entradas } = usarRegistro()
  useEffect(() => {
    entradas.set(entrada.ancora, entrada)
  })
  useEffect(() => () => {
    entradas.delete(entrada.ancora)
  }, [entradas, entrada.ancora])
}

export type Relatorio = { rota: Rota; nomeDaTela: string; comFiltros: boolean }

/** A rota e o nome da tela, para o cabeçalho e o nome do arquivo. */
export function usarRelatorio(): Relatorio {
  const { rota } = usarRegistro()
  const tela = TELAS.find((t) => t.id === rota.tela) ?? TELAS[0]
  return { rota, nomeDaTela: tela.nome, comFiltros: tela.filtros }
}

/** O que está registrado, na ordem da página. */
export function usarEntradasDaTela(): () => EntradaPdf[] {
  const { entradas } = usarRegistro()
  return () => {
    const lista = [...entradas.values()].map((e) => ({ e, el: document.getElementById(e.ancora) }))
    lista.sort((a, b) => {
      if (!a.el || !b.el) return a.el ? -1 : b.el ? 1 : 0
      return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
    return lista.map((x) => x.e)
  }
}
