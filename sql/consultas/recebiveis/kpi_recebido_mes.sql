-- Pergunta: Quanto entrou de pagamento de parcelas no último mês?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor (R$, pago no último mês do período) e valor_anterior (pago no mês anterior a ele),
--          só das vendas ativas no fim do período (D4.3)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
-- o último mês do período e o mês anterior a ele
meses as (
  select true as atual, date_trunc('month', fim)::date as inicio, fim from params
  union all
  select false, (date_trunc('month', fim) - interval '1 month')::date, (date_trunc('month', fim) - interval '1 day')::date
  from params
),
-- os pagamentos das parcelas da carteira no fim do período
pagamentos as (
  select pg.data_pagamento, pg.valor_pago
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  join adr.pagamento pg on pg.parcela_id = c.parcela_id
  where p.empreendimento_id is null or c.empreendimento_id = p.empreendimento_id
),
recebido as (
  select m.atual, coalesce(sum(pg.valor_pago), 0) as recebido
  from meses m
  left join pagamentos pg on pg.data_pagamento between m.inicio and m.fim
  group by m.atual
)
select max(recebido) filter (where atual)::float8     as valor,
       max(recebido) filter (where not atual)::float8 as valor_anterior
from recebido;
