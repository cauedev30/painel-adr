import type { Param } from '../banco/cliente.ts'
import { usarConsulta } from '../banco/usarConsulta.ts'
import { CONSULTAS_DAS_CONCLUSOES, type DadosDasConclusoes, gerarConclusoes } from '../conclusoes.ts'
import { type Rota, TELAS, linkDoCartao } from '../navegacao/rotas.ts'
import css from './Conclusoes.module.css'

/**
 * "O que os dados dizem" (D6.1): as conclusões que as consultas sustentam no filtro atual, numeradas,
 * cada uma com o link para o cartão que a prova.
 */
export function Conclusoes({ rota, params }: { rota: Rota; params: Param[] }) {
  const estados = {
    canais: usarConsulta(CONSULTAS_DAS_CONCLUSOES.canais, params),
    ranking: usarConsulta(CONSULTAS_DAS_CONCLUSOES.ranking, params),
    vistaMar: usarConsulta(CONSULTAS_DAS_CONCLUSOES.vistaMar, params),
    inadimplenciaPorEmpreendimento: usarConsulta(CONSULTAS_DAS_CONCLUSOES.inadimplenciaPorEmpreendimento, params),
    inadimplenciaPorDesconto: usarConsulta(CONSULTAS_DAS_CONCLUSOES.inadimplenciaPorDesconto, params),
    distratos: usarConsulta(CONSULTAS_DAS_CONCLUSOES.distratos, params),
  }
  const lista = Object.values(estados)
  const erro = lista.find((e) => e.erro)?.erro
  const prontos = lista.every((e) => e.linhas !== null)
  const carregando = lista.some((e) => e.carregando)
  const conclusoes = prontos
    ? gerarConclusoes(Object.fromEntries(Object.entries(estados).map(([k, e]) => [k, e.linhas])) as DadosDasConclusoes)
    : null

  return (
    <section id="conclusoes" className={css.conclusoes} aria-labelledby="conclusoes-titulo" aria-busy={carregando}>
      <h2 id="conclusoes-titulo" className={css.titulo}>O que os dados dizem</h2>
      {erro ? (
        <p className={css.vazio} role="alert">{erro}</p>
      ) : conclusoes === null ? (
        <p className={css.vazio}>Consultando o banco…</p>
      ) : conclusoes.length === 0 ? (
        <p className={css.vazio}>Com este filtro, os dados não têm volume para sustentar uma conclusão.</p>
      ) : (
        <ol className={css.lista} data-carregando={carregando}>
          {conclusoes.map((c) => (
            <li key={c.id}>
              <p>{c.texto}</p>
              <a href={linkDoCartao(rota, c.tela, c.cartao)}>
                ver em {TELAS.find((t) => t.id === c.tela)!.nome}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
