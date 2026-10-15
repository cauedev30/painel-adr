import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// D8.1: o commit do build (o do GitHub Actions ou o HEAD local) aparece no selo do site
const COMMIT = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim()

export default defineConfig({
  // O site é publicado em cauedev30.github.io/painel-adr/
  base: '/painel-adr/',
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(COMMIT) },
  // as consultas são importadas de ../sql/consultas/ (D5.3), fora da pasta web/
  server: { fs: { allow: ['..'] } },
  // o PGlite roda num Web Worker em módulo ES (D5.1)
  worker: { format: 'es' },
  // o PGlite carrega o próprio .wasm e .data; o pré-empacotamento do Vite quebraria esses caminhos
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  test: {
    include: ['testes/**/*.test.ts'],
    // O PGlite leva alguns segundos para iniciar o Postgres em WASM
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
