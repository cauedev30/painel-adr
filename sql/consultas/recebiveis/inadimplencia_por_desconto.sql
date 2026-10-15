-- Pergunta: Quem comprou com desconto alto paga pior?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: faixa_desconto (0–3%, 3–8%, 8% ou mais), ordem, vendas (ativas no fim do período) e
--          inadimplencia (fração: vencido e não pago ÷ vencido, na carteira do fim do período)
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
carteira as (
  select c.venda_id, c.valor, c.saldo, c.vencida,
         case when v.desconto_pct < 3 then 1
              when v.desconto_pct < 8 then 2
              else 3
         end as ordem
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  join adr.venda v on v.id = c.venda_id
  where p.empreendimento_id is null or c.empreendimento_id = p.empreendimento_id
)
select f.faixa_desconto,
       f.ordem,
       count(distinct c.venda_id)::int as vendas,
       (sum(c.saldo) filter (where c.vencida) / nullif(sum(c.valor) filter (where c.vencida), 0))::float8 as inadimplencia
from (values ('0–3%', 1), ('3–8%', 2), ('8% ou mais', 3)) as f(faixa_desconto, ordem)
left join carteira c on c.ordem = f.ordem
group by f.faixa_desconto, f.ordem
order by f.ordem;
