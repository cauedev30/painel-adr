-- Pergunta: Quantas unidades lançadas ainda estão à venda no fim do período?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: valor e valor_anterior (unidades): unidades de empreendimentos lançados sem venda ativa
--          no fim do período e no fim do período anterior de mesma duração
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
estoque as (
  select pr.atual,
         (select count(*)
          from adr.unidade u
          join adr.empreendimento e on e.id = u.empreendimento_id
          where e.data_lancamento <= pr.fim
            and (pr.empreendimento_id is null or u.empreendimento_id = pr.empreendimento_id)
            -- o status da unidade não é guardado: ela está vendida se tem venda ativa na data
            and not exists (select 1 from adr.venda v
                            where v.unidade_id = u.id
                              and v.data_venda <= pr.fim
                              and (v.data_distrato is null or v.data_distrato > pr.fim))) as estoque
  from periodos pr
)
select max(estoque) filter (where atual)::int     as valor,
       max(estoque) filter (where not atual)::int as valor_anterior
from estoque;
