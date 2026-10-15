import logo from '../assets/logo-adr.png'
import css from './Carregando.module.css'

type Props = { erro: string | null; tentarDeNovo: () => void }

/** A tela de enquanto o banco abre no navegador; com erro, mostra a mensagem e "Tentar de novo". */
export function Carregando({ erro, tentarDeNovo }: Props) {
  return (
    <main className={css.tela} aria-busy={erro === null}>
      <img className={css.logo} src={logo} alt="ADR Empreendimentos" width={160} height={67} />
      {erro === null ? (
        <>
          <div className={css.barra} aria-hidden="true">
            <span />
          </div>
          <p className={css.texto} role="status">Carregando o banco PostgreSQL no seu navegador…</p>
        </>
      ) : (
        <div className={css.erro} role="alert">
          <p className={css.texto}>Não consegui abrir o banco: {erro}</p>
          <button type="button" className={css.botao} onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}
    </main>
  )
}
