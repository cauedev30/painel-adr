-- Pergunta: Dos leads que entraram no período, quantos chegaram a cada etapa até a venda?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: etapa (lead, visita, proposta, venda), ordem, leads (que chegaram à etapa) e conversao
--          (leads da etapa ÷ leads da etapa anterior; nula na primeira)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
leads as (
  select l.*
  from adr.lead l, params p
  where l.data_entrada >= p.inicio and l.data_entrada < p.fim + 1  -- data_entrada tem hora
    and (p.empreendimento_id is null or l.empreendimento_id = p.empreendimento_id)
),
-- uma passada só pela tabela: cada etapa é uma contagem com filtro
contagem as (
  select count(*)                                      as lead,
         count(*) filter (where data_visita is not null)   as visita,
         count(*) filter (where data_proposta is not null) as proposta,
         count(*) filter (where etapa = 'venda')           as venda
  from leads
),
etapas as (
  select e.etapa, e.ordem, e.leads
  from contagem c,
       lateral (values ('lead', 1, c.lead), ('visita', 2, c.visita),
                       ('proposta', 3, c.proposta), ('venda', 4, c.venda)) as e(etapa, ordem, leads)
)
select etapa,
       ordem,
       leads::int,
       (leads::float8 / nullif(lag(leads) over (order by ordem), 0)) as conversao
from etapas
order by ordem;
