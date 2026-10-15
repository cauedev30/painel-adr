-- Pergunta: O distrato costuma vir depois de um atraso longo?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: distratos (com data de distrato no período), com_atraso_60 (desses, os que tiveram antes
--          do distrato uma parcela com mais de 60 dias de atraso) e pct (com_atraso_60 ÷ distratos)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
distratos as (
  select v.id, v.data_distrato
  from adr.vw_venda v, params p
  where v.data_distrato between p.inicio and p.fim
    and (p.empreendimento_id is null or v.empreendimento_id = p.empreendimento_id)
),
parcelas as (
  select p.id, p.vencimento, p.valor, d.id as venda_id, d.data_distrato
  from distratos d
  join adr.parcela p on p.venda_id = d.id and p.vencimento < d.data_distrato
),
-- o dia em que cada parcela foi quitada: o primeiro pagamento em que o acumulado alcança o valor
acumulado as (
  select pg.parcela_id, pg.data_pagamento,
         sum(pg.valor_pago) over (partition by pg.parcela_id order by pg.data_pagamento, pg.id) as pago_acumulado
  from adr.pagamento pg
  where pg.parcela_id in (select id from parcelas)
),
-- o atraso de cada parcela antes do distrato: até a quitação ou, se não foi quitada, até o distrato
atrasos as (
  select pa.venda_id,
         least(coalesce(min(a.data_pagamento) filter (where a.pago_acumulado >= pa.valor), pa.data_distrato),
               pa.data_distrato) - pa.vencimento as dias
  from parcelas pa
  left join acumulado a on a.parcela_id = pa.id
  group by pa.venda_id, pa.id, pa.valor, pa.vencimento, pa.data_distrato
),
por_venda as (
  select d.id, coalesce(max(a.dias), 0) > 60 as atraso_60
  from distratos d
  left join atrasos a on a.venda_id = d.id
  group by d.id
)
select count(*)::int                                                            as distratos,
       count(*) filter (where atraso_60)::int                                   as com_atraso_60,
       (count(*) filter (where atraso_60)::float8 / nullif(count(*), 0))        as pct
from por_venda;
