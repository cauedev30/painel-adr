-- Pergunta: Quantas unidades a ADR vendeu a cada mês, e isso bateu a meta?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: mes (AAAA-MM), vendas, meta (unidades) e media_movel_3m (média das vendas do mês e dos
--          2 anteriores); um mês por linha, com zero nos meses sem venda
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
-- todos os meses do período, mais os 2 anteriores, que a média móvel do primeiro mês usa
meses as (
  select generate_series(inicio - interval '2 months', fim, interval '1 month')::date as mes
  from params
),
vendas as (
  select date_trunc('month', v.data_venda)::date as mes, count(*) as vendas
  from adr.vw_venda v, params p
  where v.data_venda between p.inicio - interval '2 months' and p.fim
    and (p.empreendimento_id is null or v.empreendimento_id = p.empreendimento_id)
  group by 1
),
metas as (
  select m.mes, sum(m.meta_unidades) as meta
  from adr.meta_mensal m, params p
  where m.mes between p.inicio and p.fim
    and (p.empreendimento_id is null or m.empreendimento_id = p.empreendimento_id)
  group by m.mes
),
serie as (
  select m.mes,
         coalesce(v.vendas, 0) as vendas,
         coalesce(mt.meta, 0)  as meta,
         avg(coalesce(v.vendas, 0)) over (order by m.mes rows between 2 preceding and current row) as media_movel_3m
  from meses m
  left join vendas v using (mes)
  left join metas mt using (mes)
)
select to_char(s.mes, 'YYYY-MM') as mes,
       s.vendas::int,
       s.meta::int,
       s.media_movel_3m::float8
from serie s, params p
where s.mes >= p.inicio
order by s.mes;
