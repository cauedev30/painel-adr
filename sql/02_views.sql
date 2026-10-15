-- Views e funções em que as consultas do painel (sql/consultas/) se apoiam.
-- Rodam depois da carga dos dados (web/scripts/montar-banco.mjs roda todo sql/0*.sql em ordem).


-- A data de corte dos dados simulados: a "foto" padrão dos recebíveis (D4.4)
create function adr.data_corte() returns date
language sql immutable
as $$ select date '2026-09-30' $$;

comment on function adr.data_corte() is 'Data de corte dos dados simulados (30/09/2026): o dia da foto padrão dos recebíveis';


-- Uma linha por venda, já com a unidade, o empreendimento, o corretor e o cliente:
-- as consultas partem daqui em vez de repetir os mesmos joins
create view adr.vw_venda as
select v.id,
       v.data_venda,
       v.valor_venda,
       v.desconto_pct,
       v.status,
       v.data_distrato,
       v.unidade_id,
       u.codigo                                  as unidade_codigo,
       u.area_privativa_m2,
       u.andar,
       u.tipologia,
       u.vista_mar,
       u.preco_tabela,
       u.empreendimento_id,
       e.nome                                    as empreendimento,
       v.corretor_id,
       c.nome                                    as corretor,
       i.nome                                    as imobiliaria,  -- nulo: corretor autônomo
       v.cliente_id,
       cl.perfil                                 as perfil_cliente,
       round(v.valor_venda / u.area_privativa_m2, 2) as preco_m2
from adr.venda v
join adr.unidade u        on u.id = v.unidade_id
join adr.empreendimento e on e.id = u.empreendimento_id
join adr.corretor c       on c.id = v.corretor_id
left join adr.imobiliaria i on i.id = c.imobiliaria_id
join adr.cliente cl       on cl.id = v.cliente_id;

comment on view adr.vw_venda is 'Uma linha por venda com unidade, empreendimento, corretor, imobiliária, perfil do cliente e preço por m²';


-- A carteira de recebíveis numa data (D4.3): as parcelas das vendas ativas naquela data, com o que
-- foi pago até ela. Uma view não recebe parâmetro, por isso a carteira é uma função (D4.4).
-- Venda ativa na data: já vendida e ainda não distratada. A parcela vence no dia do vencimento e fica
-- em atraso a partir do dia seguinte.
create function adr.carteira_em(ref date)
returns table (
  parcela_id        int,
  venda_id          int,
  empreendimento_id smallint,
  numero            smallint,
  tipo              text,
  vencimento        date,
  valor             numeric(12, 2),
  pago              numeric(12, 2),
  saldo             numeric(12, 2),
  vencida           boolean,
  dias_atraso       int,
  faixa             text
)
language sql stable
as $$
  with pago as (
    select parcela_id, sum(valor_pago) as pago
    from adr.pagamento
    where data_pagamento <= ref
    group by parcela_id
  ),
  parcelas as (
    select p.id, p.venda_id, u.empreendimento_id, p.numero, p.tipo, p.vencimento, p.valor,
           coalesce(pg.pago, 0)              as pago,
           p.valor - coalesce(pg.pago, 0)    as saldo,
           p.vencimento < ref                as vencida
    from adr.parcela p
    join adr.venda v   on v.id = p.venda_id
    join adr.unidade u on u.id = v.unidade_id
    left join pago pg  on pg.parcela_id = p.id
    where v.data_venda <= ref
      and (v.data_distrato is null or v.data_distrato > ref)
  )
  select id, venda_id, empreendimento_id, numero, tipo, vencimento, valor, pago, saldo, vencida,
         case when vencida and saldo > 0 then ref - vencimento else 0 end as dias_atraso,
         case
           when saldo = 0               then 'paga'
           when not vencida             then 'a vencer'
           when ref - vencimento <= 30  then '1–30'
           when ref - vencimento <= 60  then '31–60'
           when ref - vencimento <= 90  then '61–90'
           else 'mais de 90'
         end as faixa
  from parcelas
$$;

comment on function adr.carteira_em(date) is 'Carteira de recebíveis na data: parcelas das vendas ativas nela, com pago, saldo, dias de atraso e faixa (paga, a vencer, 1–30, 31–60, 61–90, mais de 90)';


-- A carteira na data de corte, para consultar direto no console
create view adr.vw_carteira as
select * from adr.carteira_em(adr.data_corte());

comment on view adr.vw_carteira is 'Carteira de recebíveis na data de corte (30/09/2026): select * from adr.carteira_em(adr.data_corte())';
