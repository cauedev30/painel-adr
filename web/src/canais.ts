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

/** O nome do canal para mostrar; canal desconhecido aparece como está no banco. */
export function nomeDoCanal(canal: string): string {
  return NOMES_DOS_CANAIS[canal]?.nome ?? canal
}

/** "o Instagram", "a indicação". */
export function comArtigo(canal: string): string {
  const c = NOMES_DOS_CANAIS[canal]
  return c ? `${c.artigo} ${c.nome}` : canal
}
