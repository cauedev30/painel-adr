/** Canal com menos leads que isso não entra na disputa da maior conversão: 2 vendas em 5 leads não é padrão. */
export const MIN_LEADS_CANAL = 30

// Os canais de entrada dos leads, como estão no banco (adr.lead.canal), com o nome e o artigo que as
// frases usam: "o Instagram traz…", "a indicação converte…".
export const NOMES_DOS_CANAIS: Record<string, { nome: string; artigo: 'o' | 'a' }> = {
  instagram: { nome: 'Instagram', artigo: 'o' },
  site: { nome: 'site', artigo: 'o' },
  whatsapp: { nome: 'WhatsApp', artigo: 'o' },
  tiktok: { nome: 'TikTok', artigo: 'o' },
  imobiliaria: { nome: 'imobiliária', artigo: 'a' },
  indicacao: { nome: 'indicação', artigo: 'a' },
  evento: { nome: 'evento', artigo: 'o' },
  outro: { nome: 'outros', artigo: 'o' },
}

/** O nome do canal num rótulo ou tabela, com maiúscula: "Site", "Indicação"; o desconhecido sai como está no banco. */
export function nomeDoCanal(canal: string): string {
  const nome = NOMES_DOS_CANAIS[canal]?.nome ?? canal
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

/** "o Instagram", "a indicação". */
export function comArtigo(canal: string): string {
  const c = NOMES_DOS_CANAIS[canal]
  return c ? `${c.artigo} ${c.nome}` : canal
}
