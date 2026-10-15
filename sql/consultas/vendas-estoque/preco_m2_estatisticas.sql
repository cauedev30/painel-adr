-- Pergunta: Qual o preço por m² típico das vendas do período, e quanto ele varia?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: n (vendas), media, mediana, moda, desvio_padrao, p25, p50, p75 e p90 do preço/m² (R$)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
vendas as (
  select v.preco_m2
  from adr.vw_venda v, params p
  where v.data_venda between p.inicio and p.fim
    and (p.empreendimento_id is null or v.empreendimento_id = p.empreendimento_id)
)
select count(*)::int                                                      as n,
       avg(preco_m2)::float8                                              as media,
       (percentile_cont(0.50) within group (order by preco_m2))::float8   as mediana,
       -- um preço contínuo quase nunca se repete: a moda é do preço/m² arredondado a R$ 100
       (mode() within group (order by round(preco_m2, -2)))::float8       as moda,
       stddev_samp(preco_m2)::float8                                      as desvio_padrao,
       (percentile_cont(0.25) within group (order by preco_m2))::float8   as p25,
       (percentile_cont(0.50) within group (order by preco_m2))::float8   as p50,
       (percentile_cont(0.75) within group (order by preco_m2))::float8   as p75,
       (percentile_cont(0.90) within group (order by preco_m2))::float8   as p90
from vendas;
