// O lado da tela: abre o banco no worker uma vez só e roda as consultas nele.
import { PGliteWorker } from '@electric-sql/pglite/worker'
import type { ErroDoBanco } from './worker.ts'

export type Param = string | number | null

export type Resultado<T> = { linhas: T[]; campos: { name: string; dataTypeID: number }[]; ms: number }

let banco: Promise<PGliteWorker> | null = null
let trabalhador: Worker | null = null

/** Milissegundos do início da página até o banco pronto (D5.10); nulo enquanto abre. */
export let tempoDeAbertura: number | null = null

/** Abre o banco num worker novo; `restaurar` pede o arquivo ao cache do navegador (D6.6). */
async function criar(restaurar = false): Promise<PGliteWorker> {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  trabalhador = w
  const falhou = new Promise<never>((_, rejeitar) => {
    w.addEventListener('message', (e: MessageEvent<ErroDoBanco>) => {
      if (e.data?.type === 'erro-do-banco') rejeitar(new Error(e.data.mensagem))
    })
    w.addEventListener('error', (e) => rejeitar(new Error(e.message || 'o worker do banco não carregou')))
  })
  // id próprio: cada aba tem a sua cópia do banco (sem ele, as abas do navegador dividiriam uma só)
  const db = await Promise.race([PGliteWorker.create(w, { id: crypto.randomUUID(), meta: { restaurar } }), falhou])
  await Promise.race([db.waitReady, falhou])
  if (!restaurar) {
    tempoDeAbertura = performance.now()
    console.info(`[painel] banco PostgreSQL pronto em ${(tempoDeAbertura / 1000).toFixed(2).replace('.', ',')} s`)
  }
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

// O PGlite roda uma consulta por vez. A fila fica aqui, e não no worker, para o tempo de cada consulta
// contar só a execução dela: com a fila no worker, o último de 5 cartões mostraria a espera pelos outros 4.
let fila: Promise<unknown> = Promise.resolve()

export function consultar<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<Resultado<T>> {
  const vez = fila.then(async () => {
    const db = await abrirBanco()
    const inicio = performance.now()
    const r = await db.query<T>(sql, params)
    return { linhas: r.rows, campos: r.fields, ms: performance.now() - inicio }
  })
  fila = vez.catch(() => undefined)
  return vez
}

export type ResultadoLivre = { campos: string[]; linhas: Record<string, unknown>[]; ms: number; comando: string; afetadas: number | null }

/**
 * O SQL do console, como a pessoa escreveu: com parâmetros, uma consulta só (`query`); sem, pode ter
 * vários comandos (`exec`), e o resultado mostrado é o do último.
 */
export function executar(sql: string, params: Param[] = []): Promise<ResultadoLivre> {
  const vez = fila.then(async () => {
    const db = await abrirBanco()
    const inicio = performance.now()
    const resultados = params.length > 0 ? [await db.query<Record<string, unknown>>(sql, params)] : await db.exec(sql)
    const ms = performance.now() - inicio
    const ultimo = resultados.at(-1)
    // a primeira palavra do último comando (select, drop, update…), para a mensagem do resultado
    const ultimoComando = sql.replace(/--[^\n]*/g, '').split(';').map((c) => c.trim()).filter(Boolean).at(-1) ?? ''
    const comando = (/^(\w+)/.exec(ultimoComando)?.[1] ?? '').toLowerCase()
    return {
      campos: ultimo?.fields.map((f) => f.name) ?? [],
      linhas: (ultimo?.rows ?? []) as Record<string, unknown>[],
      ms,
      comando,
      afetadas: ultimo?.affectedRows ?? null,
    }
  })
  fila = vez.catch(() => undefined)
  return vez
}

/**
 * "Restaurar banco" (D6.6): fecha o banco desta aba e abre outro, do arquivo original. Quem estava
 * esperando uma consulta na fila recebe o banco novo.
 */
export function restaurarBanco(): Promise<void> {
  const vez = fila.then(async () => {
    const antigo = banco
    const w = trabalhador
    banco = criar(true)
    banco.catch(() => {
      banco = null
    })
    try {
      await (await antigo)?.close()
    } catch {
      // o banco antigo pode já ter caído: o que importa é o novo abrir
    }
    w?.terminate()
    await banco
  })
  fila = vez.catch(() => undefined)
  return vez
}
