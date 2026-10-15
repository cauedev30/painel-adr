-- Pergunta: Quanto se pagou, em média, por metro quadrado no período?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor e valor_anterior (R$/m²): média de valor_venda ÷ área privativa das vendas do
--          período e do período anterior de mesma duração
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
preco as (
  select pr.atual, avg(v.preco_m2) as preco_m2
  from periodos pr
  left join adr.vw_venda v
    on v.data_venda between pr.inicio and pr.fim
   and (pr.empreendimento_id is null or v.empreendimento_id = pr.empreendimento_id)
  group by pr.atual
)
select max(preco_m2) filter (where atual)::float8     as valor,
       max(preco_m2) filter (where not atual)::float8 as valor_anterior
from preco;
