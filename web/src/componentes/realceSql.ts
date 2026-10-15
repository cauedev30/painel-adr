// Um realce simples para o "Ver SQL": comentário apagado, palavra-chave em cobre, parâmetro e texto
// entre aspas destacados. Só pinta; o texto continua exatamente o do arquivo (o teste confere).

export type Pedaco = { tipo: 'comentario' | 'palavra' | 'parametro' | 'aspas' | 'texto'; texto: string }

const PALAVRAS = [
  'select', 'from', 'where', 'with', 'as', 'join', 'left', 'cross', 'lateral', 'on', 'using', 'and', 'or', 'not',
  'group', 'by', 'order', 'having', 'union', 'all', 'case', 'when', 'then', 'else', 'end', 'over', 'partition',
  'rows', 'between', 'preceding', 'current', 'row', 'window', 'filter', 'distinct', 'in', 'is', 'null', 'exists',
  'limit', 'desc', 'asc', 'values', 'true', 'false', 'interval', 'date', 'within', 'create', 'function', 'view',
  'returns', 'table', 'language', 'sql', 'stable', 'immutable', 'like',
]

const TOKEN = new RegExp(`(--[^\\n]*)|('(?:[^']|'')*')|(\\$\\d+)|\\b(${PALAVRAS.join('|')})\\b`, 'gi')

export function realcarSql(sql: string): Pedaco[] {
  const pedacos: Pedaco[] = []
  let fim = 0
  for (const m of sql.matchAll(TOKEN)) {
    if (m.index > fim) pedacos.push({ tipo: 'texto', texto: sql.slice(fim, m.index) })
    const tipo = m[1] ? 'comentario' : m[2] ? 'aspas' : m[3] ? 'parametro' : 'palavra'
    pedacos.push({ tipo, texto: m[0] })
    fim = m.index + m[0].length
  }
  if (fim < sql.length) pedacos.push({ tipo: 'texto', texto: sql.slice(fim) })
  return pedacos
}
