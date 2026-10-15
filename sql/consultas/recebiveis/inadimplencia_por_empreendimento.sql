-- Pergunta: A inadimplência está espalhada ou concentrada num empreendimento?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: empreendimento_id, nome e inadimplencia (fração: vencido e não pago ÷ vencido, na
--          carteira do fim do período, como o KPI); da maior para a menor
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
carteira as (
  select c.*
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  where p.empreendimento_id is null or c.empreendimento_id = p.empreendimento_id
)
select c.empreendimento_id,
       e.nome,
       (sum(c.saldo) filter (where c.vencida) / sum(c.valor) filter (where c.vencida))::float8 as inadimplencia
from carteira c
join adr.empreendimento e on e.id = c.empreendimento_id
group by c.empreendimento_id, e.nome
having sum(c.valor) filter (where c.vencida) > 0
order by inadimplencia desc;
