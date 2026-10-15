// O "?" da tabela de estatísticas do preço/m² (seção 6.1): cada termo numa frase, para quem não é da
// área. As chaves são as colunas de vendas-estoque/preco_m2_estatisticas.sql.
export const GLOSSARIO: Record<string, { termo: string; explicacao: string }> = {
  media: { termo: 'Média', explicacao: 'A soma de todos os preços dividida pelo número de vendas; uma venda muito cara ou muito barata puxa a média.' },
  mediana: { termo: 'Mediana', explicacao: 'O preço do meio: metade das vendas saiu abaixo dele e metade acima, e os extremos não a puxam.' },
  moda: { termo: 'Moda', explicacao: 'O preço que mais se repete, arredondado a R$ 100, porque um preço exato quase nunca se repete.' },
  desvio_padrao: { termo: 'Desvio padrão', explicacao: 'Quanto os preços se afastam da média, em geral; quanto maior, mais espalhados.' },
  p25: { termo: 'P25', explicacao: 'Um quarto das vendas saiu abaixo deste preço (é o primeiro quartil, a base da caixa do boxplot).' },
  p50: { termo: 'P50', explicacao: 'Metade das vendas saiu abaixo deste preço; é o mesmo número que a mediana.' },
  p75: { termo: 'P75', explicacao: 'Três quartos das vendas saíram abaixo deste preço (é o terceiro quartil, o topo da caixa).' },
  p90: { termo: 'P90', explicacao: 'Só 1 em cada 10 vendas saiu acima deste preço.' },
}
