import { usarBanco } from './banco/usarConsulta.ts'
import { Carregando } from './componentes/Carregando.tsx'

export function App() {
  const banco = usarBanco()
  if (!banco.pronto) return <Carregando erro={banco.erro} tentarDeNovo={banco.tentarDeNovo} />
  return (
    <main>
      <h1>Painel de Dados ADR</h1>
      <p>Banco PostgreSQL aberto no navegador. A estrutura do painel entra na próxima tarefa.</p>
    </main>
  )
}
