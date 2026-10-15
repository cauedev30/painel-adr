// Monta o banco PostgreSQL no PGlite a partir dos CSVs limpos e salva web/public/banco.tar.gz (D3.6).
// Uso: node web/scripts/montar-banco.mjs (o pipeline.py chama este script no passo Carregar).
//
// 1. roda sql/01_schema.sql
// 2. carrega os CSVs de dados/limpos/ numa ordem fixa, pais antes de filhos
// 3. roda os outros sql/0*.sql em ordem alfabética (as views da etapa 4 entram aqui)
// 4. analyze e dumpDataDir('gzip')

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const DIR_SQL = resolve(RAIZ, 'sql')
const DIR_LIMPOS = resolve(RAIZ, 'dados/limpos')
const ARQ_BANCO = resolve(RAIZ, 'web/public/banco.tar.gz')

const ORDEM = [
  'adr.empreendimento', 'adr.unidade', 'adr.imobiliaria', 'adr.corretor', 'adr.lead', 'adr.cliente',
  'adr.venda', 'adr.parcela', 'adr.pagamento', 'adr.meta_mensal',
  'auditoria.relatorio_qualidade', 'auditoria.quarentena',
]

const db = await PGlite.create()
await db.exec(readFileSync(resolve(DIR_SQL, '01_schema.sql'), 'utf-8'))

const linhas = {}
for (const tabela of ORDEM) {
  const csv = readFileSync(resolve(DIR_LIMPOS, `${tabela.split('.')[1]}.csv`))
  await db.query(`copy ${tabela} from '/dev/blob' with (format csv, header true)`, [], { blob: new Blob([csv]) })
  const r = await db.query(`select count(*)::int as n from ${tabela}`)
  linhas[tabela] = r.rows[0].n
}

const outros = readdirSync(DIR_SQL).filter((a) => /^0\d.*\.sql$/.test(a) && a !== '01_schema.sql').sort()
for (const arquivo of outros) {
  await db.exec(readFileSync(resolve(DIR_SQL, arquivo), 'utf-8'))
}

await db.exec('analyze')
const banco = await db.dumpDataDir('gzip')
await db.close()

mkdirSync(dirname(ARQ_BANCO), { recursive: true })
writeFileSync(ARQ_BANCO, Buffer.from(await banco.arrayBuffer()))

for (const [tabela, n] of Object.entries(linhas)) {
  console.log(`  ${tabela.padEnd(32)}${n.toLocaleString('pt-BR').padStart(8)} linhas`)
}
if (outros.length) console.log(`  + ${outros.join(', ')}`)
const mb = (statSync(ARQ_BANCO).size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
console.log(`  banco salvo em web/public/banco.tar.gz (${mb} MB)`)
