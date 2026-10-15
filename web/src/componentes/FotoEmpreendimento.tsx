import bessa from '../assets/mares-bessa.webp'
import caboBranco from '../assets/mares-cabo-branco.webp'
import seaside from '../assets/mares-seaside.webp'
import seaview from '../assets/mares-seaview.webp'
import type { Empreendimento } from '../empreendimentos.ts'
import css from './FotoEmpreendimento.module.css'

// os 3 em pré-lançamento não têm foto no site da ADR (web/src/assets/FONTES.md)
const FOTOS: Partial<Record<Empreendimento['slug'], string>> = {
  'mares-cabo-branco': caboBranco,
  'mares-seaside': seaside,
  'mares-seaview': seaview,
  'mares-bessa': bessa,
}

/** A fachada do empreendimento; sem foto, um quadro com o nome e "pré-lançamento". */
export function FotoEmpreendimento({ empreendimento }: { empreendimento: Empreendimento }) {
  const foto = FOTOS[empreendimento.slug]
  if (!foto) {
    return (
      <div className={css.semFoto} role="img" aria-label={`${empreendimento.nome}, pré-lançamento, sem foto`}>
        <span>{empreendimento.nome}</span>
        <small>pré-lançamento</small>
      </div>
    )
  }
  return <img className={css.foto} src={foto} alt={`Fachada do ${empreendimento.nome}`} loading="lazy" />
}
