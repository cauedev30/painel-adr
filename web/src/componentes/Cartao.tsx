import type { EChartsOption } from 'echarts'
import { type ReactNode, useMemo, useState } from 'react'
import type { Param } from '../banco/cliente.ts'
import { filtravel } from '../banco/consultas.ts'
import { usarConsulta } from '../banco/usarConsulta.ts'
import { inteiro } from '../formatar.ts'
import css from './Cartao.module.css'
import { Grafico } from './Grafico.tsx'
import { Icone } from './Icone.tsx'
import { PainelSql } from './PainelSql.tsx'
import { type Coluna, TabelaDados } from './TabelaDados.tsx'

type Props<T> = {
  /** A âncora do cartão: as conclusões da visão geral linkam para #<id>. */
  id: string
  /** A pergunta que o cartão responde. */
  titulo: string
  /** O id da consulta no catálogo: tela/cartao. */
  consulta: string
  params: Param[]
  /** A frase-resposta, calculada das linhas. */
  resposta: (linhas: T[]) => string
  /** O gráfico do cartão; o cartão que não é um gráfico só (fotos, vários gráficos pequenos) usa `conteudo`. */
  grafico?: (linhas: T[]) => EChartsOption
  conteudo?: (linhas: T[]) => ReactNode
  /** Como o botão chama o `conteudo` na volta da tabela: "ver como cartões", "ver como ranking". */
  nomeDoConteudo?: string
  colunas: Coluna<T>[]
  formatoDoValor?: (valor: number) => string
  altura?: number
}

/**
 * O cartão do painel (seção 6.2): pergunta, frase-resposta e gráfico, com "Ver SQL" e "ver como
 * tabela". Enquanto os filtros mudam, o gráfico anterior fica na tela, apagado, até o novo chegar.
 */
export function Cartao<T>({ id, titulo, consulta, params, resposta, grafico, conteudo, nomeDoConteudo = 'cartões', colunas, formatoDoValor = inteiro, altura }: Props<T>) {
  const { linhas, erro, carregando, ms } = usarConsulta<T>(consulta, params)
  const [comoTabela, setComoTabela] = useState(false)
  const [sqlAberto, setSqlAberto] = useState(false)
  const opcao = useMemo(() => (grafico && linhas && linhas.length > 0 ? grafico(linhas) : null), [linhas])  // grafico é recriado a cada render

  let frase: string
  if (erro) frase = 'A consulta falhou.'
  else if (!linhas) frase = 'Consultando o banco…'
  else if (linhas.length === 0) frase = 'Sem dados para este filtro.'
  else frase = resposta(linhas)

  return (
    <section id={id} className={css.cartao} tabIndex={-1} aria-labelledby={`${id}-titulo`} aria-busy={carregando}>
      <header className={css.cabecalho}>
        <h2 id={`${id}-titulo`} className={css.titulo}>{titulo}</h2>
        <p className={css.resposta} aria-live="polite">{frase}</p>
      </header>

      <div className={css.corpo} data-carregando={carregando} style={{ minHeight: altura ?? 280 }}>
        {erro ? (
          <p className={css.erro} role="alert">{erro}</p>
        ) : linhas && linhas.length > 0 ? (
          comoTabela ? (
            <TabelaDados linhas={linhas} colunas={colunas} legenda={titulo} />
          ) : conteudo ? (
            conteudo(linhas)
          ) : (
            opcao && <Grafico opcao={opcao} rotulo={`${titulo} ${frase}`} formatoDoValor={formatoDoValor} altura={altura} />
          )
        ) : null}
      </div>

      <footer className={css.acoes}>
        <button type="button" aria-haspopup="dialog" onClick={() => setSqlAberto(true)}>
          <Icone nome="codigo" tamanho={16} />
          Ver SQL
        </button>
        <button type="button" aria-pressed={comoTabela} onClick={() => setComoTabela((t) => !t)}>
          <Icone nome={comoTabela ? 'grafico' : 'tabela'} tamanho={16} />
          {comoTabela ? (conteudo ? `ver como ${nomeDoConteudo}` : 'ver como gráfico') : 'ver como tabela'}
        </button>
        {ms !== null && <span className={css.tempo}>consulta em {inteiro(Math.max(1, Math.round(ms)))} ms</span>}
      </footer>

      <PainelSql id={consulta} params={filtravel(consulta) ? params : null} aberto={sqlAberto} aoFechar={() => setSqlAberto(false)} />
    </section>
  )
}
