import css from './PainelSql.module.css'
import { realcarSql } from './realceSql.ts'

/** O texto SQL com o realce do "Ver SQL"; o texto continua exatamente o do arquivo. */
export function CodigoSql({ sql, className }: { sql: string; className?: string }) {
  return (
    <pre className={className ? `${css.codigo} ${className}` : css.codigo}>
      <code>
        {realcarSql(sql).map((p, i) => p.tipo === 'texto' ? p.texto : <span key={i} className={css[p.tipo]}>{p.texto}</span>)}
      </code>
    </pre>
  )
}
