import { describe, expect, it } from 'vitest'
import { filtravel, lerSql, listarConsultas } from '../apoio/banco.ts'

// D4.6: toda consulta começa pela pergunta que responde; o "Ver SQL" mostra o cabeçalho junto
const CABECALHO = ['-- Pergunta:', '-- Parâmetros:', '-- Devolve:']
const PARAMS = 'with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id)'

// O catálogo fechado do plano da etapa 4: as colunas de cada consulta são o contrato com o painel
const CATALOGO = [
  'visao-geral/kpi_vgv', 'visao-geral/kpi_vso', 'visao-geral/kpi_estoque', 'visao-geral/kpi_ticket_medio',
  'visao-geral/kpi_preco_m2', 'visao-geral/kpi_inadimplencia', 'visao-geral/vendas_mensais',
  'vendas-estoque/empreendimentos', 'vendas-estoque/ritmo_acumulado', 'vendas-estoque/preco_m2_distribuicao',
  'vendas-estoque/preco_m2_estatisticas', 'vendas-estoque/vista_mar',
  'funil-corretores/funil', 'funil-corretores/canais', 'funil-corretores/ranking_corretores',
  'recebiveis/kpi_a_receber_12m', 'recebiveis/kpi_recebido_mes', 'recebiveis/previsto_recebido',
  'recebiveis/faixas_atraso', 'recebiveis/mapa_calor', 'recebiveis/inadimplencia_por_empreendimento',
  'recebiveis/inadimplencia_por_desconto', 'recebiveis/distratos_e_atraso',
  'dados/der', 'dados/qualidade',
  'console/01_maiores_vendas', 'console/02_inadimplencia_por_empreendimento', 'console/03_leads_por_canal_e_mes',
  'console/04_media_movel_vendas', 'console/05_quarentena_por_motivo',
]

/** O que falta no arquivo para seguir o padrão; vazio quando está certo. */
function problemas(sql: string): string[] {
  const linhas = sql.replaceAll('\r', '').split('\n')
  const faltas = CABECALHO.filter((inicio, i) => !linhas[i]?.startsWith(inicio)).map((c) => `cabeçalho sem "${c}"`)
  if (filtravel(sql)) {
    const corpo = linhas.slice(linhas.findIndex((l) => !l.startsWith('--') && l.trim() !== ''))
    if (!corpo.join('\n').startsWith(PARAMS)) faltas.push('não começa pela CTE params')
  }
  return faltas
}

describe('o padrão dos arquivos', () => {
  it('reconhece um arquivo certo e um errado', () => {
    const certo = `-- Pergunta: Quanto se vendeu?\n-- Parâmetros: $1, $2, $3\n-- Devolve: valor\n${PARAMS}\nselect 1 from params`
    expect(problemas(certo)).toEqual([])
    expect(problemas('select $1::int')).toEqual([
      'cabeçalho sem "-- Pergunta:"', 'cabeçalho sem "-- Parâmetros:"', 'cabeçalho sem "-- Devolve:"',
      'não começa pela CTE params',
    ])
  })

  it('todo .sql de sql/consultas/ tem o cabeçalho, e o filtrável começa pela CTE params', () => {
    const errados = Object.fromEntries(
      listarConsultas().map((id) => [id, problemas(lerSql(id))]).filter(([, p]) => p.length > 0),
    )
    expect(errados).toEqual({})
  })

  it('todo arquivo do catálogo existe, e não há consulta fora dele', () => {
    expect(listarConsultas()).toEqual([...CATALOGO].sort())
  })
})
