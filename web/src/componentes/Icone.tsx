// Ícones de traço, desenhados à mão em SVG (sem biblioteca), na cor do texto em volta.
import type { Icone as NomeDoIcone } from '../navegacao/rotas.ts'

type Nome = NomeDoIcone | 'menu' | 'fechar' | 'copiar' | 'codigo' | 'tabela' | 'grafico' | 'externo' | 'seta'

const TRACOS: Record<Nome, string> = {
  painel: 'M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  predio: 'M5 21V5l7-2v18M12 8l7 2v11M3 21h18M8 9h1M8 13h1M8 17h1M15 13h1M15 17h1',
  funil: 'M3 4h18l-7 8v6l-4 2v-8z',
  moeda: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  banco: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  terminal: 'M3 5h18v14H3zM7 9l3 3-3 3M12 15h5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  fechar: 'M6 6l12 12M18 6L6 18',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  codigo: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
  tabela: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  grafico: 'M4 20V10M10 20V4M16 20v-7M2 20h20',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  seta: 'M7 10l5 5 5-5',
}

export function Icone({ nome, tamanho = 20 }: { nome: Nome; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRACOS[nome]} />
    </svg>
  )
}
