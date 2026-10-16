// A Lexend Deca do painel, para o PDF. O jsPDF só aceita TrueType (.ttf), e o @fontsource traz a fonte
// em WOFF; o WOFF 1.0 é o mesmo TrueType com cada tabela comprimida em zlib, então basta descomprimir as
// tabelas e montar o arquivo de novo (especificação: https://www.w3.org/TR/WOFF/).

async function inflar(bytes: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([bytes.slice()]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}

/** WOFF 1.0 → TrueType. Lança erro se o arquivo não for WOFF. */
export async function woffParaTtf(woff: ArrayBuffer): Promise<Uint8Array> {
  const entrada = new DataView(woff)
  if (entrada.getUint32(0) !== 0x774f4646) throw new Error('a fonte não está em WOFF 1.0')
  const sabor = entrada.getUint32(4)
  const n = entrada.getUint16(12)

  const tabelas = []
  for (let i = 0; i < n; i++) {
    const p = 44 + i * 20
    const offset = entrada.getUint32(p + 4)
    const comprimido = entrada.getUint32(p + 8)
    const original = entrada.getUint32(p + 12)
    const bruto = new Uint8Array(woff, offset, comprimido)
    tabelas.push({
      tag: entrada.getUint32(p),
      soma: entrada.getUint32(p + 16),
      dados: comprimido < original ? await inflar(bruto) : bruto,
    })
  }

  const alinhar = (x: number) => (x + 3) & ~3
  let tamanho = 12 + n * 16
  for (const t of tabelas) tamanho += alinhar(t.dados.length)
  const saida = new Uint8Array(tamanho)
  const ttf = new DataView(saida.buffer)

  const potencia = 2 ** Math.floor(Math.log2(n))
  ttf.setUint32(0, sabor)
  ttf.setUint16(4, n)
  ttf.setUint16(6, potencia * 16)
  ttf.setUint16(8, Math.log2(potencia))
  ttf.setUint16(10, n * 16 - potencia * 16)

  let offset = 12 + n * 16
  tabelas.forEach((t, i) => {
    const p = 12 + i * 16
    ttf.setUint32(p, t.tag)
    ttf.setUint32(p + 4, t.soma)
    ttf.setUint32(p + 8, offset)
    ttf.setUint32(p + 12, t.dados.length)
    saida.set(t.dados, offset)
    offset += alinhar(t.dados.length)
  })
  return saida
}

/** Os bytes como "binary string", o formato que o addFileToVFS do jsPDF espera. */
export function paraTextoBinario(bytes: Uint8Array): string {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return texto
}
