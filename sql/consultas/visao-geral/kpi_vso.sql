-- Pergunta: Que parte do que estava à venda foi vendida no período (VSO)?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor e valor_anterior (fração de 0 a 1): vendidas no período ÷ (estoque no início +
--          unidades lançadas no período); valor_anterior é o período anterior de mesma duração
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
-- as unidades dos empreendimentos já lançados, com a data do lançamento
unidades as (
  select u.id, u.empreendimento_id, e.data_lancamento
  from adr.unidade u
  join adr.empreendimento e on e.id = u.empreendimento_id
  where e.data_lancamento is not null
),
vso as (
  select pr.atual,
         (select count(*) from adr.vw_venda v
          where v.data_venda between pr.inicio and pr.fim
            and (pr.empreendimento_id is null or v.empreendimento_id = pr.empreendimento_id)) as vendidas,
         -- estoque no início: lançadas antes do período e sem venda ativa na véspera dele
         (select count(*) from unidades u
          where u.data_lancamento < pr.inicio
            and (pr.empreendimento_id is null or u.empreendimento_id = pr.empreendimento_id)
            and not exists (select 1 from adr.venda v
                            where v.unidade_id = u.id
                              and v.data_venda < pr.inicio
                              and (v.data_distrato is null or v.data_distrato >= pr.inicio))) as estoque_inicio,
         (select count(*) from unidades u
          where u.data_lancamento between pr.inicio and pr.fim
            and (pr.empreendimento_id is null or u.empreendimento_id = pr.empreendimento_id)) as lancadas
  from periodos pr
)
select max(vendidas::float8 / nullif(estoque_inicio + lancadas, 0)) filter (where atual)     as valor,
       max(vendidas::float8 / nullif(estoque_inicio + lancadas, 0)) filter (where not atual) as valor_anterior
from vso;
