-- Pergunta: Como está cada empreendimento: quanto já vendeu, quanto falta e em que ritmo?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: empreendimento_id, nome, slug, status, unidades (lançadas até o fim do período),
--          vendidas e estoque (no fim do período), vso (do período, como o KPI) e vgv (líquido do
--          período, como o KPI); um empreendimento por linha
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
empreendimentos as (
  select e.id, e.nome, e.slug, e.status, e.data_lancamento
  from adr.empreendimento e, params p
  where p.empreendimento_id is null or e.id = p.empreendimento_id
),
-- as unidades lançadas até o fim do período: vendida no fim e vendida na véspera do início
unidades as (
  select u.id, u.empreendimento_id, e.data_lancamento,
         exists (select 1 from adr.venda v
                 where v.unidade_id = u.id and v.data_venda <= p.fim
                   and (v.data_distrato is null or v.data_distrato > p.fim))     as vendida_no_fim,
         exists (select 1 from adr.venda v
                 where v.unidade_id = u.id and v.data_venda < p.inicio
                   and (v.data_distrato is null or v.data_distrato >= p.inicio)) as vendida_no_inicio
  from adr.unidade u
  join empreendimentos e on e.id = u.empreendimento_id
  cross join params p
  where e.data_lancamento <= p.fim
),
estoque as (
  select u.empreendimento_id,
         count(*)                                                                as unidades,
         count(*) filter (where u.vendida_no_fim)                                as vendidas,
         count(*) filter (where u.data_lancamento < p.inicio and not u.vendida_no_inicio)
           + count(*) filter (where u.data_lancamento >= p.inicio)               as a_venda_no_periodo
  from unidades u, params p
  group by u.empreendimento_id
),
vendas as (
  select v.empreendimento_id,
         count(*) filter (where v.data_venda between p.inicio and p.fim)          as vendas,
         coalesce(sum(v.valor_venda) filter (where v.data_venda between p.inicio and p.fim), 0)
       - coalesce(sum(v.valor_venda) filter (where v.data_distrato between p.inicio and p.fim), 0) as vgv
  from adr.vw_venda v, params p
  group by v.empreendimento_id
)
select e.id                                                   as empreendimento_id,
       e.nome,
       e.slug,
       e.status,
       coalesce(es.unidades, 0)::int                          as unidades,
       coalesce(es.vendidas, 0)::int                          as vendidas,
       coalesce(es.unidades - es.vendidas, 0)::int            as estoque,
       (vs.vendas::float8 / nullif(es.a_venda_no_periodo, 0)) as vso,
       coalesce(vs.vgv, 0)::float8                            as vgv
from empreendimentos e
left join estoque es on es.empreendimento_id = e.id
left join vendas vs  on vs.empreendimento_id = e.id
order by e.id;
