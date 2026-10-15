-- Pergunta: Quantos leads cada canal trouxe por mês em 2026?
-- Parâmetros: nenhum
-- Devolve: mes (AAAA-MM), canal e leads, do canal com mais leads para o com menos em cada mês
select to_char(date_trunc('month', data_entrada), 'YYYY-MM') as mes,
       canal,
       count(*)                                              as leads
from adr.lead
where data_entrada >= date '2026-01-01'
group by 1, 2
order by mes, leads desc;
