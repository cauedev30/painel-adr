import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATA_DE_CORTE } from '../src/navegacao/rotas.ts'

describe('versao.json (D8.1)', () => {
  it('grava o commit do build e a data de corte', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'versao-'))
    execFileSync('node', ['scripts/versao.mjs', pasta], { encoding: 'utf-8' })
    const versao = JSON.parse(readFileSync(join(pasta, 'versao.json'), 'utf-8'))
    expect(versao.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(versao.data_corte).toBe(DATA_DE_CORTE)
  })

  it('no GitHub Actions, o commit é o GITHUB_SHA', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'versao-'))
    const sha = 'a'.repeat(40)
    execFileSync('node', ['scripts/versao.mjs', pasta], { encoding: 'utf-8', env: { ...process.env, GITHUB_SHA: sha } })
    expect(JSON.parse(readFileSync(join(pasta, 'versao.json'), 'utf-8')).commit).toBe(sha)
  })
})
