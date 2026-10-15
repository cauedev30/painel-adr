import { describe, expect, it } from 'vitest'
import { filtravel, lerSql, listarConsultas } from '../apoio/banco.ts'

// D4.6: toda consulta começa pela pergunta que responde; o "Ver SQL" mostra o cabeçalho junto
const CABECALHO = ['-- Pergunta:', '-- Parâmetros:', '-- Devolve:']
const PARAMS = 'with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id)'

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

  it.todo('todo arquivo do catálogo existe (ativado na tarefa 4.6)')
})
