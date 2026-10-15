-- Pergunta: Quanto está em atraso, e há quanto tempo?
-- Parâmetros: $1 início e $2 fim do período (meses inteiros), $3 empreendimento (nulo = todos)
-- Devolve: faixa (1–30, 31–60, 61–90, mais de 90 dias), ordem, saldo (R$ vencido e não pago) e
--          parcelas, na carteira do fim do período (D4.3); as 4 faixas sempre aparecem
with params as (select $1::date as inicio, $2::date as fim, $3::smallint as empreendimento_id),
atrasadas as (
  select c.faixa, c.saldo
  from params p
  cross join lateral adr.carteira_em(p.fim) c
  where c.dias_atraso > 0
    and (p.empreendimento_id is null or c.empreendimento_id = p.empreendimento_id)
)
select f.faixa,
       f.ordem,
       coalesce(sum(a.saldo), 0)::float8 as saldo,
       count(a.saldo)::int               as parcelas
from (values ('1–30', 1), ('31–60', 2), ('61–90', 3), ('mais de 90', 4)) as f(faixa, ordem)
left join atrasadas a on a.faixa = f.faixa
group by f.faixa, f.ordem
order by f.ordem;
