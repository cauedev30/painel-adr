-- Pergunta: Quanto as parcelas ainda vão trazer de caixa nos próximos 12 meses?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor e valor_anterior (R$): saldo das parcelas a vencer nos 12 meses depois do fim do
--          período, na carteira daquele dia (D4.3), e o mesmo no fim do período anterior
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
a_receber as (
  select pr.atual,
         coalesce(sum(c.saldo) filter (where not c.vencida
                                         and c.vencimento <= pr.fim + interval '12 months'), 0) as a_receber
  from periodos pr
  cross join lateral adr.carteira_em(pr.fim) c
  where pr.empreendimento_id is null or c.empreendimento_id = pr.empreendimento_id
  group by pr.atual
)
select max(a_receber) filter (where atual)::float8     as valor,
       max(a_receber) filter (where not atual)::float8 as valor_anterior
from a_receber;
