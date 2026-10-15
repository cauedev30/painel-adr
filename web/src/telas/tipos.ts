import type { Rota } from '../navegacao/rotas.ts'

/** O que toda tela recebe: a rota (tela e filtros) e como mudar o hash. */
export type PropsDaTela = { rota: Rota; navegar: (mudanca: Partial<Rota>) => void }
