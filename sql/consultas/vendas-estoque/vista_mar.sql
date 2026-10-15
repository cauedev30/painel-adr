-- Pergunta: A vista para o mar faz a unidade valer mais e vender mais rápido?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: vista_mar, unidades (lançadas até o fim do período), vendas e preco_m2_medio (R$, das
--          vendas do período) e pct_vendidas_6_meses: a parte de TODAS as unidades vendida nos 6
--          primeiros meses do lançamento (a mediana de dias só das vendidas teria viés de
--          sobrevivência, porque ignora as que nunca venderam)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
unidades as (
  select u.id, u.vista_mar, e.data_lancamento,
         exists (select 1 from adr.venda v
                 where v.unidade_id = u.id
                   and v.data_venda < e.data_lancamento + interval '6 months') as vendida_em_6_meses
  from adr.unidade u
  join adr.empreendimento e on e.id = u.empreendimento_id
  cross join params p
  where e.data_lancamento <= p.fim
    and (p.empreendimento_id is null or u.empreendimento_id = p.empreendimento_id)
),
-- só entra na velocidade o lançamento que já completou 6 meses no fim do período
velocidade as (
  select u.vista_mar, count(*) filter (where u.vendida_em_6_meses)::float8 / count(*) as pct
  from unidades u, params p
  where u.data_lancamento + interval '6 months' <= p.fim + 1
  group by u.vista_mar
),
vendas as (
  select v.vista_mar, count(*) as vendas, avg(v.preco_m2) as preco_m2_medio
  from adr.vw_venda v, params p
  where v.data_venda between p.inicio and p.fim
    and (p.empreendimento_id is null or v.empreendimento_id = p.empreendimento_id)
  group by v.vista_mar
)
select t.vista_mar,
       (select count(*) from unidades u where u.vista_mar = t.vista_mar)::int as unidades,
       coalesce(vs.vendas, 0)::int                                            as vendas,
       vs.preco_m2_medio::float8,
       vl.pct::float8                                                         as pct_vendidas_6_meses
from (values (true), (false)) as t(vista_mar)
left join vendas vs     on vs.vista_mar = t.vista_mar
left join velocidade vl on vl.vista_mar = t.vista_mar
order by t.vista_mar desc;
