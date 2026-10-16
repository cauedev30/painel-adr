import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { paraTextoBinario, woffParaTtf } from '../../src/pdf/fonte.ts'

const woff = (peso: number) => {
  const caminho = fileURLToPath(new URL(`../../node_modules/@fontsource/lexend-deca/files/lexend-deca-latin-${peso}-normal.woff`, import.meta.url))
  const b = readFileSync(caminho)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe('woffParaTtf', () => {
  it('monta um TrueType com as mesmas tabelas do WOFF', async () => {
    const entrada = woff(400)
    const ttf = await woffParaTtf(entrada)
    const v = new DataView(ttf.buffer)
    expect(v.getUint32(0)).toBe(0x00010000)
    expect(v.getUint16(4)).toBe(new DataView(entrada).getUint16(12))
    expect(ttf.length).toBeGreaterThan(entrada.byteLength)
  })

  it('recusa o que não é WOFF 1.0', async () => {
    await expect(woffParaTtf(new Uint8Array(64).buffer)).rejects.toThrow('WOFF')
  })

  it('o jsPDF aceita a fonte e escreve os acentos e símbolos do painel', async () => {
    const doc = new jsPDF()
    for (const [peso, estilo] of [[400, 'normal'], [600, 'bold']] as const) {
      doc.addFileToVFS(`LexendDeca-${peso}.ttf`, paraTextoBinario(await woffParaTtf(woff(peso))))
      doc.addFont(`LexendDeca-${peso}.ttf`, 'LexendDeca', estilo)
    }
    doc.setFont('LexendDeca', 'bold')
    const texto = 'Recebíveis · ação – 1º · R$ 1,2 mi · “ok” …'
    doc.text(texto, 10, 10)
    expect(doc.getTextWidth(texto)).toBeGreaterThan(50)
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000)
  })
})
