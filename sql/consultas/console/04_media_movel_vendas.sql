-- Pergunta: Como as vendas mensais evoluíram desde o primeiro lançamento, sem o sobe e desce?
-- Parâmetros: nenhum
-- Devolve: mes (AAAA-MM), vendas e media_movel_3m (média do mês e dos 2 anteriores)
with meses as (
  select generate_series(date_trunc('month', min(data_venda)),
                         date_trunc('month', max(data_venda)),
                         interval '1 month')::date as mes
  from adr.venda
),
vendas as (
  select date_trunc('month', data_venda)::date as mes, count(*) as vendas
  from adr.venda
  group by 1
)
select to_char(m.mes, 'YYYY-MM') as mes,
       coalesce(v.vendas, 0)     as vendas,
       round(avg(coalesce(v.vendas, 0)) over (order by m.mes rows between 2 preceding and current row), 1) as media_movel_3m
from meses m
left join vendas v using (mes)
order by m.mes;
