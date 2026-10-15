-- Pergunta: Em que empreendimento e em que faixa de atraso o dinheiro está parado?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: empreendimento_id, nome, faixa, ordem e saldo (R$ em atraso), na carteira do fim do
--          período (D4.3); uma linha por empreendimento lançado e faixa, com zero onde não há atraso
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
empreendimentos as (
  select e.id, e.nome
  from adr.empreendimento e, params p
  where e.data_lancamento <= p.fim
    and (p.empreendimento_id is null or e.id = p.empreendimento_id)
),
atrasadas as (
  select c.empreendimento_id, c.faixa, c.saldo
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  where c.dias_atraso > 0
)
select e.id                              as empreendimento_id,
       e.nome,
       f.faixa,
       f.ordem,
       coalesce(sum(a.saldo), 0)::float8 as saldo
from empreendimentos e
cross join (values ('1–30', 1), ('31–60', 2), ('61–90', 3), ('mais de 90', 4)) as f(faixa, ordem)
left join atrasadas a on a.empreendimento_id = e.id and a.faixa = f.faixa
group by e.id, e.nome, f.faixa, f.ordem
order by e.id, f.ordem;
