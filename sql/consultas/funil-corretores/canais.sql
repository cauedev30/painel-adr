-- Pergunta: De onde vêm os leads, e que canal transforma mais leads em venda?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: canal, leads (que entraram no período), vendas (desses leads) e conversao (vendas ÷
--          leads); do canal de maior volume para o de menor
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
leads as (
  select l.canal, l.etapa
  from adr.lead l, params p
  where l.data_entrada >= p.inicio and l.data_entrada < p.fim + 1  -- data_entrada tem hora
    and (p.empreendimento_id is null or l.empreendimento_id = p.empreendimento_id)
)
select canal,
       count(*)::int                                           as leads,
       count(*) filter (where etapa = 'venda')::int            as vendas,
       count(*) filter (where etapa = 'venda')::float8 / count(*) as conversao
from leads
group by canal
order by leads desc, canal;
