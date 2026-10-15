// O catálogo de consultas (D5.3): o texto de cada sql/consultas/<tela>/<cartao>.sql, importado na
// compilação. Arquivo novo entra no painel sozinho, e o "Ver SQL" mostra exatamente o texto que roda (D9).
const ARQUIVOS = import.meta.glob<string>('../../../sql/consultas/**/*.sql', { query: '?raw', import: 'default', eager: true })

export const CONSULTAS: Record<string, string> = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([caminho, texto]) => [caminho.replace(/^.*sql\/consultas\//, '').replace(/\.sql$/, ''), texto]),
)

/** A consulta recebe $1 (início), $2 (fim) e $3 (empreendimento)? As outras rodam sem parâmetro. */
export function filtravel(id: string): boolean {
  return /\$1\b/.test(CONSULTAS[id] ?? '')
}
