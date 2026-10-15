// O lado da tela: abre o banco no worker uma vez só e roda as consultas nele.
import { PGliteWorker } from '@electric-sql/pglite/worker'
import type { ErroDoBanco } from './worker.ts'

export type Param = string | number | null

export type Resultado<T> = { linhas: T[]; campos: { name: string; dataTypeID: number }[]; ms: number }

let banco: Promise<PGliteWorker> | null = null

/** Milissegundos do início da página até o banco pronto (D5.10); nulo enquanto abre. */
export let tempoDeAbertura: number | null = null

async function criar(): Promise<PGliteWorker> {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  const falhou = new Promise<never>((_, rejeitar) => {
    w.addEventListener('message', (e: MessageEvent<ErroDoBanco>) => {
      if (e.data?.type === 'erro-do-banco') rejeitar(new Error(e.data.mensagem))
    })
    w.addEventListener('error', (e) => rejeitar(new Error(e.message || 'o worker do banco não carregou')))
  })
  // id próprio: cada aba tem a sua cópia do banco (sem ele, as abas do navegador dividiriam uma só)
  const db = await Promise.race([PGliteWorker.create(w, { id: crypto.randomUUID() }), falhou])
  await Promise.race([db.waitReady, falhou])
  tempoDeAbertura = performance.now()
  console.info(`[painel] banco PostgreSQL pronto em ${(tempoDeAbertura / 1000).toFixed(2).replace('.', ',')} s`)
  return db
}

/** O banco, aberto uma vez só. Se a abertura falhar, a próxima chamada tenta de novo. */
export function abrirBanco(): Promise<PGliteWorker> {
  if (!banco) {
    banco = criar()
    banco.catch(() => {
      banco = null
    })
  }
  return banco
}

export async function consultar<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<Resultado<T>> {
  const db = await abrirBanco()
  const inicio = performance.now()
  const r = await db.query<T>(sql, params)
  return { linhas: r.rows, campos: r.fields, ms: performance.now() - inicio }
}
