// Os 7 empreendimentos reais da ADR, na ordem e com os ids do banco (adr.empreendimento). Ficam aqui
// porque o filtro aparece antes de qualquer consulta; um teste confere que batem com o banco.
export const EMPREENDIMENTOS = [
  { id: 1, nome: 'Mares Cabo Branco', slug: 'mares-cabo-branco' },
  { id: 2, nome: 'Mares Seaside', slug: 'mares-seaside' },
  { id: 3, nome: 'Mares Seaview', slug: 'mares-seaview' },
  { id: 4, nome: 'Mares Bessa', slug: 'mares-bessa' },
  { id: 5, nome: 'Mares Sense', slug: 'mares-sense' },
  { id: 6, nome: 'Mares Blanc', slug: 'mares-blanc' },
  { id: 7, nome: 'Nexus One', slug: 'nexus-one' },
] as const

export type Empreendimento = (typeof EMPREENDIMENTOS)[number]

export function nomeDoEmpreendimento(id: number | null): string {
  return EMPREENDIMENTOS.find((e) => e.id === id)?.nome ?? 'Todos os empreendimentos'
}
