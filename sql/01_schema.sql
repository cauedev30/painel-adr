-- Schema do Painel de Dados ADR: as 10 tabelas de adr e as 2 de auditoria.
-- PostgreSQL puro: roda no PGlite do painel e em qualquer Postgres (psql, pgAdmin, DBeaver).
-- Os comentários (comment on) são o dicionário de dados; a tela Dados do painel lê daqui (D3.5).

create schema adr;
create schema auditoria;

comment on schema adr is 'Dados comerciais e de recebíveis da ADR, já tratados pelo pipeline (números simulados).';
comment on schema auditoria is 'Qualidade dos dados: o que o pipeline corrigiu e o que barrou.';

-- ---------- Cadastros ----------

create table adr.empreendimento (
  id               smallint primary key,
  nome             text not null unique,
  slug             text not null unique,
  bairro           text,
  cidade           text,
  status           text not null check (status in ('pre_lancamento', 'em_obras', 'entregue')),
  data_lancamento  date,
  previsao_entrega date
);
comment on table adr.empreendimento is 'Os 7 empreendimentos reais da ADR (nomes, bairros e status do site).';
comment on column adr.empreendimento.id is 'Código do empreendimento.';
comment on column adr.empreendimento.nome is 'Nome comercial, como no site da ADR.';
comment on column adr.empreendimento.slug is 'Nome em minúsculas com hífen, usado nas URLs do painel.';
comment on column adr.empreendimento.bairro is 'Bairro oficial; nulo quando a ADR não divulga.';
comment on column adr.empreendimento.cidade is 'Cidade; nulo quando a ADR não divulga.';
comment on column adr.empreendimento.status is 'pre_lancamento, em_obras ou entregue.';
comment on column adr.empreendimento.data_lancamento is 'Mês do lançamento; nulo enquanto não lançou.';
comment on column adr.empreendimento.previsao_entrega is 'Mês previsto da entrega; nulo quando só o ano é divulgado.';

create table adr.unidade (
  id                int primary key,
  empreendimento_id smallint not null references adr.empreendimento,
  codigo            text not null unique,
  andar             smallint not null,
  tipologia         text not null check (tipologia in ('studio', 'duplex', 'garden')),
  area_privativa_m2 numeric(6, 2) not null check (area_privativa_m2 > 0),
  vista_mar         boolean not null,
  preco_tabela      numeric(12, 2) not null check (preco_tabela > 0)
);
comment on table adr.unidade is 'Unidades à venda. O status (disponível ou vendida) não é guardado: sai da venda ativa.';
comment on column adr.unidade.id is 'Código interno da unidade.';
comment on column adr.unidade.empreendimento_id is 'Empreendimento da unidade.';
comment on column adr.unidade.codigo is 'Código do espelho de vendas (sigla do empreendimento, andar e posição).';
comment on column adr.unidade.andar is 'Andar.';
comment on column adr.unidade.tipologia is 'studio, duplex ou garden.';
comment on column adr.unidade.area_privativa_m2 is 'Área privativa em m².';
comment on column adr.unidade.vista_mar is 'Se a unidade tem vista para o mar.';
comment on column adr.unidade.preco_tabela is 'Preço de tabela no lançamento, em R$.';

create table adr.imobiliaria (
  id     smallint primary key,
  nome   text not null unique,
  cidade text not null
);
comment on table adr.imobiliaria is 'Imobiliárias parceiras.';
comment on column adr.imobiliaria.id is 'Código da imobiliária.';
comment on column adr.imobiliaria.nome is 'Nome da imobiliária.';
comment on column adr.imobiliaria.cidade is 'Cidade da imobiliária.';

create table adr.corretor (
  id             smallint primary key,
  nome           text not null,
  creci          text unique,
  imobiliaria_id smallint references adr.imobiliaria,
  data_inicio    date not null
);
comment on table adr.corretor is 'Corretores. O id 1 é Venda direta (a ADR vendeu sem corretor).';
comment on column adr.corretor.id is 'Código do corretor.';
comment on column adr.corretor.nome is 'Nome do corretor, como no cadastro oficial.';
comment on column adr.corretor.creci is 'Registro no CRECI; nulo na Venda direta.';
comment on column adr.corretor.imobiliaria_id is 'Imobiliária do corretor; nulo para autônomo e Venda direta.';
comment on column adr.corretor.data_inicio is 'Início da parceria com a ADR.';

-- ---------- Funil ----------

create table adr.lead (
  id                int primary key,
  nome              text not null,
  telefone          text check (telefone ~ '^\+55[0-9]{10,11}$'),
  email             text,
  cidade            text,
  canal             text not null check (canal in ('instagram', 'site', 'whatsapp', 'tiktok', 'imobiliaria', 'indicacao', 'evento', 'outro')),
  empreendimento_id smallint not null references adr.empreendimento,
  corretor_id       smallint references adr.corretor,
  data_entrada      timestamp not null,
  data_visita       date,
  data_proposta     date,
  etapa             text not null check (etapa in ('novo', 'visita', 'proposta', 'venda', 'perdido')),
  motivo_perda      text
);
comment on table adr.lead is 'Leads do CRM, já sem duplicatas (R1): uma linha por pessoa interessada.';
comment on column adr.lead.id is 'Código do lead no CRM.';
comment on column adr.lead.nome is 'Nome da pessoa.';
comment on column adr.lead.telefone is 'Telefone em E.164 (+55 DDD número); nulo se o CRM trouxe um formato desconhecido.';
comment on column adr.lead.email is 'E-mail; nulo se veio vazio ou inválido (R6).';
comment on column adr.lead.cidade is 'Cidade da pessoa.';
comment on column adr.lead.canal is 'Canal de origem, padronizado pelo R3; outro quando o texto não foi reconhecido.';
comment on column adr.lead.empreendimento_id is 'Empreendimento de interesse.';
comment on column adr.lead.corretor_id is 'Corretor que atendeu; nulo se ninguém atendeu.';
comment on column adr.lead.data_entrada is 'Data e hora em que o lead entrou no CRM.';
comment on column adr.lead.data_visita is 'Dia da visita ao stand ou ao decorado.';
comment on column adr.lead.data_proposta is 'Dia da proposta.';
comment on column adr.lead.etapa is 'Etapa do funil: novo, visita, proposta, venda ou perdido.';
comment on column adr.lead.motivo_perda is 'Por que o lead foi perdido.';

create table adr.cliente (
  id      int primary key,
  lead_id int not null unique references adr.lead,
  nome    text not null,
  cidade  text,
  uf      char(2),
  perfil  text not null check (perfil in ('investidor', 'morador'))
);
comment on table adr.cliente is 'Clientes: o lead que comprou. Um lead vira no máximo um cliente.';
comment on column adr.cliente.id is 'Código do cliente.';
comment on column adr.cliente.lead_id is 'Lead de origem no CRM.';
comment on column adr.cliente.nome is 'Nome do cliente.';
comment on column adr.cliente.cidade is 'Cidade do cliente.';
comment on column adr.cliente.uf is 'UF do cliente.';
comment on column adr.cliente.perfil is 'investidor ou morador.';

-- ---------- Vendas e recebíveis ----------

create table adr.venda (
  id            int primary key,
  unidade_id    int not null references adr.unidade,
  cliente_id    int not null references adr.cliente,
  corretor_id   smallint not null references adr.corretor,
  data_venda    date not null,
  valor_venda   numeric(12, 2) not null check (valor_venda > 0),
  desconto_pct  numeric(5, 2) not null check (desconto_pct between 0 and 100),
  status        text not null check (status in ('ativa', 'distratada')),
  data_distrato date,
  check ((status = 'distratada') = (data_distrato is not null))
);
create unique index venda_uma_ativa_por_unidade on adr.venda (unidade_id) where status = 'ativa';
comment on table adr.venda is 'Vendas (contratos). Distratada continua aqui, com status e data do distrato.';
comment on column adr.venda.id is 'Número do contrato.';
comment on column adr.venda.unidade_id is 'Unidade vendida.';
comment on column adr.venda.cliente_id is 'Cliente que comprou.';
comment on column adr.venda.corretor_id is 'Corretor da venda (1 = Venda direta).';
comment on column adr.venda.data_venda is 'Dia da assinatura.';
comment on column adr.venda.valor_venda is 'Valor do contrato, em R$, já com o desconto.';
comment on column adr.venda.desconto_pct is 'Desconto sobre a tabela corrigida, em pontos percentuais (3,26 = 3,26%).';
comment on column adr.venda.status is 'ativa ou distratada.';
comment on column adr.venda.data_distrato is 'Dia do distrato; preenchida se, e só se, a venda está distratada.';

create table adr.parcela (
  id         int primary key,
  venda_id   int not null references adr.venda,
  numero     smallint not null,
  tipo       text not null check (tipo in ('sinal', 'mensal', 'balao', 'chaves')),
  vencimento date not null,
  valor      numeric(12, 2) not null check (valor > 0),
  unique (venda_id, numero)
);
comment on table adr.parcela is 'Parcelas a receber de cada venda (plano de pagamento do ERP).';
comment on column adr.parcela.id is 'Código da parcela no ERP.';
comment on column adr.parcela.venda_id is 'Venda da parcela.';
comment on column adr.parcela.numero is 'Número da parcela dentro da venda.';
comment on column adr.parcela.tipo is 'sinal, mensal, balao (anual) ou chaves.';
comment on column adr.parcela.vencimento is 'Dia do vencimento.';
comment on column adr.parcela.valor is 'Valor da parcela, em R$.';

create table adr.pagamento (
  id             int primary key,
  parcela_id     int not null references adr.parcela,
  data_pagamento date not null,
  valor_pago     numeric(12, 2) not null check (valor_pago > 0)
);
comment on table adr.pagamento is 'Pagamentos (baixas do ERP). Uma parcela pode ter zero ou mais, inclusive parciais.';
comment on column adr.pagamento.id is 'Código da baixa no ERP.';
comment on column adr.pagamento.parcela_id is 'Parcela paga.';
comment on column adr.pagamento.data_pagamento is 'Dia do pagamento.';
comment on column adr.pagamento.valor_pago is 'Valor pago, em R$.';

create table adr.meta_mensal (
  empreendimento_id smallint not null references adr.empreendimento,
  mes               date not null check (extract(day from mes) = 1),
  meta_unidades     smallint not null check (meta_unidades >= 0),
  primary key (empreendimento_id, mes)
);
comment on table adr.meta_mensal is 'Meta de unidades vendidas por empreendimento e mês (planilha da diretoria).';
comment on column adr.meta_mensal.empreendimento_id is 'Empreendimento da meta.';
comment on column adr.meta_mensal.mes is 'Mês da meta (sempre o dia 1).';
comment on column adr.meta_mensal.meta_unidades is 'Unidades que a diretoria quer vender no mês.';

-- índices nas FKs e nas datas que os filtros do painel usam
create index on adr.unidade (empreendimento_id);
create index on adr.corretor (imobiliaria_id);
create index on adr.lead (empreendimento_id);
create index on adr.lead (corretor_id);
create index on adr.lead (data_entrada);
create index on adr.venda (cliente_id);
create index on adr.venda (corretor_id);
create index on adr.venda (data_venda);
create index on adr.parcela (vencimento);
create index on adr.pagamento (parcela_id);

-- ---------- Auditoria ----------

create table auditoria.relatorio_qualidade (
  regra           text not null,
  origem          text not null,
  descricao       text not null,
  linhas_afetadas int not null,
  acao            text not null
);
comment on table auditoria.relatorio_qualidade is 'Uma linha por regra e ação: quantas linhas cada regra do pipeline tratou.';
comment on column auditoria.relatorio_qualidade.regra is 'Regra de tratamento (R1 a R7).';
comment on column auditoria.relatorio_qualidade.origem is 'Arquivo bruto de onde vieram as linhas.';
comment on column auditoria.relatorio_qualidade.descricao is 'O que a regra fez, em português.';
comment on column auditoria.relatorio_qualidade.linhas_afetadas is 'Quantas linhas a regra tratou.';
comment on column auditoria.relatorio_qualidade.acao is 'corrigido, convertido, mesclado, nulo, outro, relatado, quarentena ou cascata (foi junto com uma linha em quarentena).';

create table auditoria.quarentena (
  id       int primary key,
  origem   text not null,
  regra    text not null,
  registro jsonb not null,
  motivo   text not null
);
comment on table auditoria.quarentena is 'Linhas barradas pelo pipeline, inteiras, com a regra e o motivo. Nada some em silêncio.';
comment on column auditoria.quarentena.id is 'Ordem em que a linha foi barrada.';
comment on column auditoria.quarentena.origem is 'Arquivo bruto e tabela da linha (ex.: erp_baixas.csv · pagamento).';
comment on column auditoria.quarentena.regra is 'Regra que barrou; na cascata, a regra da linha de que ela dependia.';
comment on column auditoria.quarentena.registro is 'A linha inteira, como JSON.';
comment on column auditoria.quarentena.motivo is 'Por que a linha foi barrada.';
