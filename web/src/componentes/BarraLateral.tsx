import { useState } from 'react'
import logo from '../assets/logo-adr.png'
import { type Rota, TELAS, escreverHash } from '../navegacao/rotas.ts'
import css from './BarraLateral.module.css'
import { Icone } from './Icone.tsx'
import { Selo } from './Selo.tsx'

/**
 * Logo, as 6 telas e o selo. No celular (< 900 px) vira uma barra no topo, com o menu num botão (D5.9).
 * Os links mantêm os filtros: trocar de tela não perde o período escolhido.
 */
export function BarraLateral({ rota }: { rota: Rota }) {
  const [aberto, setAberto] = useState(false)

  return (
    <aside className={css.barra} data-aberto={aberto}>
      <div className={css.topo}>
        <a className={css.marca} href={escreverHash({ ...rota, tela: 'visao-geral', extra: {} })} aria-label="ADR Empreendimentos, visão geral">
          <img src={logo} alt="" width={120} height={50} />
          <span className={css.subtitulo}>Painel de dados</span>
        </a>
        <button type="button" className={css.botaoMenu} aria-expanded={aberto} aria-controls="menu-telas"
          onClick={() => setAberto((a) => !a)}>
          <Icone nome={aberto ? 'fechar' : 'menu'} />
          <span className="so-leitor">{aberto ? 'Fechar o menu' : 'Abrir o menu'}</span>
        </button>
      </div>

      <nav id="menu-telas" className={css.menu} aria-label="Telas do painel">
        <ul>
          {TELAS.map((t) => (
            <li key={t.id}>
              <a href={escreverHash({ ...rota, tela: t.id, extra: {} })} aria-current={t.id === rota.tela ? 'page' : undefined}
                onClick={() => setAberto(false)}>
                <Icone nome={t.icone} />
                {t.nome}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={css.rodape}>
        <Selo />
      </div>
    </aside>
  )
}
