-- Pergunta: Quantos registros o pipeline separou em quarentena, e por quê?
-- Parâmetros: nenhum
-- Devolve: origem (arquivo · tabela), regra, motivo e registros; o registro barrado fica guardado
--          inteiro em jsonb (ex.: registro->>'id'), e quem caiu porque dependia de outro registro
--          em quarentena (a cascata) aparece numa linha só por origem e regra
select origem,
       regra,
       case when motivo like 'depende de %' then 'depende de um registro em quarentena (cascata)'
            else motivo
       end      as motivo,
       count(*) as registros
from auditoria.quarentena
group by 1, 2, 3
order by registros desc, origem, regra;
