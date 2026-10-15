-- Pergunta: Quanto a ADR vendeu no período, já descontados os distratos?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor (VGV líquido, R$) e valor_anterior (o mesmo no período anterior de mesma duração)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
-- o período pedido e o anterior de mesma duração (D4.1): 12 meses → os 12 meses antes do início
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
-- VGV líquido (D4.5): vendas com data no período menos as distratadas com data de distrato no período
vgv as (
  select pr.atual,
         coalesce(sum(v.valor_venda) filter (where v.data_venda between pr.inicio and pr.fim), 0)
       - coalesce(sum(v.valor_venda) filter (where v.data_distrato between pr.inicio and pr.fim), 0) as vgv
  from periodos pr
  left join adr.vw_venda v on pr.empreendimento_id is null or v.empreendimento_id = pr.empreendimento_id
  group by pr.atual
)
select max(vgv) filter (where atual)::float8     as valor,
       max(vgv) filter (where not atual)::float8 as valor_anterior
from vgv;
