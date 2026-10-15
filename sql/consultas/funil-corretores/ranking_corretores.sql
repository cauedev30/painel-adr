-- Pergunta: Quem são os corretores que mais vendem, e quem subiu ou caiu no ranking?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: corretor_id, nome, imobiliaria (nula = autônomo), vendas e vgv (R$) do período,
--          posicao (por vendas; empate divide a posição), posicao_anterior (no período anterior de
--          mesma duração; nula se não vendeu nele) e variacao (posições ganhas; negativa = caiu)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
periodos as (
  select true as atual, inicio, fim, empreendimento_id from params
  union all
  select false, (inicio - age(fim + 1, inicio))::date, inicio - 1, empreendimento_id from params
),
vendas as (
  select pr.atual, v.corretor_id, v.corretor as nome, v.imobiliaria,
         count(*) as vendas, sum(v.valor_venda) as vgv
  from periodos pr
  join adr.vw_venda v
    on v.data_venda between pr.inicio and pr.fim
   and (pr.empreendimento_id is null or v.empreendimento_id = pr.empreendimento_id)
  group by pr.atual, v.corretor_id, v.corretor, v.imobiliaria
),
-- rank(): quem empata em vendas fica na mesma posição, e a seguinte pula (1, 2, 2, 4)
posicoes as (
  select *, rank() over (partition by atual order by vendas desc) as posicao
  from vendas
),
-- lag(): a posição da linha anterior do mesmo corretor; false (período anterior) vem antes de true
com_anterior as (
  select *, lag(posicao) over (partition by corretor_id order by atual) as posicao_anterior
  from posicoes
)
select corretor_id,
       nome,
       imobiliaria,
       vendas::int,
       vgv::float8,
       posicao::int,
       posicao_anterior::int,
       (posicao_anterior - posicao)::int as variacao
from com_anterior
where atual
order by posicao, vgv desc, nome;
