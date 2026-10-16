import { useCallback, useEffect, useSyncExternalStore } from 'react'
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
 * mantém os filtros; o `extra` (ex.: o cartão em foco) só vale para a tela em que nasceu.
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

/**
 * O link de um cartão (`?cartao=<id>`, feito por `linkDoCartao`) abre a tela já no cartão: rola até ele e põe o foco nele,
 * para o teclado e o leitor de tela continuarem dali.
 */
export function usarCartaoEmFoco(rota: Rota, pronto: boolean): void {
  const cartao = rota.extra.cartao
  useEffect(() => {
    if (!pronto || !cartao) return
    const quadro = requestAnimationFrame(() => {
      const alvo = document.getElementById(cartao)
      alvo?.scrollIntoView({ block: 'start' })
      alvo?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(quadro)
  }, [pronto, rota.tela, cartao])
}
