// As cores do painel, num lugar só. O tokens.css repete estes valores como variáveis CSS, e um teste
// (web/testes/painel/paleta.test.ts) confere que os dois não se separam.
//
// De onde vêm (D5.5): o site da ADR é preto, carvão (#333333) e cinzas (post-8.css e post-2379.css).
// O cobre é o do arco do evento "Ousadia que constrói valor" (#834302 na foto), clareado no mesmo
// matiz para ler sobre o fundo escuro. Validado com a skill dataviz contra a superfície #171717:
// cobre × cinza passam em faixa de luminosidade, daltonismo (ΔE 15,1) e visão normal (ΔE 20,0); a
// rampa de atraso passa como rampa ordinal de um tom só.
export const PALETA = {
  fundo: '#0a0a0a',
  superficie: '#171717',
  superficie2: '#222222',
  borda: '#333333',
  texto: '#f2f2f2',
  texto2: '#a6a6a6',
  // gráficos: um destaque em cobre, o resto em cinza (seção 6.3)
  cinza: '#666666',
  cobre: '#cc8040',
  cobreForte: '#e09a58',
  // dourado só em seleção e foco
  dourado: '#e6b85c',
  // a seta dos KPIs: melhorou ou piorou contra o período anterior. É estado, não série: só pinta a
  // seta, que já diz a direção pela forma (▲/▼) e vem com o texto ao lado; para quem não distingue
  // verde de vermelho, o leitor de tela e o balão dizem "melhorou" ou "piorou" (seção 6.3)
  bom: '#3fb950',
  ruim: '#f0605a',
  // faixas de atraso: um tom de vermelho, do mais claro (1–30 dias) ao mais intenso (mais de 90)
  atraso1: '#f4b2a6',
  atraso2: '#ec7f6d',
  atraso3: '#e0503d',
  atraso4: '#c42a1e',
} as const

export type Cor = keyof typeof PALETA

export const RAMPA_ATRASO = [PALETA.atraso1, PALETA.atraso2, PALETA.atraso3, PALETA.atraso4]

/** O nome da variável CSS de uma cor: `superficie2` → `--superficie-2`, `cobreForte` → `--cobre-forte`. */
export function variavelCss(nome: string): string {
  return '--' + nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`).replace(/(\d+)/g, '-$1')
}
