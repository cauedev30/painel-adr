import { describe, expect, it } from 'vitest'
import { exemplosDoConsole, paramsDosCampos, parametrosUsados, textoDaCelula, valoresDaRota } from '../../src/console.ts'
import { PADRAO } from '../../src/navegacao/rotas.ts'
import { abrirBanco, filtravel, lerSql, listarConsultas, rodar } from '../apoio/banco.ts'

describe('parâmetros do console', () => {
  it('conta o maior $n, ignorando comentário e texto entre aspas', () => {
    expect(parametrosUsados('select 1')).toBe(0)
    expect(parametrosUsados('select $1::date, $3::smallint')).toBe(3)
    expect(parametrosUsados("-- usa $9\nselect '$5' as x, $2")).toBe(2)
  })

  it('o filtro do cartão vira os valores dos campos, e os campos voltam a ser os parâmetros do cartão', () => {
    expect(valoresDaRota(PADRAO)).toEqual(['2025-10-01', '2026-09-30', ''])
    expect(valoresDaRota({ ...PADRAO, emp: 2 })).toEqual(['2025-10-01', '2026-09-30', '2'])
    expect(paramsDosCampos(['2025-10-01', '2026-09-30', ''])).toEqual(['2025-10-01', '2026-09-30', null])
    expect(paramsDosCampos([' 2 ', 'texto'])).toEqual([2, 'texto'])
  })

  it('"abrir no console" de qualquer cartão filtrável dá o mesmo resultado do cartão, com e sem empreendimento', async () => {
    const db = await abrirBanco()
    const filtraveis = listarConsultas().filter((id) => filtravel(lerSql(id)))
    expect(filtraveis.length).toBeGreaterThanOrEqual(20)
    for (const rota of [PADRAO, { ...PADRAO, emp: 2 }]) {
      for (const id of filtraveis) {
        const sql = lerSql(id)
        const doCartao = await rodar(db, id, [`${rota.de}-01`, '2026-09-30', rota.emp])
        const doConsole = (await db.query(sql, paramsDosCampos(valoresDaRota(rota)).slice(0, parametrosUsados(sql)))).rows
        expect(doConsole, id).toEqual(doCartao)
      }
    }
    await db.close()
  })
})

describe('exemplos e células', () => {
  it('os exemplos são os arquivos de console/, com a pergunta do cabeçalho', () => {
    const catalogo = {
      'console/02_b': '-- Pergunta: Segunda?\nselect 2',
      'console/01_a': '-- Pergunta: Primeira?\nselect 1',
      'visao-geral/kpi_vgv': '-- Pergunta: Outra\nselect 3',
    }
    expect(exemplosDoConsole(catalogo)).toEqual([{ id: 'console/01_a', titulo: 'Primeira?' }, { id: 'console/02_b', titulo: 'Segunda?' }])
  })

  it('nulo, data, jsonb e número', () => {
    expect(textoDaCelula(null)).toBe('null')
    expect(textoDaCelula(new Date('2026-09-30T00:00:00Z'))).toBe('2026-09-30')
    expect(textoDaCelula(new Date('2026-09-30T14:20:00Z'))).toBe('2026-09-30 14:20:00')
    expect(textoDaCelula({ id: 3 })).toBe('{"id":3}')
    expect(textoDaCelula(12.5)).toBe('12.5')
  })
})
