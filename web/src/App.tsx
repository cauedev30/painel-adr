import type { ComponentType } from 'react'
import css from './App.module.css'
import { usarBanco } from './banco/usarConsulta.ts'
import { BarraLateral } from './componentes/BarraLateral.tsx'
import { Carregando } from './componentes/Carregando.tsx'
import { FaixaSuperior } from './componentes/FaixaSuperior.tsx'
import { Protecao } from './componentes/Protecao.tsx'
import type { IdTela } from './navegacao/rotas.ts'
import { usarCartaoEmFoco, usarRota } from './navegacao/usarRota.ts'
import { Dados } from './telas/Dados.tsx'
import { FunilCorretores } from './telas/FunilCorretores.tsx'
import { Recebiveis } from './telas/Recebiveis.tsx'
import type { PropsDaTela } from './telas/tipos.ts'
import { VendasEstoque } from './telas/VendasEstoque.tsx'
import { VisaoGeral } from './telas/VisaoGeral.tsx'

const TELAS: Record<IdTela, ComponentType<PropsDaTela>> = {
  'visao-geral': VisaoGeral,
  'vendas-estoque': VendasEstoque,
  'funil-corretores': FunilCorretores,
  recebiveis: Recebiveis,
  dados: Dados,
}

export function App() {
  const banco = usarBanco()
  const [rota, navegar] = usarRota()
  usarCartaoEmFoco(rota, banco.pronto)
  if (!banco.pronto) return <Carregando erro={banco.erro} tentarDeNovo={banco.tentarDeNovo} />

  const Tela = TELAS[rota.tela]
  return (
    <div className={css.painel}>
      <a className={css.pular} href="#conteudo" onClick={(e) => {
        e.preventDefault()
        document.getElementById('conteudo')?.focus()
      }}>Pular para o conteúdo</a>
      <BarraLateral rota={rota} />
      <div className={css.coluna}>
        <FaixaSuperior rota={rota} navegar={navegar} />
        <main id="conteudo" className={css.conteudo} tabIndex={-1}>
          <Protecao key={rota.tela} aviso="Esta tela não conseguiu abrir.">
            <Tela rota={rota} navegar={navegar} />
          </Protecao>
        </main>
      </div>
    </div>
  )
}
