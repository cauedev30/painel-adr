import { useState } from 'react'
import ddl from '../../../sql/01_schema.sql?raw'
import { Cartao } from '../componentes/Cartao.tsx'
import { CodigoSql } from '../componentes/CodigoSql.tsx'
import { Diagrama } from '../componentes/Diagrama.tsx'
import { type LinhaDer, colunasDaTabela, gerarDer, nomeDaEntidade, tabelasDoDer } from '../der.ts'
import { inteiro } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { ACOES, REGRAS } from '../regras.ts'
import { type LinhaQualidade, respostaDer, respostaQualidade } from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

// O modelo conceitual (D6.4), escrito à mão a partir da seção 3.3 da spec: as entidades e o que as liga,
// sem tipo nem chave
const CONCEITUAL = `flowchart LR
  E[Empreendimento] -- tem --> U[Unidade]
  E -- tem --> M[Meta mensal]
  I[Imobiliária] -- reúne --> C[Corretor]
  L[Lead] -- se interessa por --> E
  C -- atende --> L
  L -- vira no máximo um --> CL[Cliente]
  U -- é vendida em --> V[Venda]
  CL -- compra em --> V
  C -- fecha --> V
  V -- gera --> P[Parcela]
  P -- recebe --> PG[Pagamento]`

const ABAS = [
  { id: 'conceitual', nome: 'Conceitual' },
  { id: 'logico', nome: 'Lógico' },
  { id: 'fisico', nome: 'Físico (DDL)' },
] as const

type Aba = (typeof ABAS)[number]['id']

export function Dados({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
      <Cartao<LinhaDer>
        id="der"
        titulo="Como o banco é organizado?"
        consulta="dados/der"
        params={params}
        resposta={respostaDer}
        altura={420}
        conteudo={(linhas) => <Modelos linhas={linhas} />}
        nomeDoConteudo="diagrama"
        colunas={[
          { chave: 'tabela', titulo: 'Tabela' },
          { chave: 'coluna', titulo: 'Coluna' },
          { chave: 'tipo', titulo: 'Tipo' },
          { chave: 'nulo', titulo: 'Aceita nulo', formato: (v: boolean) => (v ? 'sim' : 'não') },
          { chave: 'pk', titulo: 'Chave primária', formato: (v: boolean) => (v ? 'sim' : '') },
          { chave: 'fk_tabela', titulo: 'Referencia', formato: (v: string | null) => v ?? '' },
          { chave: 'comentario', titulo: 'Dicionário', formato: (v: string | null) => v ?? '' },
        ]}
      />

      <Cartao<LinhaQualidade>
        id="qualidade"
        titulo="Que problemas os dados tinham, e o que o pipeline fez?"
        consulta="dados/qualidade"
        params={params}
        resposta={respostaQualidade}
        altura={300}
        conteudo={(linhas) => <Qualidade linhas={linhas} />}
        colunas={[
          { chave: 'regra', titulo: 'Regra' },
          { chave: 'origem', titulo: 'Arquivo' },
          { chave: 'descricao', titulo: 'O que foi feito' },
          { chave: 'linhas_afetadas', titulo: 'Linhas', numerica: true, formato: inteiro },
          { chave: 'acao', titulo: 'Ação' },
        ]}
      />

      <RealSimulado />
    </div>
  )
}

/** As abas dos três níveis de modelagem; o lógico é o DER clicável, com a lista de tabelas ao lado. */
function Modelos({ linhas }: { linhas: LinhaDer[] }) {
  const [aba, setAba] = useState<Aba>('logico')
  const tabelas = tabelasDoDer(linhas)
  const [tabela, setTabela] = useState<string>(tabelas.find((t) => t === 'adr.venda') ?? tabelas[0])
  const der = gerarDer(linhas)

  function teclado(e: React.KeyboardEvent) {
    const i = ABAS.findIndex((a) => a.id === aba)
    const proxima = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (proxima === null) return
    const nova = ABAS[(proxima + ABAS.length) % ABAS.length].id
    setAba(nova)
    document.getElementById(`aba-${nova}`)?.focus()
  }

  return (
    <div className={css.modelos}>
      <div role="tablist" aria-label="Nível do modelo" className={css.abas} onKeyDown={teclado}>
        {ABAS.map((a) => (
          <button key={a.id} id={`aba-${a.id}`} type="button" role="tab" aria-selected={aba === a.id}
            aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1} onClick={() => setAba(a.id)}>
            {a.nome}
          </button>
        ))}
      </div>

      <div id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`} className={css.painelAba}>
        {aba === 'conceitual' && (
          <>
            <p className={css.notaAba}>O que existe no negócio e como se liga, sem tipo nem chave.</p>
            <Diagrama texto={CONCEITUAL} rotulo="Modelo conceitual: empreendimento tem unidades e metas; imobiliária reúne corretores; corretor atende leads; lead vira no máximo um cliente; a venda liga unidade, cliente e corretor; a venda gera parcelas, e a parcela recebe pagamentos." />
          </>
        )}
        {aba === 'logico' && (
          <div className={css.derComLista}>
            <div>
              <p className={css.notaAba}>Gerado do catálogo do banco (pg_catalog): clique numa tabela.</p>
              <Diagrama alto texto={der} rotulo={`Diagrama entidade-relacionamento com ${tabelas.length} tabelas.`}
                selecionada={nomeDaEntidade(tabela)}
                aoClicar={(entidade) => setTabela(tabelas.find((t) => nomeDaEntidade(t) === entidade) ?? tabela)} />
            </div>
            <Dicionario linhas={linhas} tabelas={tabelas} tabela={tabela} aoEscolher={setTabela} />
          </div>
        )}
        {aba === 'fisico' && (
          <>
            <p className={css.notaAba}>O <code>sql/01_schema.sql</code> que o pipeline roda para criar o banco, com o dicionário em <code>comment on</code>.</p>
            <CodigoSql sql={ddl} className={css.ddl} />
          </>
        )}
      </div>
    </div>
  )
}

/** A lista de tabelas (o caminho pelo teclado, D6.3) e as colunas da escolhida, com o dicionário. */
function Dicionario({ linhas, tabelas, tabela, aoEscolher }: { linhas: LinhaDer[]; tabelas: string[]; tabela: string; aoEscolher: (t: string) => void }) {
  const colunas = colunasDaTabela(linhas, tabela)
  return (
    <div className={css.dicionario}>
      <label className={css.escolhaTabela}>
        <span>Tabela</span>
        <select value={tabela} onChange={(e) => aoEscolher(e.target.value)}>
          {tabelas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <table className={css.colunas} aria-live="polite">
        <caption className="so-leitor">Colunas de {tabela}</caption>
        <thead>
          <tr><th scope="col">Coluna</th><th scope="col">Tipo</th><th scope="col">O que é</th></tr>
        </thead>
        <tbody>
          {colunas.map((c) => (
            <tr key={c.coluna}>
              <th scope="row">
                <code>{c.coluna}</code>
                {c.pk && <span className={css.chave}>PK</span>}
                {c.fk_tabela && <span className={css.chave} title={`referencia ${c.fk_tabela}.${c.fk_coluna}`}>FK</span>}
              </th>
              <td><code>{c.tipo}</code>{c.nulo ? '' : <span className={css.obrigatoria}> não nulo</span>}</td>
              <td>
                {c.comentario ?? '—'}
                {c.fk_tabela && <span className={css.referencia}> → {c.fk_tabela}.{c.fk_coluna}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** O relatório de qualidade em cartões "antes → depois", um por regra, com as quantidades do pipeline. */
function Qualidade({ linhas }: { linhas: LinhaQualidade[] }) {
  const regras = [...new Set(linhas.map((l) => l.regra))]
  return (
    <ul className={css.regras}>
      {regras.map((r) => {
        const texto = REGRAS[r]
        const doRelatorio = linhas.filter((l) => l.regra === r)
        return (
          <li key={r} className={css.regra}>
            <h3><span className={css.codigoRegra}>{r}</span> {texto?.titulo}</h3>
            {texto && (
              <p className={css.antesDepois}>
                <span className={css.antes}>{texto.antes}</span>
                <span aria-label="vira" className={css.seta}>→</span>
                <span>{texto.depois}</span>
              </p>
            )}
            <ul className={css.acoes}>
              {doRelatorio.map((l, i) => (
                <li key={i}>
                  <span className="numero">{inteiro(l.linhas_afetadas)}</span> {l.linhas_afetadas === 1 ? 'linha' : 'linhas'} {ACOES[l.acao] ?? l.acao}
                  <span className={css.descricaoRegra}>{l.descricao} · <code>{l.origem}</code></span>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

/** Seções 3.1 e 3.2 da spec: o que veio do site da ADR e o que foi simulado, com os padrões plantados. */
function RealSimulado() {
  return (
    <section className={css.realSimulado} aria-labelledby="real-simulado">
      <h2 id="real-simulado" className={css.tituloSecao}>O que é real e o que é simulado</h2>
      <div className={css.duasColunas}>
        <div>
          <h3>Real, do site da ADR</h3>
          <ul>
            <li>Os 7 empreendimentos: nomes, bairros, status e previsão de entrega.</li>
            <li>As 102 unidades do Mares Bessa e as faixas de área de cada empreendimento.</li>
            <li>As tipologias (studio, duplex, garden), o slogan "Ousadia que constrói valor" e a venda por corretores.</li>
            <li>O logo e as fotos dos empreendimentos.</li>
          </ul>
        </div>
        <div>
          <h3>Simulado, com semente fixa</h3>
          <ul>
            <li>As unidades dos outros 3 lançados (390 no total), os lançamentos e os preços.</li>
            <li>≈ 15 mil leads, ≈ 280 vendas, ≈ 35 corretores em 8 imobiliárias, o plano de pagamento, as parcelas e os pagamentos.</li>
            <li>A sujeira dos arquivos brutos (R1 a R7), para o pipeline ter o que tratar.</li>
          </ul>
          <h3>Padrões plantados, de propósito</h3>
          <ul>
            <li>O canal que mais traz leads não é o que mais converte.</li>
            <li>Poucos corretores concentram as vendas.</li>
            <li>A vista mar cobra mais pelo m² e vende mais rápido.</li>
            <li>A inadimplência se concentra num empreendimento e nas vendas com desconto alto.</li>
            <li>O distrato vem depois de um atraso acima de 60 dias.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
