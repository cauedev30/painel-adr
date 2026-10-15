import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; /** O que aparece no lugar do que quebrou. */ aviso: string }

/**
 * Um erro de desenho fica preso aqui: sem isto, um cartão que quebra apaga o painel inteiro e deixa
 * a tela preta. O erro continua no console do navegador, para ser corrigido.
 */
export class Protecao extends Component<Props, { erro: Error | null }> {
  state = { erro: null as Error | null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error) {
    console.error('[painel]', erro)
  }

  render() {
    if (this.state.erro) return <p role="alert" style={{ color: 'var(--atraso-1)' }}>{this.props.aviso} ({this.state.erro.message})</p>
    return this.props.children
  }
}
