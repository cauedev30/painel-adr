-- Pergunta: Que problemas os dados brutos tinham, e o que o pipeline fez com cada um?
-- Parâmetros: nenhum
-- Devolve: regra (R1 a R7), origem (arquivo bruto), descricao, linhas_afetadas e acao (corrigido,
--          mesclado, nulo, outro, convertido, quarentena ou cascata), do relatório do pipeline
select regra, origem, descricao, linhas_afetadas, acao
from auditoria.relatorio_qualidade
order by regra, origem, acao;
