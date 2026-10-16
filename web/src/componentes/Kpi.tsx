import type { Param } from '../banco/cliente.ts'
import { usarConsulta } from '../banco/usarConsulta.ts'
import { type DefinicaoKpi, type LinhaKpi, lerKpi } from '../telas/respostas.ts'
import css from './Kpi.module.css'

type Props = {
  kpi: DefinicaoKpi
  params: Param[]
  /** Contra o quê compara, já escrito: "out/2024–set/2025", "ago/2026", "fim de set/2025". */
  periodoAnterior: string
}

const PALAVRA_DO_TOM = { bom: 'melhorou', ruim: 'piorou', neutro: 'sem mudança' } as const

/**
 * Um KPI grande da visão geral: o valor e a variação contra o período anterior de mesma duração (D4.1).
 * A seta tem forma e cor; o texto ao lado diz o número, e "melhorou" ou "piorou" vai para o leitor de tela.
 */
export function Kpi({ kpi, params, periodoAnterior }: Props) {
  const { linhas, erro, carregando } = usarConsulta<LinhaKpi>(kpi.consulta, params)
  const leitura = linhas?.[0] ? lerKpi(kpi, linhas[0]) : null

  return (
    <article className={css.kpi} aria-labelledby={`kpi-${kpi.id}`} aria-busy={carregando}>
      <h3 id={`kpi-${kpi.id}`} className={css.titulo}>{kpi.titulo}</h3>
      {erro ? (
        <p className={css.erro} role="alert">A consulta falhou.</p>
      ) : (
        <>
          <p className={`${css.valor} numero`} data-carregando={carregando}>{leitura?.valor ?? '…'}</p>
          <p className={css.variacao}>
            {leitura && (
              <>
                <span className={css.seta} data-tom={leitura.tom} aria-hidden="true" title={PALAVRA_DO_TOM[leitura.tom]}>
                  {leitura.variacao.seta}
                </span>
                <span className="numero">{leitura.variacao.texto}</span>
                {leitura.tom !== 'neutro' && <span className="so-leitor">({PALAVRA_DO_TOM[leitura.tom]})</span>}
                <span className={css.contra}>vs. {periodoAnterior}</span>
              </>
            )}
          </p>
        </>
      )}
    </article>
  )
}
