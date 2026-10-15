import type { ComponentType } from 'react'
import css from './App.module.css'
import { usarBanco } from './banco/usarConsulta.ts'
import { BarraLateral } from './componentes/BarraLateral.tsx'
import { Carregando } from './componentes/Carregando.tsx'
import { FaixaSuperior } from './componentes/FaixaSuperior.tsx'
import type { IdTela } from './navegacao/rotas.ts'
import { usarRota } from './navegacao/usarRota.ts'
import { Console } from './telas/Console.tsx'
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
  console: Console,
}

export function App() {
  const banco = usarBanco()
  const [rota, navegar] = usarRota()
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
          <Tela rota={rota} navegar={navegar} />
        </main>
      </div>
    </div>
  )
}
