// A lógica do Console SQL (D6.5), fora da tela para ser testada: quantos parâmetros o texto usa, os
// valores que chegam do "abrir no console", os exemplos prontos e como cada célula aparece.
// Testado em testes/painel/console.test.ts.
import { type Rota, paramsDaRota } from './navegacao/rotas.ts'

export type Param = string | number | null

/** Até quantas linhas o resultado mostra; o total aparece sempre. */
export const LIMITE_DE_LINHAS = 500

/** O maior $n do texto, sem contar comentário nem texto entre aspas: 0 quando o SQL não tem parâmetro. */
export function parametrosUsados(sql: string): number {
  const semComentarioNemAspas = sql.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")
  const numeros = [...semComentarioNemAspas.matchAll(/\$(\d+)\b/g)].map((m) => Number(m[1]))
  return numeros.length === 0 ? 0 : Math.max(...numeros)
}

/** Os valores dos campos $1, $2, $3 quando o console abre com os filtros de um cartão: '' é nulo. */
export function valoresDaRota(rota: Rota): string[] {
  return paramsDaRota(rota).map((p) => (p === null ? '' : String(p)))
}

/** Dos campos para os parâmetros: vazio vira nulo e número inteiro vira número (como os cartões mandam). */
export function paramsDosCampos(valores: string[]): Param[] {
  return valores.map((v) => {
    const t = v.trim()
    if (t === '') return null
    return /^-?\d+$/.test(t) ? Number(t) : t
  })
}

/** Os exemplos prontos: os .sql de sql/consultas/console/, com a pergunta do cabeçalho como título. */
export function exemplosDoConsole(catalogo: Record<string, string>): { id: string; titulo: string }[] {
  return Object.keys(catalogo)
    .filter((id) => id.startsWith('console/'))
    .sort()
    .map((id) => ({ id, titulo: /^-- Pergunta: (.+)$/m.exec(catalogo[id])?.[1] ?? id }))
}

/** Uma célula do resultado como texto: nulo aparece como null, data em ISO, jsonb e array em JSON. */
export function textoDaCelula(valor: unknown): string {
  if (valor === null || valor === undefined) return 'null'
  if (valor instanceof Date) {
    const iso = valor.toISOString()
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.replace('T', ' ').replace(/\.000Z$/, '')
  }
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}
