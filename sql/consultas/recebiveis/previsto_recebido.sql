-- Pergunta: A cada mês, entrou o dinheiro que as parcelas previam?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: mes (AAAA-MM), previsto (R$, parcelas que venciam no mês) e recebido (R$, pagamentos
--          feitos no mês), só das vendas ativas no fim do período (D4.3); um mês por linha
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
carteira as (
  select c.*
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  where p.empreendimento_id is null or c.empreendimento_id = p.empreendimento_id
),
meses as (
  select generate_series(inicio, fim, interval '1 month')::date as mes
  from params
),
previsto as (
  select date_trunc('month', vencimento)::date as mes, sum(valor) as previsto
  from carteira
  group by 1
),
recebido as (
  select date_trunc('month', pg.data_pagamento)::date as mes, sum(pg.valor_pago) as recebido
  from carteira c
  join adr.pagamento pg on pg.parcela_id = c.parcela_id
  group by 1
)
select to_char(m.mes, 'YYYY-MM')         as mes,
       coalesce(pv.previsto, 0)::float8  as previsto,
       coalesce(r.recebido, 0)::float8   as recebido
from meses m
left join previsto pv using (mes)
left join recebido r using (mes)
order by m.mes;
