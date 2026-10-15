// O PostgreSQL do painel, num Web Worker (D5.1): a tela não trava enquanto o banco abre ou consulta.
// O próprio worker baixa o banco.tar.gz, para o arquivo não passar de uma thread para a outra.
import { PGlite } from '@electric-sql/pglite'
import { worker } from '@electric-sql/pglite/worker'

/** Mensagem que o cliente escuta para não esperar para sempre um banco que não vai abrir. */
export type ErroDoBanco = { type: 'erro-do-banco'; mensagem: string }

async function abrir(): Promise<PGlite> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}banco.tar.gz`)
  if (!resposta.ok) throw new Error(`não consegui baixar o banco.tar.gz (HTTP ${resposta.status})`)
  // sem o tipo do arquivo: o PGlite descobre se ainda está em gzip ou se o servidor já descompactou
  const banco = new Blob([await resposta.arrayBuffer()])
  return PGlite.create({ loadDataDir: banco })
}

worker({
  async init() {
    try {
      return await abrir()
    } catch (erro) {
      const mensagem: ErroDoBanco = { type: 'erro-do-banco', mensagem: erro instanceof Error ? erro.message : String(erro) }
      postMessage(mensagem)
      throw erro
    }
  },
})
