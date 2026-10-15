-- Pergunta: Que parte do que já venceu não foi paga (inadimplência)?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor e valor_anterior (fração de 0 a 1): vencido e não pago ÷ vencido, numa foto da
--          carteira no fim do período e no fim do período anterior de mesma duração (D4.3)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
inadimplencia as (
  select pr.atual,
         sum(c.saldo) filter (where c.vencida) / nullif(sum(c.valor) filter (where c.vencida), 0) as inadimplencia
  from periodos pr
  cross join lateral adr.carteira_em(pr.fim) c
  where pr.empreendimento_id is null or c.empreendimento_id = pr.empreendimento_id
  group by pr.atual
)
select max(inadimplencia) filter (where atual)::float8     as valor,
       max(inadimplencia) filter (where not atual)::float8 as valor_anterior
from inadimplencia;
