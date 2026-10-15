// A tela e os filtros moram no hash da URL (D5.2): #/visao-geral?de=2025-10&ate=2026-09&emp=2.
// Assim o link com filtro pode ser compartilhado, e o GitHub Pages não dá 404 ao recarregar a página.
import { EMPREENDIMENTOS } from '../empreendimentos.ts'

export const TELAS = [
  { id: 'visao-geral', nome: 'Visão geral', icone: 'painel' },
  { id: 'vendas-estoque', nome: 'Vendas e estoque', icone: 'predio' },
  { id: 'funil-corretores', nome: 'Funil e corretores', icone: 'funil' },
  { id: 'recebiveis', nome: 'Recebíveis', icone: 'moeda' },
  { id: 'dados', nome: 'Dados', icone: 'banco' },
  { id: 'console', nome: 'Console SQL', icone: 'terminal' },
] as const

export type IdTela = (typeof TELAS)[number]['id']
export type Icone = (typeof TELAS)[number]['icone']

export type Rota = {
  tela: IdTela
  de: string   // AAAA-MM
  ate: string  // AAAA-MM
  emp: number | null
  extra: Record<string, string>
}

// o período dos dados simulados e o filtro padrão do painel: os últimos 12 meses (D4.2)
export const PRIMEIRO_MES = '2023-01'
export const ULTIMO_MES = '2026-09'
export const PADRAO: Rota = { tela: 'visao-geral', de: '2025-10', ate: '2026-09', emp: null, extra: {} }

const ANO_MES = /^\d{4}-(0[1-9]|1[0-2])$/

function mesValido(valor: string | null): valor is string {
  return valor !== null && ANO_MES.test(valor) && valor >= PRIMEIRO_MES && valor <= ULTIMO_MES
}

export function lerHash(hash: string): Rota {
  const [caminho, busca = ''] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(busca)
  const tela = TELAS.find((t) => t.id === caminho)?.id ?? PADRAO.tela

  let de = params.get('de')
  let ate = params.get('ate')
  de = mesValido(de) ? de : PADRAO.de
  ate = mesValido(ate) ? ate : PADRAO.ate
  if (de > ate) [de, ate] = [ate, de]

  const emp = Number(params.get('emp'))
  const extra: Record<string, string> = {}
  for (const [chave, valor] of params) if (!['de', 'ate', 'emp'].includes(chave)) extra[chave] = valor

  return { tela, de, ate, emp: EMPREENDIMENTOS.some((e) => e.id === emp) ? emp : null, extra }
}

export function escreverHash(rota: Rota): string {
  const params = new URLSearchParams({ de: rota.de, ate: rota.ate })
  if (rota.emp !== null) params.set('emp', String(rota.emp))
  for (const [chave, valor] of Object.entries(rota.extra)) params.set(chave, valor)
  return `#/${rota.tela}?${params}`
}

function somarMeses(anoMes: string, n: number): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function ultimoDia(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  return `${anoMes}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`
}

/** Os parâmetros $1, $2 e $3 das consultas filtráveis: início no dia 1, fim no último dia do mês. */
export function paramsDaRota(rota: Rota): [string, string, number | null] {
  return [`${rota.de}-01`, ultimoDia(rota.ate), rota.emp]
}

/** O período anterior de mesma duração, o mesmo que as consultas usam no valor_anterior (D4.1). */
export function periodoAnterior(rota: Rota): { de: string; ate: string } {
  const [anoDe, mesDe] = rota.de.split('-').map(Number)
  const [anoAte, mesAte] = rota.ate.split('-').map(Number)
  const meses = (anoAte - anoDe) * 12 + (mesAte - mesDe) + 1
  return { de: somarMeses(rota.de, -meses), ate: somarMeses(rota.de, -1) }
}
