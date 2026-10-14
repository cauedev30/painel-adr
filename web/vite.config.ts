import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // O site é publicado em cauedev30.github.io/painel-adr/
  base: '/painel-adr/',
  plugins: [react()],
  test: {
    include: ['testes/**/*.test.ts'],
    // O PGlite leva alguns segundos para iniciar o Postgres em WASM
    testTimeout: 60_000,
  },
})
