import { useEffect, useRef, useState } from 'react'
import type { Param } from '../banco/cliente.ts'
import { CONSULTAS } from '../banco/consultas.ts'
import { nomeDoEmpreendimento } from '../empreendimentos.ts'
import { data } from '../formatar.ts'
import { PADRAO, escreverHash } from '../navegacao/rotas.ts'
import { Icone } from './Icone.tsx'
import css from './PainelSql.module.css'
import { realcarSql } from './realceSql.ts'

type Props = {
  id: string
  /** Os parâmetros em uso; nulo quando a consulta não é filtrável. */
  params: Param[] | null
  aberto: boolean
  aoFechar: () => void
}

/** Os parâmetros como o recrutador lê: "$1 início = 01/10/2025". */
function descreverParams([inicio, fim, emp]: Param[]): string[] {
  return [
    `$1 início = ${data(String(inicio))}`,
    `$2 fim = ${data(String(fim))}`,
    `$3 empreendimento = ${emp === null ? 'nulo (todos)' : `${emp} (${nomeDoEmpreendimento(Number(emp))})`}`,
  ]
}

/** O link do console com a consulta e os mesmos filtros: #/console?de=…&ate=…&emp=…&consulta=<id>. */
function linkDoConsole(id: string, params: Param[] | null): string {
  const [inicio, fim, emp] = params ?? []
  return escreverHash({
    tela: 'console',
    de: inicio ? String(inicio).slice(0, 7) : PADRAO.de,
    ate: fim ? String(fim).slice(0, 7) : PADRAO.ate,
    emp: typeof emp === 'number' ? emp : null,
    extra: { consulta: id },
  })
}

/**
 * O "Ver SQL" (seção 6.2): painel lateral com o texto do .sql, o mesmo que o cartão rodou (D9), os
 * parâmetros em uso, "copiar" e "abrir no console". É um <dialog>: o Esc fecha e o foco volta ao botão.
 */
export function PainelSql({ id, params, aberto, aoFechar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [copia, setCopia] = useState<'nada' | 'copiado' | 'falhou'>('nada')
  const sql = CONSULTAS[id] ?? ''

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(sql)
      setCopia('copiado')
    } catch {
      setCopia('falhou')  // o navegador pode negar a área de transferência; o texto continua selecionável
    }
    setTimeout(() => setCopia('nada'), 2500)
  }

  return (
    <dialog ref={dialogo} className={css.painel} aria-labelledby={`sql-${id}`} onClose={aoFechar}
      onClick={(e) => e.target === dialogo.current && dialogo.current.close()}>
      <div className={css.conteudo}>
        <header className={css.topo}>
          <div>
            <h2 id={`sql-${id}`} className={css.titulo}>Ver SQL</h2>
            <p className={css.arquivo}>sql/consultas/{id}.sql</p>
          </div>
          <button type="button" className={css.fechar} onClick={() => dialogo.current?.close()}>
            <Icone nome="fechar" />
            <span className="so-leitor">Fechar</span>
          </button>
        </header>

        {params ? (
          <ul className={css.params} aria-label="Parâmetros em uso">
            {descreverParams(params).map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : (
          <p className={css.semParams}>Sem parâmetros: a consulta não depende dos filtros.</p>
        )}

        <div className={css.acoes}>
          <button type="button" onClick={copiar}>
            <Icone nome="copiar" tamanho={16} />
            {copia === 'copiado' ? 'Copiado' : copia === 'falhou' ? 'Não deu para copiar' : 'Copiar'}
          </button>
          <a href={linkDoConsole(id, params)} onClick={() => dialogo.current?.close()}>
            <Icone nome="terminal" tamanho={16} />
            Abrir no console
          </a>
          <span className="so-leitor" aria-live="polite">{copia === 'copiado' ? 'SQL copiado' : copia === 'falhou' ? 'Não deu para copiar o SQL' : ''}</span>
        </div>

        <pre className={css.codigo}>
          <code>
            {realcarSql(sql).map((p, i) => p.tipo === 'texto' ? p.texto : <span key={i} className={css[p.tipo]}>{p.texto}</span>)}
          </code>
        </pre>
      </div>
    </dialog>
  )
}
