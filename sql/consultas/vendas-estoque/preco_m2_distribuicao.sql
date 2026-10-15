-- Pergunta: Como o preço por m² se distribui em cada empreendimento, e há vendas fora da curva?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: empreendimento_id, nome e o boxplot do preço/m² (R$) das vendas do período: minimo e
--          maximo (pontas dos bigodes), q1, mediana, q3 e outliers (os preços além de 1,5 × IQR)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
vendas as (
  select v.empreendimento_id, v.empreendimento as nome, v.preco_m2
  from adr.vw_venda v, params p
  where v.data_venda between p.inicio and p.fim
    and (p.empreendimento_id is null or v.empreendimento_id = p.empreendimento_id)
),
quartis as (
  select empreendimento_id, nome,
         percentile_cont(0.25) within group (order by preco_m2) as q1,
         percentile_cont(0.50) within group (order by preco_m2) as mediana,
         percentile_cont(0.75) within group (order by preco_m2) as q3
  from vendas
  group by empreendimento_id, nome
),
-- as cercas do boxplot: 1,5 × IQR (distância entre Q3 e Q1) abaixo do Q1 e acima do Q3
cercas as (
  select *, q1 - 1.5 * (q3 - q1) as cerca_baixa, q3 + 1.5 * (q3 - q1) as cerca_alta
  from quartis
)
select c.empreendimento_id,
       c.nome,
       min(v.preco_m2) filter (where v.preco_m2 >= c.cerca_baixa)::float8 as minimo,
       c.q1::float8,
       c.mediana::float8,
       c.q3::float8,
       max(v.preco_m2) filter (where v.preco_m2 <= c.cerca_alta)::float8  as maximo,
       coalesce(array_agg(v.preco_m2::float8 order by v.preco_m2)
                  filter (where v.preco_m2 < c.cerca_baixa or v.preco_m2 > c.cerca_alta),
                '{}')                                                      as outliers
from cercas c
join vendas v on v.empreendimento_id = c.empreendimento_id
group by c.empreendimento_id, c.nome, c.q1, c.mediana, c.q3, c.cerca_baixa, c.cerca_alta
order by c.empreendimento_id;
