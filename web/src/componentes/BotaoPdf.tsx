import { useState } from 'react'
import { type EntradaPdf, nomeDoArquivo, textoDaGeracao, textoDosFiltros } from '../pdf/conteudo.ts'
import { usarEntradasDaTela, usarRelatorio } from '../pdf/registro.tsx'
import css from './BotaoPdf.module.css'
import { Icone } from './Icone.tsx'

type Estado = 'parado' | 'gerando' | 'falhou'

/** Gera e baixa o PDF; o jsPDF e o desenho do PDF só são baixados no primeiro clique (import dinâmico). */
function usarGerador(nome: string) {
  const { rota, nomeDaTela, comFiltros } = usarRelatorio()
  const [estado, setEstado] = useState<Estado>('parado')

  async function gerar(entradas: () => EntradaPdf[] | Promise<EntradaPdf[]>) {
    if (estado === 'gerando') return
    setEstado('gerando')
    try {
      const [lista, { gerarPdf }] = await Promise.all([entradas(), import('../pdf/gerar.ts')])
      await gerarPdf({
        nomeDaTela,
        filtros: textoDosFiltros(rota, comFiltros),
        geracao: textoDaGeracao(new Date()),
        entradas: lista,
        arquivo: nomeDoArquivo(nome || nomeDaTela, rota, comFiltros),
      })
      setEstado('parado')
    } catch (erro) {
      console.error('o PDF falhou', erro)
      setEstado('falhou')
    }
  }
  return { estado, gerar }
}

function texto(estado: Estado, normal: string): string {
  return estado === 'gerando' ? 'gerando PDF…' : estado === 'falhou' ? 'o PDF falhou; tentar de novo' : normal
}

/** "baixar PDF" no rodapé do cartão: o PDF só deste cartão (título, frase, gráfico e tabela). */
export function BotaoPdfDoCartao({ titulo, entrada }: { titulo: string; entrada: EntradaPdf }) {
  const { estado, gerar } = usarGerador(titulo)
  return (
    <button type="button" disabled={!entrada.pronto || estado === 'gerando'} aria-busy={estado === 'gerando'}
      aria-label={`Baixar PDF do cartão: ${titulo}`} onClick={() => gerar(() => [entrada])}>
      <Icone nome="baixar" tamanho={16} />
      {texto(estado, 'baixar PDF')}
    </button>
  )
}

const ESPERA_MAXIMA = 15_000

/** Espera os cartões que ainda estão consultando (o filtro acabou de mudar), até 15 s. */
async function quandoProntas(obter: () => EntradaPdf[]): Promise<EntradaPdf[]> {
  const inicio = Date.now()
  let lista = obter()
  while (lista.some((e) => !e.pronto) && Date.now() - inicio < ESPERA_MAXIMA) {
    await new Promise((r) => setTimeout(r, 150))
    lista = obter()
  }
  return lista
}

/** "Baixar PDF da tela", no cabeçalho: os KPIs e todos os cartões da tela, na ordem da página. */
export function BotaoPdfDaTela() {
  const { nomeDaTela } = usarRelatorio()
  const obter = usarEntradasDaTela()
  const { estado, gerar } = usarGerador(nomeDaTela)
  return (
    <button type="button" className={css.botao} disabled={estado === 'gerando'} aria-busy={estado === 'gerando'}
      aria-label={`Baixar PDF da tela ${nomeDaTela}`} title="Baixar um PDF com tudo desta tela" onClick={() => gerar(() => quandoProntas(obter))}>
      <span className={css.icone}><Icone nome="baixar" tamanho={18} /></span>
      <span className={css.longo}>{texto(estado, 'Baixar PDF da tela')}</span>
      <span className={css.curto} aria-hidden="true">{estado === 'gerando' ? '…' : 'PDF'}</span>
    </button>
  )
}
