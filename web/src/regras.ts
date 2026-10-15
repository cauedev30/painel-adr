// As 7 regras de sujeira e tratamento (seção 3.5 da spec), com um exemplo de "antes → depois" para os
// cartões do relatório de qualidade. Os números vêm de auditoria.relatorio_qualidade; aqui só o texto.
export const REGRAS: Record<string, { titulo: string; antes: string; depois: string }> = {
  R1: { titulo: 'Leads duplicados', antes: '(83) 99876-5432 e +55 83 99876-5432, dois leads', depois: 'um lead só, o mais antigo, com o telefone +5583998765432' },
  R2: { titulo: 'Textos despadronizados', antes: '"C. Branco", "CABO BRANCO ", "J. Silva"', depois: '"Cabo Branco" e o corretor do cadastro; o ambíguo vai para a quarentena' },
  R3: { titulo: 'Canal em texto livre', antes: '"insta", "IG", "Insta "', depois: 'instagram; o que o dicionário não conhece vira outro' },
  R4: { titulo: 'Datas misturadas e impossíveis', antes: '15/03/2025 14:20 e 2025-03-15 14:20:00; vencimento em 2099', depois: 'uma data só; a impossível vai para a quarentena' },
  R5: { titulo: 'Valor como texto e erro de digitação', antes: '"R$ 3.120.000,00" num studio (um zero a mais)', depois: 'R$ 312.000,00, se ÷ 10 cai na faixa do empreendimento; senão, quarentena' },
  R6: { titulo: 'Campos vazios ou inválidos', antes: 'venda sem corretor; e-mail "joao@"', depois: '"Venda direta"; e-mail nulo, contado' },
  R7: { titulo: 'Pagamento de parcela que não existe', antes: 'baixa ligada à parcela 99.999', depois: 'quarentena, nunca apagado em silêncio' },
}

/** Como o relatório chama cada ação, na frase do cartão. */
export const ACOES: Record<string, string> = {
  corrigido: 'corrigidas',
  mesclado: 'mescladas',
  nulo: 'viraram nulo',
  outro: 'viraram "outro"',
  convertido: 'convertidas',
  quarentena: 'na quarentena',
  cascata: 'na quarentena em cascata',
}
