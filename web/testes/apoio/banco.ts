import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

// Apoio dos testes de SQL: abre o banco que o pipeline gera e roda as consultas de sql/consultas/,
// do mesmo jeito que o painel vai rodar (o mesmo texto, os mesmos parâmetros).
export const RAIZ = fileURLToPath(new URL('../../..', import.meta.url))
export const BANCO = resolve(RAIZ, 'web/public/banco.tar.gz')
export const DIR_CONSULTAS = resolve(RAIZ, 'sql/consultas')

export type Param = string | number | null

// O filtro padrão do painel (D4.2): os últimos 12 meses, todos os empreendimentos
export const PARAMS_PADRAO: Param[] = ['2025-10-01', '2026-09-30', null]

export async function abrirBanco(): Promise<PGlite> {
  if (!existsSync(BANCO)) throw new Error('web/public/banco.tar.gz não existe: rode python pipeline.py antes')
  return PGlite.create({ loadDataDir: new Blob([readFileSync(BANCO)]) })
}

/** Texto de sql/consultas/<id>.sql; o id é `tela/cartao`. */
export function lerSql(id: string): string {
  return readFileSync(resolve(DIR_CONSULTAS, `${id}.sql`), 'utf-8')
}

/** Os ids de todas as consultas de sql/consultas/, em ordem alfabética. */
export function listarConsultas(): string[] {
  return readdirSync(DIR_CONSULTAS, { recursive: true, encoding: 'utf-8' })
    .filter((a) => a.endsWith('.sql'))
    .map((a) => a.replaceAll('\\', '/').replace(/\.sql$/, ''))
    .sort()
}

/** Consulta filtrável é a que recebe $1, $2 e $3 (período e empreendimento). */
export function filtravel(sql: string): boolean {
  return /\$1\b/.test(sql)
}

/** Roda a consulta <id>; os parâmetros só vão para as filtráveis (o Postgres recusa parâmetro sobrando). */
export async function rodar<T = Record<string, unknown>>(db: PGlite, id: string, params: Param[] = PARAMS_PADRAO): Promise<T[]> {
  const sql = lerSql(id)
  const r = await db.query<T>(sql, filtravel(sql) ? params : [])
  return r.rows
}
