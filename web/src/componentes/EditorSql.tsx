// O editor do Console SQL (D6.5): CodeMirror com o dialeto PostgreSQL e o autocompletar das tabelas e
// colunas do banco. Este arquivo só é baixado quando o Console abre (D6.2).
import { PostgreSQL, sql } from '@codemirror/lang-sql'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { EditorView, basicSetup } from 'codemirror'
import { useEffect, useRef } from 'react'
import { PALETA } from '../tema/paleta.ts'

type Props = {
  valor: string
  aoMudar: (valor: string) => void
  aoExecutar: () => void
  /** Tabela → colunas, para o autocompletar: { 'adr.venda': ['id', 'data_venda', …] }. */
  esquema: Record<string, string[]>
  rotulo: string
}

const tema = EditorView.theme({
  '&': { backgroundColor: PALETA.fundo, color: PALETA.texto, fontSize: '0.875rem', border: `1px solid ${PALETA.borda}`, borderRadius: '8px' },
  '&.cm-focused': { outline: `2px solid ${PALETA.dourado}`, outlineOffset: '2px' },
  '.cm-content': { fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace", caretColor: PALETA.dourado, padding: '12px 0' },
  '.cm-scroller': { minHeight: '220px', maxHeight: '420px' },
  '.cm-gutters': { backgroundColor: PALETA.fundo, color: PALETA.texto2, border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(230, 184, 92, 0.3)' },
  '.cm-tooltip': { backgroundColor: PALETA.superficie2, border: `1px solid ${PALETA.borda}`, color: PALETA.texto },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: PALETA.borda, color: PALETA.texto },
  '.cm-matchingBracket': { backgroundColor: 'rgba(204, 128, 64, 0.3)', outline: 'none' },
}, { dark: true })

// as mesmas cores do "Ver SQL": palavra-chave em cobre, texto e número em dourado, comentário apagado
const cores = HighlightStyle.define([
  { tag: tags.keyword, color: PALETA.cobreForte },
  { tag: [tags.string, tags.number, tags.special(tags.string)], color: PALETA.dourado },
  { tag: tags.comment, color: PALETA.texto2, fontStyle: 'italic' },
  { tag: [tags.typeName, tags.bool, tags.null], color: PALETA.cobreForte },
  { tag: [tags.operator, tags.punctuation], color: PALETA.texto2 },
])

export default function EditorSql({ valor, aoMudar, aoExecutar, esquema, rotulo }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView | null>(null)
  const ultimos = useRef({ aoMudar, aoExecutar })
  ultimos.current = { aoMudar, aoExecutar }

  useEffect(() => {
    const view = new EditorView({
      parent: caixa.current!,
      doc: valor,
      extensions: [
        // Ctrl+Enter (Cmd+Enter no Mac) executa, antes de qualquer atalho do basicSetup
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (ultimos.current.aoExecutar(), true) }])),
        basicSetup,
        sql({ dialect: PostgreSQL, schema: esquema, upperCaseKeywords: false }),
        tema,
        syntaxHighlighting(cores),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': rotulo }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) ultimos.current.aoMudar(u.state.doc.toString())
        }),
      ],
    })
    editor.current = view
    return () => view.destroy()
    // o esquema chega uma vez; o texto de fora entra pelo efeito abaixo
  }, [esquema])

  // o texto trocado de fora (um exemplo, o "abrir no console") substitui o do editor
  useEffect(() => {
    const view = editor.current
    if (view && view.state.doc.toString() !== valor) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: valor } })
    }
  }, [valor])

  return <div ref={caixa} />
}
