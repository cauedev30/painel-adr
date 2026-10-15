-- Pergunta: Quais são as 10 maiores vendas ativas, e quem vendeu?
-- Parâmetros: nenhum
-- Devolve: data_venda, empreendimento, unidade, corretor, imobiliaria, valor_venda, desconto_pct
--          e preco_m2
select data_venda,
       empreendimento,
       unidade_codigo as unidade,
       corretor,
       coalesce(imobiliaria, 'autônomo') as imobiliaria,
       valor_venda,
       desconto_pct,
       preco_m2
from adr.vw_venda
where status = 'ativa'
order by valor_venda desc
limit 10;
