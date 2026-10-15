-- Pergunta: Que tabelas e colunas o banco tem, e como elas se ligam?
-- Parâmetros: nenhum
-- Devolve: tabela (esquema.tabela), coluna, tipo, nulo, pk, fk_tabela e fk_coluna (a coluna que a
--          chave estrangeira referencia) e comentario (o dicionário de dados), de cada coluna das
--          tabelas de adr e auditoria, lidos do catálogo do próprio banco (pg_catalog; as views do
--          information_schema dão o mesmo resultado, mas levam segundos no PGlite)
with tabelas as (
  select c.oid, n.nspname || '.' || c.relname as tabela
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('adr', 'auditoria')
    and c.relkind = 'r'  -- só tabelas: as views (vw_venda, vw_carteira) ficam de fora
),
colunas as (
  select t.oid, t.tabela, a.attnum, a.attname, a.attnotnull,
         replace(replace(format_type(a.atttypid, a.atttypmod),
                         'character(', 'char('), 'timestamp without time zone', 'timestamp') as tipo
  from tabelas t
  join pg_attribute a on a.attrelid = t.oid
  where a.attnum > 0 and not a.attisdropped
),
-- pg_constraint guarda as chaves com as colunas em arrays: conkey (da tabela) e confkey (da referenciada)
chaves_primarias as (
  select k.conrelid as oid, unnest(k.conkey) as attnum
  from pg_constraint k
  where k.contype = 'p'
),
chaves_estrangeiras as (
  select k.conrelid as oid, par.attnum,
         n.nspname || '.' || alvo.relname as fk_tabela,
         a.attname                        as fk_coluna
  from pg_constraint k
  cross join lateral unnest(k.conkey, k.confkey) as par(attnum, attnum_alvo)
  join pg_class alvo     on alvo.oid = k.confrelid
  join pg_namespace n    on n.oid = alvo.relnamespace
  join pg_attribute a    on a.attrelid = k.confrelid and a.attnum = par.attnum_alvo
  where k.contype = 'f'
)
select c.tabela,
       c.attname::text                      as coluna,
       c.tipo,
       not c.attnotnull                     as nulo,
       pk.attnum is not null                as pk,
       fk.fk_tabela,
       fk.fk_coluna::text,
       col_description(c.oid, c.attnum)     as comentario
from colunas c
left join chaves_primarias pk    on pk.oid = c.oid and pk.attnum = c.attnum
left join chaves_estrangeiras fk on fk.oid = c.oid and fk.attnum = c.attnum
order by c.tabela, c.attnum;
