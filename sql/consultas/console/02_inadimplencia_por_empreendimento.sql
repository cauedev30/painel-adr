-- Pergunta: Quanto venceu, quanto não foi pago e qual a inadimplência de cada empreendimento?
-- Parâmetros: nenhum (usa adr.vw_carteira, a carteira na data de corte, 30/09/2026)
-- Devolve: empreendimento, vencido (R$), em_aberto (R$) e inadimplencia_pct
select e.nome                                          as empreendimento,
       sum(c.valor) filter (where c.vencida)           as vencido,
       sum(c.saldo) filter (where c.vencida)           as em_aberto,
       round(100 * sum(c.saldo) filter (where c.vencida)
                 / sum(c.valor) filter (where c.vencida), 2) as inadimplencia_pct
from adr.vw_carteira c
join adr.empreendimento e on e.id = c.empreendimento_id
group by e.nome
order by inadimplencia_pct desc;
