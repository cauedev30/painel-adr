// O catálogo de consultas (D5.3): o texto de cada sql/consultas/<tela>/<cartao>.sql, importado na
// compilação. Arquivo novo entra no painel sozinho. As consultas que saíram do painel (o console e o
// DER em 2026-10-15; o preço/m², a vista mar e os distratos em 2026-10-16) ficam só no repositório; a
// mesma lista está em testes/painel/consultas.test.ts.
const ARQUIVOS = import.meta.glob<string>(
  [
    '../../../sql/consultas/**/*.sql',
    '!../../../sql/consultas/console/**',
    '!../../../sql/consultas/dados/der.sql',
    '!../../../sql/consultas/visao-geral/kpi_preco_m2.sql',
    '!../../../sql/consultas/vendas-estoque/preco_m2_estatisticas.sql',
    '!../../../sql/consultas/vendas-estoque/vista_mar.sql',
    '!../../../sql/consultas/recebiveis/distratos_e_atraso.sql',
  ],
  { query: '?raw', import: 'default', eager: true },
)

export const CONSULTAS: Record<string, string> = Object.fromEntries(
  Object.entries(ARQUIVOS).map(([caminho, texto]) => [caminho.replace(/^.*sql\/consultas\//, '').replace(/\.sql$/, ''), texto]),
)

/** A consulta recebe $1 (início), $2 (fim) e $3 (empreendimento)? As outras rodam sem parâmetro. */
export function filtravel(id: string): boolean {
  return /\$1\b/.test(CONSULTAS[id] ?? '')
}
