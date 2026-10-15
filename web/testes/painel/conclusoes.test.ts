import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { NOMES_DOS_CANAIS } from '../../src/canais.ts'
import { type DadosDasConclusoes, MIN_LEADS_CANAL, gerarConclusoes } from '../../src/conclusoes.ts'
import { PARAMS_PADRAO, type Param, abrirBanco, rodar } from '../apoio/banco.ts'

let db: PGlite

beforeAll(async () => {
  db = await abrirBanco()
})

afterAll(async () => {
  await db?.close()
})

/** As 6 consultas de que as conclusões dependem, como o painel roda. */
async function dados(params: Param[] = PARAMS_PADRAO): Promise<DadosDasConclusoes> {
  return {
    canais: await rodar(db, 'funil-corretores/canais', params),
    ranking: await rodar(db, 'funil-corretores/ranking_corretores', params),
    vistaMar: await rodar(db, 'vendas-estoque/vista_mar', params),
    inadimplenciaPorEmpreendimento: await rodar(db, 'recebiveis/inadimplencia_por_empreendimento', params),
    inadimplenciaPorDesconto: await rodar(db, 'recebiveis/inadimplencia_por_desconto', params),
    distratos: await rodar(db, 'recebiveis/distratos_e_atraso', params),
  }
}

describe('O que os dados dizem, no filtro padrão', () => {
  it('são 5 conclusões, uma por padrão plantado, cada uma com o cartão que a prova', async () => {
    const conclusoes = gerarConclusoes(await dados())
    expect(conclusoes.map((c) => c.id)).toEqual(['canais', 'corretores', 'vista-mar', 'inadimplencia', 'distratos'])
    expect(conclusoes.map((c) => `${c.tela}#${c.cartao}`)).toEqual([
      'funil-corretores#canais',
      'funil-corretores#ranking',
      'vendas-estoque#vista-mar',
      'recebiveis#inadimplencia-empreendimento',
      'recebiveis#distratos',
    ])
    for (const c of conclusoes) expect(c.texto).not.toMatch(/undefined|null|NaN/)
  })

  it('1. o canal de mais leads não é o de maior conversão, e os dois citados são os certos', async () => {
    const d = await dados()
    const [c] = gerarConclusoes(d)
    const maiorVolume = d.canais[0]
    const comVolume = d.canais.filter((l) => l.leads >= MIN_LEADS_CANAL)
    const maiorConversao = comVolume.reduce((a, b) => (b.conversao > a.conversao ? b : a))
    expect(maiorConversao.canal).not.toBe(maiorVolume.canal)
    expect(maiorConversao.conversao).toBeGreaterThan(maiorVolume.conversao)
    expect(c.texto.startsWith(`O ${NOMES_DOS_CANAIS[maiorVolume.canal].nome}`)).toBe(true)
    expect(c.texto).toContain(NOMES_DOS_CANAIS[maiorConversao.canal].nome)
  })

  it('2. os 5 corretores citados são os 5 primeiros do ranking, e a conta das vendas fecha', async () => {
    const d = await dados()
    const c = gerarConclusoes(d).find((x) => x.id === 'corretores')!
    const top5 = d.ranking.slice(0, 5)
    for (const r of top5) expect(c.texto).toContain(r.nome)
    for (const r of d.ranking.slice(5)) expect(c.texto).not.toContain(r.nome)
    const doTop = top5.reduce((s, r) => s + r.vendas, 0)
    const total = d.ranking.reduce((s, r) => s + r.vendas, 0)
    expect(c.texto).toContain(`${doTop} das ${total} vendas`)
    // é concentração de verdade: os 5 fizeram mais que a parte "justa" deles
    expect(doTop / total).toBeGreaterThan(5 / d.ranking.length)
  })

  it('3. com vista mar o m² é mais caro e vende mais nos 6 primeiros meses', async () => {
    const d = await dados()
    const c = gerarConclusoes(d).find((x) => x.id === 'vista-mar')!
    const [com, sem] = [d.vistaMar.find((l) => l.vista_mar)!, d.vistaMar.find((l) => !l.vista_mar)!]
    expect(com.preco_m2_medio!).toBeGreaterThan(sem.preco_m2_medio!)
    expect(com.pct_vendidas_6_meses!).toBeGreaterThan(sem.pct_vendidas_6_meses!)
    expect(c.texto).toContain('mais caro')
  })

  it('4. o empreendimento citado tem a maior inadimplência, e o desconto alto é a faixa pior', async () => {
    const d = await dados()
    const c = gerarConclusoes(d).find((x) => x.id === 'inadimplencia')!
    const pior = d.inadimplenciaPorEmpreendimento.reduce((a, b) => (b.inadimplencia > a.inadimplencia ? b : a))
    expect(c.texto).toContain(pior.nome)
    for (const outro of d.inadimplenciaPorEmpreendimento.filter((l) => l.nome !== pior.nome)) expect(c.texto).not.toContain(outro.nome)
    const [ate3, , alto] = d.inadimplenciaPorDesconto
    expect(alto.inadimplencia!).toBeGreaterThan(ate3.inadimplencia!)
    expect(c.texto).toContain('8% ou mais')
  })

  it('5. a parte dos distratos com atraso acima de 60 dias é a da consulta', async () => {
    const d = await dados()
    const c = gerarConclusoes(d).find((x) => x.id === 'distratos')!
    const [l] = d.distratos
    expect(l.pct!).toBeGreaterThanOrEqual(0.5)
    expect(c.texto).toContain(String(l.distratos))
    expect(c.texto).toContain('60 dias')
  })
})

describe('O que os dados dizem, com filtro', () => {
  it('no Mares Sense (pré-lançamento, sem venda) nenhuma conclusão aparece, em vez de texto quebrado', async () => {
    expect(gerarConclusoes(await dados([PARAMS_PADRAO[0], PARAMS_PADRAO[1], 5]))).toEqual([])
  })

  it('num empreendimento só, a concentração entre empreendimentos some, e o resto continua verdadeiro', async () => {
    const conclusoes = gerarConclusoes(await dados([PARAMS_PADRAO[0], PARAMS_PADRAO[1], 2]))
    for (const c of conclusoes) expect(c.texto).not.toMatch(/undefined|null|NaN/)
    const inad = conclusoes.find((c) => c.id === 'inadimplencia')
    if (inad) {
      expect(inad.texto).not.toContain('se concentra no')
      expect(inad.cartao).toBe('inadimplencia-desconto')
    }
  })
})

describe('regras das conclusões, com linhas feitas à mão', () => {
  const vazio: DadosDasConclusoes = { canais: [], ranking: [], vistaMar: [], inadimplenciaPorEmpreendimento: [], inadimplenciaPorDesconto: [], distratos: [] }

  it('canal pequeno (abaixo do mínimo de leads) não vira o "de maior conversão"', () => {
    const canais = [
      { canal: 'instagram', leads: 500, vendas: 1, conversao: 0.002 },
      { canal: 'indicacao', leads: 5, vendas: 2, conversao: 0.4 },
    ]
    expect(gerarConclusoes({ ...vazio, canais })).toEqual([])
  })

  it('o texto do canal sai com os números formatados', () => {
    const canais = [
      { canal: 'instagram', leads: 800, vendas: 4, conversao: 0.005 },
      { canal: 'indicacao', leads: 200, vendas: 10, conversao: 0.05 },
    ]
    expect(gerarConclusoes({ ...vazio, canais })[0].texto)
      .toBe('O Instagram traz 80% dos leads, mas converte 0,5%; a indicação traz 20% e converte 5,0%.')
  })

  it('distrato: singular, todos e a maioria', () => {
    const um = gerarConclusoes({ ...vazio, distratos: [{ distratos: 1, com_atraso_60: 1, pct: 1 }] })[0].texto
    expect(um).toBe('O único distrato do período veio depois de uma parcela com mais de 60 dias de atraso.')
    const todos = gerarConclusoes({ ...vazio, distratos: [{ distratos: 4, com_atraso_60: 4, pct: 1 }] })[0].texto
    expect(todos).toBe('Os 4 distratos do período vieram depois de uma parcela com mais de 60 dias de atraso.')
    const maioria = gerarConclusoes({ ...vazio, distratos: [{ distratos: 4, com_atraso_60: 3, pct: 0.75 }] })[0].texto
    expect(maioria).toBe('3 dos 4 distratos do período (75%) vieram depois de uma parcela com mais de 60 dias de atraso.')
    expect(gerarConclusoes({ ...vazio, distratos: [{ distratos: 4, com_atraso_60: 1, pct: 0.25 }] })).toEqual([])
  })
})
