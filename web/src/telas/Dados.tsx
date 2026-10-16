import { Cartao } from '../componentes/Cartao.tsx'
import { inteiro } from '../formatar.ts'
import { paramsDaRota } from '../navegacao/rotas.ts'
import { usarEntradaDoPdf } from '../pdf/registro.tsx'
import { ACOES, REGRAS } from '../regras.ts'
import { type LinhaQualidade, respostaQualidade } from './respostas.ts'
import css from './Telas.module.css'
import type { PropsDaTela } from './tipos.ts'

// A tela Dados mostra o que a limpeza fez e o que é real ou simulado. O modelo do banco (DER, dicionário
// e DDL) saiu do painel em 2026-10-15 e fica no repositório: sql/01_schema.sql e o README.
export function Dados({ rota }: PropsDaTela) {
  const params = paramsDaRota(rota)

  return (
    <div className={css.tela}>
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
const REAL_E_SIMULADO = [
  {
    titulo: 'Real, do site da ADR',
    itens: [
      'Os 7 empreendimentos: nomes, bairros, status e previsão de entrega.',
      'As 102 unidades do Mares Bessa e as faixas de área de cada empreendimento.',
      'As tipologias (studio, duplex, garden), o slogan "Ousadia que constrói valor" e a venda por corretores.',
      'O logo e as fotos dos empreendimentos.',
    ],
  },
  {
    titulo: 'Simulado, com semente fixa',
    itens: [
      'As unidades dos outros 3 lançados (390 no total), os lançamentos e os preços.',
      '≈ 15 mil leads, ≈ 280 vendas, ≈ 35 corretores em 8 imobiliárias, o plano de pagamento, as parcelas e os pagamentos.',
      'A sujeira dos arquivos brutos (R1 a R7), para o pipeline ter o que tratar.',
    ],
  },
  {
    titulo: 'Padrões plantados, de propósito',
    itens: [
      'O canal que mais traz leads não é o que mais converte.',
      'Poucos corretores concentram as vendas.',
      'A vista mar cobra mais pelo m² e vende mais rápido.',
      'A inadimplência se concentra num empreendimento e nas vendas com desconto alto.',
      'O distrato vem depois de um atraso acima de 60 dias.',
    ],
  },
]

function Bloco({ bloco }: { bloco: (typeof REAL_E_SIMULADO)[number] }) {
  return (
    <>
      <h3>{bloco.titulo}</h3>
      <ul>{bloco.itens.map((item) => <li key={item}>{item}</li>)}</ul>
    </>
  )
}

function RealSimulado() {
  const titulo = 'O que é real e o que é simulado'
  // o "Baixar PDF da tela" leva este texto também
  usarEntradaDoPdf({ tipo: 'texto', ancora: 'real-simulado', titulo, blocos: REAL_E_SIMULADO, pronto: true })
  const [real, ...simulado] = REAL_E_SIMULADO
  return (
    <section className={css.realSimulado} aria-labelledby="real-simulado">
      <h2 id="real-simulado" className={css.tituloSecao}>{titulo}</h2>
      <div className={css.duasColunas}>
        <div><Bloco bloco={real} /></div>
        <div>{simulado.map((b) => <Bloco key={b.titulo} bloco={b} />)}</div>
      </div>
    </section>
  )
}
