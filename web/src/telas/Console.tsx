import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ResultadoLivre, executar, restaurarBanco } from '../banco/cliente.ts'
import { CONSULTAS } from '../banco/consultas.ts'
import { usarConsulta } from '../banco/usarConsulta.ts'
import { LIMITE_DE_LINHAS, exemplosDoConsole, paramsDosCampos, parametrosUsados, textoDaCelula, valoresDaRota } from '../console.ts'
import type { LinhaDer } from '../der.ts'
import { inteiro } from '../formatar.ts'
import css from './Console.module.css'
import type { PropsDaTela } from './tipos.ts'

// o CodeMirror só baixa quando o Console abre (D6.2)
const EditorSql = lazy(() => import('../componentes/EditorSql.tsx'))

const EXEMPLOS = exemplosDoConsole(CONSULTAS)
const NOMES_DOS_PARAMETROS = ['início', 'fim', 'empreendimento']
const INICIAL = CONSULTAS[EXEMPLOS[0]?.id] ?? 'select * from adr.empreendimento;'

type Estado =
  | { tipo: 'parado' }
  | { tipo: 'rodando' }
  | { tipo: 'pronto'; resultado: ResultadoLivre }
  | { tipo: 'erro'; mensagem: string }

export function Console({ rota }: PropsDaTela) {
  const pedida = rota.extra.consulta
  const [texto, setTexto] = useState(() => (pedida && CONSULTAS[pedida]) || INICIAL)
  const [valores, setValores] = useState(() => valoresDaRota(rota))
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' })
  const [restauro, setRestauro] = useState<'nada' | 'restaurando' | 'feito' | string>('nada')
  const der = usarConsulta<LinhaDer>('dados/der', [])
  const quantos = parametrosUsados(texto)

  const esquema = useMemo(() => {
    const mapa: Record<string, string[]> = {}
    for (const l of der.linhas ?? []) (mapa[l.tabela] ??= []).push(l.coluna)
    return mapa
  }, [der.linhas])

  // o estado mais novo, para o Ctrl+Enter do editor (criado uma vez) rodar o texto atual
  const atual = useRef({ texto, valores, quantos })
  atual.current = { texto, valores, quantos }

  const rodar = useCallback(async () => {
    const { texto: sql, valores: campos, quantos: n } = atual.current
    setEstado({ tipo: 'rodando' })
    try {
      const params = paramsDosCampos(Array.from({ length: n }, (_, i) => campos[i] ?? ''))
      setEstado({ tipo: 'pronto', resultado: await executar(sql, params) })
    } catch (erro) {
      setEstado({ tipo: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) })
    }
  }, [])

  // "abrir no console" (seção 6.2): chega com o SQL e os filtros do cartão, e já roda
  useEffect(() => {
    if (pedida && CONSULTAS[pedida]) {
      setTexto(CONSULTAS[pedida])
      setValores(valoresDaRota(rota))
      atual.current = { texto: CONSULTAS[pedida], valores: valoresDaRota(rota), quantos: parametrosUsados(CONSULTAS[pedida]) }
      void rodar()
    }
    // só quando a consulta pedida muda
  }, [pedida])

  function abrirExemplo(id: string) {
    setTexto(CONSULTAS[id])
    atual.current = { ...atual.current, texto: CONSULTAS[id], quantos: parametrosUsados(CONSULTAS[id]) }
    void rodar()
  }

  async function restaurar() {
    setRestauro('restaurando')
    try {
      await restaurarBanco()
      setRestauro('feito')
    } catch (erro) {
      setRestauro(erro instanceof Error ? erro.message : String(erro))
    }
  }

  return (
    <div className={css.console}>
      <p className={css.avisoCelular}>O console funciona melhor no computador: no celular, o teclado cobre o resultado.</p>

      <div className={css.principal}>
        <Suspense fallback={<p className={css.carregando}>Carregando o editor…</p>}>
          {der.linhas && (
            <EditorSql valor={texto} aoMudar={setTexto} aoExecutar={rodar} esquema={esquema}
              rotulo="Editor de SQL. Ctrl+Enter executa." />
          )}
        </Suspense>

        {quantos > 0 && (
          <fieldset className={css.parametros}>
            <legend>Parâmetros (vazio = nulo)</legend>
            {Array.from({ length: quantos }, (_, i) => (
              <label key={i}>
                <span>${i + 1}{NOMES_DOS_PARAMETROS[i] ? ` · ${NOMES_DOS_PARAMETROS[i]}` : ''}</span>
                <input type="text" value={valores[i] ?? ''} spellCheck={false}
                  onChange={(e) => setValores((v) => Object.assign([...v], { [i]: e.target.value }))} />
              </label>
            ))}
          </fieldset>
        )}

        <div className={css.botoes}>
          <button type="button" className={css.executar} onClick={rodar} disabled={estado.tipo === 'rodando'}>
            Executar <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
          </button>
          <button type="button" className={css.restaurar} onClick={restaurar} disabled={restauro === 'restaurando'}>
            Restaurar banco
          </button>
          <span className={css.statusRestauro} role="status">
            {restauro === 'restaurando' ? 'Restaurando o banco original…'
              : restauro === 'feito' ? 'Banco restaurado: tudo voltou ao original.'
              : restauro === 'nada' ? '' : `Não deu para restaurar: ${restauro}`}
          </span>
        </div>

        <Resultado estado={estado} />
      </div>

      <aside className={css.lateral}>
        <section aria-labelledby="exemplos">
          <h2 id="exemplos" className={css.tituloLateral}>Exemplos</h2>
          <ul className={css.exemplos}>
            {EXEMPLOS.map((e) => (
              <li key={e.id}><button type="button" onClick={() => abrirExemplo(e.id)}>{e.titulo}</button></li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="tabelas">
          <h2 id="tabelas" className={css.tituloLateral}>Tabelas e colunas</h2>
          <ul className={css.tabelas}>
            {Object.entries(esquema).map(([tabela, colunas]) => (
              <li key={tabela}>
                <details>
                  <summary><code>{tabela}</code></summary>
                  <ul>
                    {(der.linhas ?? []).filter((l) => l.tabela === tabela).map((l) => (
                      <li key={l.coluna}><code>{l.coluna}</code> <span>{l.tipo}</span></li>
                    ))}
                  </ul>
                </details>
                <span className="so-leitor">{colunas.length} colunas</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

/** O resultado embaixo do editor (D6.5): a tabela até 500 linhas, o total e o tempo, ou o erro do Postgres. */
function Resultado({ estado }: { estado: Estado }) {
  if (estado.tipo === 'parado') return <p className={css.dica}>Escreva um SQL e aperte Ctrl+Enter, ou escolha um exemplo.</p>
  if (estado.tipo === 'rodando') return <p className={css.dica} role="status">Rodando no PostgreSQL do seu navegador…</p>
  if (estado.tipo === 'erro') {
    return (
      <div className={css.erro} role="alert">
        <strong>O PostgreSQL recusou:</strong> {estado.mensagem}
      </div>
    )
  }

  const { campos, linhas, ms, comando, afetadas } = estado.resultado
  const tempo = `${inteiro(Math.max(1, Math.round(ms)))} ms`
  if (campos.length === 0) {
    const feito = afetadas !== null && afetadas > 0 ? `${inteiro(afetadas)} ${afetadas === 1 ? 'linha afetada' : 'linhas afetadas'}` : 'feito'
    return <p className={css.resumo} role="status"><code>{comando || 'comando'}</code>: {feito}, em {tempo}.</p>
  }

  const mostradas = linhas.slice(0, LIMITE_DE_LINHAS)
  return (
    <div className={css.resultado}>
      <p className={css.resumo} role="status">
        {inteiro(linhas.length)} {linhas.length === 1 ? 'linha' : 'linhas'} em {tempo}
        {linhas.length > LIMITE_DE_LINHAS && ` (mostrando as ${inteiro(LIMITE_DE_LINHAS)} primeiras)`}
      </p>
      <div className={css.rolagem}>
        <table className={css.tabela}>
          <caption className="so-leitor">Resultado da consulta</caption>
          <thead>
            <tr>{campos.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {mostradas.map((linha, i) => (
              <tr key={i}>
                {campos.map((c, j) => {
                  const v = linha[c]
                  return <td key={j} className={typeof v === 'number' ? css.numero : v === null ? css.nulo : undefined}>{textoDaCelula(v)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
