import { useCallback, useSyncExternalStore } from 'react'
import { type Rota, escreverHash, lerHash } from './rotas.ts'

function assinar(avisar: () => void): () => void {
  window.addEventListener('hashchange', avisar)
  return () => window.removeEventListener('hashchange', avisar)
}

function hashAtual(): string {
  return window.location.hash
}

/**
 * A rota atual, lida do hash, e `navegar(mudanca)`, que escreve no hash só o que muda. Trocar de tela
 * mantém os filtros; o `extra` (ex.: a consulta aberta no console) só vale para a tela em que nasceu.
 */
export function usarRota(): [Rota, (mudanca: Partial<Rota>) => void] {
  const hash = useSyncExternalStore(assinar, hashAtual)
  const rota = lerHash(hash)

  const navegar = useCallback((mudanca: Partial<Rota>) => {
    const atual = lerHash(window.location.hash)
    const trocouDeTela = mudanca.tela !== undefined && mudanca.tela !== atual.tela
    const nova: Rota = { ...atual, ...(trocouDeTela ? { extra: {} } : {}), ...mudanca }
    window.location.hash = escreverHash(nova)
  }, [])

  return [rota, navegar]
}
