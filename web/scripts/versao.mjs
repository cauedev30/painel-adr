// Grava <pasta>/versao.json com o commit do build e a data de corte dos dados (D8.1).
// Uso: node scripts/versao.mjs [pasta]   (padrão: dist, depois do vite build)
// Com ele, `curl …/versao.json` diz que versão o site está servindo.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = fileURLToPath(new URL('..', import.meta.url))

/** O commit do build: o do GitHub Actions ou, na máquina, o HEAD do git. */
export function commitAtual() {
  return process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: WEB, encoding: 'utf-8' }).trim()
}

// a data de corte mora em src/navegacao/rotas.ts; lida como texto, porque o rotas.ts importa módulos do Vite
function dataDeCorte() {
  const rotas = readFileSync(resolve(WEB, 'src/navegacao/rotas.ts'), 'utf-8')
  return rotas.match(/export const DATA_DE_CORTE = '(\d{4}-\d{2}-\d{2})'/)[1]
}

const pasta = resolve(WEB, process.argv[2] ?? 'dist')
const versao = { commit: commitAtual(), data_corte: dataDeCorte() }
writeFileSync(resolve(pasta, 'versao.json'), JSON.stringify(versao, null, 2) + '\n')
console.log(`versao.json: ${versao.commit.slice(0, 7)}, dados até ${versao.data_corte}`)
