import { useEffect, useState } from 'react'
import { type Param, abrirBanco, consultar } from './cliente.ts'
import { CONSULTAS, filtravel } from './consultas.ts'

export type EstadoDaConsulta<T> = { linhas: T[] | null; erro: string | null; carregando: boolean; ms: number | null }

/**
 * Roda a consulta `id` do catálogo com os parâmetros dos filtros. Se os filtros mudam no meio, o
 * resultado velho é descartado. A consulta que não é filtrável roda sem parâmetro.
 */
export function usarConsulta<T = Record<string, unknown>>(id: string, params: Param[]): EstadoDaConsulta<T> {
  const [estado, setEstado] = useState<EstadoDaConsulta<T>>({ linhas: null, erro: null, carregando: true, ms: null })
  const chave = JSON.stringify([id, params])

  useEffect(() => {
    let valendo = true
    const sql = CONSULTAS[id]
    setEstado((e) => ({ ...e, erro: null, carregando: true }))
    if (sql === undefined) {
      setEstado({ linhas: null, erro: `não existe a consulta ${id}`, carregando: false, ms: null })
      return
    }
    consultar<T>(sql, filtravel(id) ? params : []).then(
      (r) => valendo && setEstado({ linhas: r.linhas, erro: null, carregando: false, ms: r.ms }),
      (erro: unknown) => valendo && setEstado({ linhas: null, erro: erro instanceof Error ? erro.message : String(erro), carregando: false, ms: null }),
    )
    return () => {
      valendo = false
    }
    // a chave já resume id e params
  }, [chave])

  return estado
}

export type EstadoDoBanco = { pronto: boolean; erro: string | null; tentarDeNovo: () => void }

/** Abre o banco ao montar a tela; `tentarDeNovo` refaz a abertura depois de um erro. */
export function usarBanco(): EstadoDoBanco {
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<{ pronto: boolean; erro: string | null }>({ pronto: false, erro: null })

  useEffect(() => {
    let valendo = true
    setEstado({ pronto: false, erro: null })
    abrirBanco().then(
      () => valendo && setEstado({ pronto: true, erro: null }),
      (erro: unknown) => valendo && setEstado({ pronto: false, erro: erro instanceof Error ? erro.message : String(erro) }),
    )
    return () => {
      valendo = false
    }
  }, [tentativa])

  return { ...estado, tentarDeNovo: () => setTentativa((n) => n + 1) }
}
