-- Pergunta: Em que ritmo cada lançamento vendeu, mês a mês desde o lançamento?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: empreendimento_id, nome, mes_desde_lancamento (1 = mês do lançamento),
--          vendidas_acumuladas e pct_vendido (fração das unidades); a curva vai do lançamento até
--          $2 ($1 não a muda), e cada unidade conta uma vez, na primeira venda, porque a curva mede
--          o ritmo de absorção (distrato não desconta)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
lancados as (
  select e.id, e.nome, date_trunc('month', e.data_lancamento)::date as lancamento,
         (select count(*) from adr.unidade u where u.empreendimento_id = e.id) as unidades
  from adr.empreendimento e, params p
  where e.data_lancamento <= p.fim
    and (p.empreendimento_id is null or e.id = p.empreendimento_id)
),
primeira_venda as (
  select v.empreendimento_id, v.unidade_id, min(v.data_venda) as data_venda
  from adr.vw_venda v, params p
  where v.data_venda <= p.fim
  group by v.empreendimento_id, v.unidade_id
),
vendidas_no_mes as (
  select empreendimento_id, date_trunc('month', data_venda)::date as mes, count(*) as vendidas
  from primeira_venda
  group by 1, 2
),
-- um mês por linha, do lançamento até o fim do período, com zero onde não houve venda
meses as (
  select l.id as empreendimento_id, m.mes::date as mes
  from lancados l, params p, generate_series(l.lancamento, p.fim, interval '1 month') as m(mes)
)
select l.id                                                                    as empreendimento_id,
       l.nome,
       (row_number() over w)::int                                              as mes_desde_lancamento,
       (sum(coalesce(vm.vendidas, 0)) over w)::int                             as vendidas_acumuladas,
       (sum(coalesce(vm.vendidas, 0)) over w / nullif(l.unidades, 0))::float8  as pct_vendido
from meses m
join lancados l on l.id = m.empreendimento_id
left join vendidas_no_mes vm on vm.empreendimento_id = m.empreendimento_id and vm.mes = m.mes
window w as (partition by m.empreendimento_id order by m.mes)
order by l.id, m.mes;
