import { describe, expect, it } from 'vitest'
import { realcarSql } from '../../src/componentes/realceSql.ts'
import { lerSql, listarConsultas } from '../apoio/banco.ts'

describe('realce do SQL no "Ver SQL"', () => {
  it('não perde nem muda nenhum caractere de nenhuma consulta', () => {
    for (const id of listarConsultas()) {
      const sql = lerSql(id)
      expect(realcarSql(sql).map((p) => p.texto).join('')).toBe(sql)
    }
  })

  it('separa comentário, palavra-chave, parâmetro e texto entre aspas', () => {
    const pedacos = realcarSql("-- Pergunta: quanto?\nselect $1::date, 'ativa' from adr.venda -- fim")
    expect(pedacos.filter((p) => p.tipo === 'comentario').map((p) => p.texto)).toEqual(['-- Pergunta: quanto?', '-- fim'])
    expect(pedacos.filter((p) => p.tipo === 'palavra').map((p) => p.texto)).toEqual(['select', 'date', 'from'])
    expect(pedacos.filter((p) => p.tipo === 'parametro').map((p) => p.texto)).toEqual(['$1'])
    expect(pedacos.filter((p) => p.tipo === 'aspas').map((p) => p.texto)).toEqual(["'ativa'"])
  })

  it('palavra-chave só como palavra inteira', () => {
    const pedacos = realcarSql('select vendas_selecionadas, data_venda from x')
    expect(pedacos.filter((p) => p.tipo === 'palavra').map((p) => p.texto)).toEqual(['select', 'from'])
  })
})
