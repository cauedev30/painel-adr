# Spec — Painel de Dados ADR

Versão: 2026-10-14 · Autor: Cauê Franco · Status: desenho aprovado em conversa, aguardando releitura

## 0. Resumo

Painel de dados **comercial e de recebíveis** da ADR Empreendimentos (construtora de compactos de alto
padrão em João Pessoa – PB), feito como projeto de portfólio para a vaga de **Analista de Dados
Júnior**. Ele percorre o ciclo que a vaga descreve:

> modelo do banco (DER) → SQL de extração → limpeza e validação → painel com KPIs → conclusões escritas
> para a diretoria

Os 7 empreendimentos e os fatos públicos deles são reais (tirados de https://adrempreendimentos.com
em 2026-10-13). Todo o resto é simulado, com semente fixa. O banco é **PostgreSQL**: roda no navegador
pelo PGlite e é carregado no build a partir de dados tratados por um pipeline em Python.

## 1. Contexto e objetivo

### A dor (hipótese, a partir do site da ADR)

A ADR tem 4 empreendimentos lançados, 3 deles em obra, e 3 em pré-lançamento. Vende studios **na
planta, parcelados**, por **corretores parceiros** (cada página de empreendimento tem "Material para
Corretores"). Nesse modelo, três perguntas definem a saúde da empresa:

1. O lançamento está vendendo no ritmo certo? (VSO, estoque)
2. De onde vêm os compradores? (canal, corretor, imobiliária)
3. O dinheiro das parcelas está entrando? (recebíveis, inadimplência; a parcela ajuda a pagar a obra)

Os dados que respondem a essas perguntas nascem em sistemas que não conversam entre si: o CRM, a
planilha do comercial e o ERP financeiro. O painel mostra o trabalho de juntar essas fontes num banco
confiável e transformá-las em resposta para a diretoria.

### O que o projeto demonstra (mapa da vaga)

| Item da vaga | Onde aparece |
|---|---|
| Interpretar modelagem e DER | `sql/01_schema.sql` com o dicionário em `comment on`, o DER no README e a consulta `dados/der.sql` ao catálogo |
| SQL (intermediário a avançado, window functions) | `sql/consultas/`, no README e no repositório |
| Tratamento, limpeza e validação | Pipeline em Python, relatório de qualidade, quarentena, testes contra o gabarito |
| Dashboards interativos | 5 telas com filtros |
| KPIs | VGV, VSO, estoque, ticket médio, preço/m², inadimplência, conversão do funil |
| Comunicar insights | A frase-resposta de cada cartão |
| Estatística descritiva e outliers | Preço/m²: média, mediana, moda, desvio padrão, percentis, quartis e IQR no notebook e em `preco_m2_estatisticas.sql` e `preco_m2_distribuicao.sql` (fora do painel desde o D13) |
| Python (Pandas, NumPy, Matplotlib) | Pipeline e notebook |
| PostgreSQL | Banco real (PGlite), `.sql` em Postgres puro |
| Portfólio no GitHub | Repositório público e site no GitHub Pages |

Lacunas assumidas e adiadas: planilhas avançadas (xlsx com PROCX) e ferramenta de BI de mercado
(Power BI/DAX). Ver seção 11.

### O que é sucesso

- Um recrutador (ou o CEO da ADR, que não é técnico) abre o link e entende em 10 segundos o que está
  vendo; quem quiser o SQL de um número o acha em `sql/consultas/<tela>/<cartao>.sql`.
- Todo número do painel é reproduzível: mesma semente, mesmo resultado.
- O tratamento é comprovado por teste: o pipeline recupera a verdade que foi sujada.

## 2. Decisões

| # | Decisão | Por quê |
|---|---|---|
| D1 | App web estático (React + Vite + TypeScript) | Visual com a identidade da ADR, link público, sem servidor |
| D2 | Banco PostgreSQL via **PGlite** (`@electric-sql/pglite`), no build e no navegador | A vaga cita PostgreSQL; PGlite é o próprio Postgres em WASM. Substituiu o DuckDB-WASM em 2026-10-14 |
| D3 | Tema: comercial + recebíveis | É onde estão as três perguntas da diretoria |
| D4 | Dados simulados com os 7 empreendimentos reais | Não há dado interno; nomes e fatos públicos dão realismo |
| D5 | Simulação em duas etapas: "verdade" limpa, depois sujeira com gabarito | Permite testar se o tratamento recuperou a verdade |
| D6 | Repositório público `cauedev30/painel-adr` e site em `cauedev30.github.io/painel-adr` | Diferencial "portfólio no GitHub"; link para enviar ao recrutador |
| D7 | Marca ADR (logo, cores, nomes) com selo "Projeto conceitual de candidatura · dados simulados" e "por Cauê Franco" com link para o repositório | Feito para a ADR, sem parecer dado vazado nem uso oficial da marca |
| D8 | Só tema escuro | É a identidade da ADR; um tema claro dobraria o acabamento |
| D9 | ~~O "Ver SQL" mostra o mesmo arquivo `.sql` que o gráfico executa~~ Revogada por D12 | O painel roda o arquivo de `sql/consultas/` tal como está no repositório |
| D10 | Publicação automática pelo GitHub Actions, bloqueada se qualquer teste falhar | O link enviado nunca quebra por mudança |
| D11 | Volume ajustado para ≈ 390 unidades e ≈ 280 vendas (antes estimado em 700 e 450) | Só 4 empreendimentos estão à venda; prédios de compactos têm 60 a 140 unidades |
| D13 | Painel mais intuitivo (2026-10-16): saem o KPI preço/m² e os cartões do boxplot e da estatística do preço/m², de vista mar e de distratos; VGV e VSO ganham o nome por extenso; os filtros viram 2 botões com ícone e resumo, que abrem um painel flutuante (atalhos de período de um clique e a lista de empreendimentos) | Mesma razão do D12: a apresentação ao CEO; menos cartões, termos claros e filtro de um clique |
| D12 | Painel enxuto (2026-10-15): saem o "Ver SQL", o tempo da consulta, o Console SQL, o DER da tela Dados e "O que os dados dizem"; fica o "ver como tabela"; o nome sob o logo vira "Inteligência comercial" | A entrevista é presencial, com o CEO da ADR, que não é técnico; o SQL continua no repositório, no README e no notebook |

## 3. Dados

### 3.1 O que é real (site da ADR, verificado em 2026-10-13)

| Empreendimento | Bairro, cidade | Status no site | Entrega | Faixa de área |
|---|---|---|---|---|
| Mares Cabo Branco | Cabo Branco, João Pessoa | Entregue | ago/2025 | 16,43 a 39,15 m² |
| Mares Seaside | Bessa, João Pessoa | Em construção | jan/2028 | 18,20 a 27,55 m² |
| Mares Seaview | Jardim Oceania, João Pessoa | Em construção | mar/2028 | 18,50 a 21,81 m² |
| Mares Bessa | Bessa, João Pessoa | Em construção | fev/2029 | 18,03 a 33,04 m² · 102 unidades |
| Mares Sense | Cabo Branco, João Pessoa | Pré-lançamento | — | 18,50 a 21,81 m² |
| Mares Blanc | Intermares, Cabedelo | Pré-lançamento | 2029 | 19 a 118 m² |
| Nexus One | não informado | Pré-lançamento | — | não informado |

Também reais: tipologias (studios, duplex, garden com área externa), slogan "Ousadia que constrói
valor", venda por corretores. Logo e fotos vêm do site.

### 3.2 O que é simulado (semente fixa)

- **Unidades** só nos 4 lançados: Cabo Branco 60, Seaside 132, Seaview 96, Bessa 102 (real) → 390.
  Os 3 em pré-lançamento têm só leads (lista de interesse).
- **Lançamentos:** Cabo Branco fev/2023, Seaside mar/2024, Seaview set/2024, Bessa ago/2025.
  Captação de interesse: Blanc a partir de mar/2026, Sense mai/2026, Nexus One jun/2026.
- **Janela:** jan/2023 a 30/09/2026 (data de corte).
- **Preço de tabela:** base por m² por empreendimento (R$ 14.200 a R$ 15.500 no lançamento),
  reajuste de 0,6% ao mês, +12% com vista mar, +0,8% por andar, +5% duplex ou garden.
- **Plano de pagamento:** sinal de 10% (1 a 3 vezes), 20% em mensais até a entrega, balões anuais
  somando 10% (em dezembro) e 60% nas chaves (entrega).
- **Funil:** lead → visita ≈ 12%, visita → proposta ≈ 35%, proposta → venda ≈ 45%; ≈ 15 mil leads
  geram ≈ 280 vendas.
- **Canais:** Instagram, site (formulário), WhatsApp, TikTok, imobiliária, indicação, evento.
- **Corretores:** ≈ 35 corretores em 8 imobiliárias, mais autônomos e "Venda direta" (a própria ADR).
- **Pagamento:** cada cliente tem um perfil de risco; atrasos e inadimplência saem desse perfil;
  ≈ 5% das vendas viram distrato, mais provável depois de atrasos longos.

**Padrões plantados** para a análise ter o que mostrar (e assumidos como plantados no README):
canal de maior volume ≠ canal de maior conversão; concentração de vendas nos melhores corretores;
prêmio de preço e de velocidade para vista mar; inadimplência concentrada num empreendimento e em
vendas com desconto alto; distrato precedido de atraso acima de 60 dias.

### 3.3 Modelo (PostgreSQL, schema `adr`)

Conceitual: um empreendimento tem unidades e metas; corretores pertencem (ou não) a uma imobiliária e
atendem leads; um lead vira no máximo um cliente; uma venda liga unidade, cliente e corretor; uma
venda gera parcelas; uma parcela recebe zero ou mais pagamentos.

| Tabela | Colunas (tipo) | Restrições |
|---|---|---|
| `empreendimento` | id smallint, nome text, slug text, bairro text, cidade text, status text, data_lancamento date, previsao_entrega date | PK id; nome e slug únicos; status ∈ {pre_lancamento, em_obras, entregue} |
| `unidade` | id int, empreendimento_id smallint, codigo text, andar smallint, tipologia text, area_privativa_m2 numeric(6,2), vista_mar boolean, preco_tabela numeric(12,2) | FK empreendimento; codigo único; tipologia ∈ {studio, duplex, garden}; área e preço > 0 |
| `imobiliaria` | id smallint, nome text, cidade text | nome único |
| `corretor` | id smallint, nome text, creci text, imobiliaria_id smallint, data_inicio date | FK imobiliária (nula = autônomo); creci único |
| `lead` | id int, nome text, telefone text (E.164), email text, cidade text, canal text, empreendimento_id smallint, corretor_id smallint, data_entrada timestamp, data_visita date, data_proposta date, etapa text, motivo_perda text | FKs; canal ∈ lista fechada; etapa ∈ {novo, visita, proposta, venda, perdido} |
| `cliente` | id int, lead_id int, nome text, cidade text, uf char(2), perfil text | lead_id único; perfil ∈ {investidor, morador} |
| `venda` | id int, unidade_id int, cliente_id int, corretor_id smallint, data_venda date, valor_venda numeric(12,2), desconto_pct numeric(5,2), status text, data_distrato date | FKs; status ∈ {ativa, distratada}; data_distrato preenchida se e só se distratada; **índice único parcial** em unidade_id onde status = 'ativa' |
| `parcela` | id int, venda_id int, numero smallint, tipo text, vencimento date, valor numeric(12,2) | FK venda; (venda_id, numero) único; tipo ∈ {sinal, mensal, balao, chaves} |
| `pagamento` | id int, parcela_id int, data_pagamento date, valor_pago numeric(12,2) | FK parcela; valor > 0 (aceita pagamento parcial) |
| `meta_mensal` | empreendimento_id smallint, mes date, meta_unidades smallint | PK (empreendimento_id, mes); mes é dia 1 |

O status da unidade (disponível ou vendida) **não é guardado**, é calculado pela venda ativa, para não
haver dois lugares dizendo coisas diferentes. Isso é assunto de normalização para a entrevista.

Schema `auditoria`: `relatorio_qualidade` (regra, origem, descricao, linhas_afetadas, acao) e
`quarentena` (id, origem, regra, registro jsonb, motivo). Até a qualidade dos dados é consultável por
SQL.

Índices nas FKs e em `venda(data_venda)`, `parcela(vencimento)`, `lead(data_entrada)`.

### 3.4 Definições dos KPIs

| KPI | Definição |
|---|---|
| VGV vendido (líquido) | Soma de `valor_venda` das vendas do período menos as distratadas no período |
| VSO do mês | Unidades vendidas no mês ÷ (estoque no início do mês + unidades lançadas no mês) |
| Estoque | Unidades de empreendimentos lançados sem venda ativa |
| Ticket médio | Média de `valor_venda` das vendas do período |
| Preço por m² | `valor_venda` ÷ `area_privativa_m2` |
| Inadimplência | Valor vencido até a data de corte e não pago ÷ valor vencido até a data de corte |
| Faixas de atraso | Saldo em aberto por dias desde o vencimento: 1–30, 31–60, 61–90, mais de 90 |
| Conversão do funil | Leads que chegaram à etapa ÷ leads da etapa anterior |
| Realizado × meta | Unidades vendidas no mês ÷ `meta_unidades` |

### 3.5 As três fontes simuladas e a sujeira

A verdade é exportada no formato de cada sistema para `dados/brutos/`:

| Arquivo | Sistema simulado | Formato |
|---|---|---|
| `crm_leads.csv` | CRM | `;`, UTF-8, datas `dd/mm/aaaa hh:mm`, telefone e canal livres |
| `comercial_espelho.xlsx` | Planilha do comercial | unidades, preço de tabela, vendas e distratos digitados à mão |
| `comercial_parceiros.xlsx` | Planilha do comercial | corretores e imobiliárias |
| `erp_parcelas.csv` | ERP financeiro | Latin-1, valor como texto `R$ 1.234,56`, datas ISO |
| `erp_baixas.csv` | ERP financeiro | pagamentos, mesmo formato |
| `diretoria_metas.xlsx` | Diretoria | meta mensal por empreendimento |

As 7 regras de sujeira e tratamento. Cada uma grava no gabarito (`dados/gabarito.json`) quantas linhas
sujou e entra no relatório de qualidade com quantas linhas tratou:

| # | Sujeira | Origem | Tratamento |
|---|---|---|---|
| R1 | Leads duplicados, com telefone em formatos diferentes | CRM | Telefone normalizado para E.164; duplicata = mesmo telefone ou e-mail; fica o lead mais antigo, com as datas de etapa mais avançadas |
| R2 | Textos despadronizados: bairro ("C. Branco", "CABO BRANCO "), nome de corretor ("J. Silva") | CRM e planilha | Dicionário de bairros; nome de corretor casado com o cadastro por similaridade; casamento ambíguo vai para a quarentena |
| R3 | Canal em texto livre ("insta", "IG") | CRM | Dicionário de sinônimos; não reconhecido vira `outro` e é relatado |
| R4 | Datas misturadas e impossíveis (venda antes do lead, vencimento em 2099) | CRM e ERP | Leitura dos dois formatos; impossível vai para a quarentena |
| R5 | Valor como texto e outlier de digitação (um zero a mais no preço) | ERP e planilha | Conversão para número; outlier por IQR do preço/m² no empreendimento; se ÷10 cair na faixa, corrige e registra; senão, quarentena |
| R6 | Vazios: venda sem corretor, e-mail inválido | Planilha e CRM | Venda sem corretor vira "Venda direta"; e-mail inválido vira nulo e é contado |
| R7 | Pagamento ligado a parcela inexistente | ERP | Quarentena, nunca apagado em silêncio |

Acentos em Latin-1 são resolvidos na leitura (encoding correto), não por regra.

## 4. Pipeline (Python)

Um comando: `python pipeline.py`, com quatro etapas e um resumo no terminal.

1. **Ler:** os 6 arquivos com Pandas, cada um com o seu formato.
2. **Tratar:** R1 a R7, uma função por regra em `etl/tratar/`. Cada função recebe DataFrames e
   devolve DataFrames mais um registro (regra, origem, linhas afetadas, ação).
3. **Validar:** integridade antes de carregar (chaves, unicidade, faixas, uma venda ativa por
   unidade). Se a validação falhar, o pipeline para com a mensagem do que falhou e não carrega nada.
4. **Carregar:** grava `dados/limpos/*.csv` e as tabelas de auditoria e chama
   `node web/scripts/montar-banco.mjs`. Esse script abre o PGlite, roda `sql/01_schema.sql`, carrega os
   CSVs com `COPY`, roda `sql/02_views.sql` e `ANALYZE` e salva o banco pronto em
   `web/public/banco.tar.gz` (`dumpDataDir`).

A geração (`python gerar_dados.py`) é separada do pipeline: ela cria a verdade, a sujeira e o
gabarito. O pipeline só enxerga os brutos, como enxergaria na empresa. Os dois comandos são scripts
na raiz do repositório; o código fica no pacote `etl/`.

Notebook `notebooks/tour-do-pipeline.ipynb`: percorre as regras mostrando o antes e o depois, com
gráficos em Matplotlib. Código simples, comentado em português.

## 5. SQL

- `sql/01_schema.sql`: modelo físico (seção 3.3).
- `sql/02_views.sql`: `adr.vw_venda` (venda com unidade, empreendimento, corretor e preço/m²) e
  `adr.vw_carteira` (parcela com saldo em aberto, dias de atraso e faixa).
- `sql/consultas/<tela>/<cartao>.sql`: uma consulta por cartão. Parâmetros:
  `$1` início do período, `$2` fim do período, `$3` empreendimento (nulo = todos).

Recursos de SQL que o conjunto exibe de propósito: CTEs, `RANK`, `LAG`, `SUM … OVER` (acumulado),
`AVG … OVER` (média móvel), `percentile_cont … WITHIN GROUP`, `mode() WITHIN GROUP`, `stddev_samp`,
`COUNT(*) FILTER`, `date_trunc`, `generate_series` (meses sem venda aparecem com zero), `CASE` para
faixas, consulta ao catálogo (`information_schema`) para gerar o DER.

## 6. Painel

### 6.1 Telas

1. **Visão geral:** faixa com foto noturna de um Mares; 5 KPIs grandes em 3 + 2 (VGV vendido, VSO,
   estoque, ticket médio, inadimplência; VGV e VSO com o nome por extenso), cada um com variação contra
   o período anterior (▲/▼ com texto); vendas mensais com a linha da meta.
2. **Vendas e estoque:** cartão por empreendimento (foto, status, barra vendido × estoque, VSO);
   ritmo de vendas acumulado desde o lançamento, um gráfico pequeno por empreendimento. (O boxplot e a
   tabela de estatísticas do preço/m² e a vista mar saíram pelo D13.)
3. **Funil e corretores:** funil horizontal com conversão entre etapas; leads e conversão por canal;
   ranking de corretores com variação de posição contra o mês anterior.
4. **Recebíveis:** KPIs (a receber em 12 meses, recebido no mês, inadimplência); previsto × recebido
   por mês; saldo por faixa de atraso; mapa de calor empreendimento × faixa; inadimplência por
   empreendimento e por desconto. (Os distratos saíram pelo D13.)
5. **Dados:** relatório de qualidade em cartões "antes → depois"; o que é real e o que é simulado.
   (O DER e o Console SQL saíram do painel pelo D12; os `.sql` deles ficam no repositório.)

### 6.2 Componentes comuns

- **Cartão:** título-pergunta, frase-resposta calculada dos dados, gráfico e "ver como tabela".
- **Filtros:** 2 botões no topo, com ícone e o filtro ativo ("out 25 – set 26", "Todos"); valem para
  todos os cartões da tela. Cada um abre um painel flutuante: o período com os atalhos "Últimos 12
  meses", "Este ano" e "Tudo" e a grade de meses (um ano por vez; 1º clique no início, 2º no fim, o
  intervalo em cobre; meses fora dos dados apagados); o empreendimento, numa lista. Fecha com Esc, clique fora ou ao
  escolher.
- **Balão ao passar o mouse:** valor exato em formato brasileiro (R$ 12,4 mi; 8,1%; 30/09/2026).
- **Tela de carregamento:** logo ADR e "Carregando o banco PostgreSQL no seu navegador…".

### 6.3 Identidade visual

- **Tema escuro único.** Fundo quase preto, superfícies em carvão, texto branco e cinzas.
- **Destaque:** cobre (das peças do evento "Ousadia que constrói valor"); dourado quente só em
  seleção e foco.
- **Tipografia:** títulos em Lexend Zetta (caixa alta, espaçada, no lugar da Brinnan, que é paga);
  textos e números em Lexend Deca (a do site). Ambas com licença OFL, servidas pelo próprio site.
- **Gráficos:** um destaque por gráfico (cobre) e o resto em cinza; comparação dos 7 empreendimentos
  em gráficos pequenos lado a lado, não em 7 cores; faixas de atraso numa rampa de um tom só (do mais
  claro em 1–30 ao mais intenso em mais de 90), com rótulo e ícone, nunca só a cor; um eixo por
  gráfico; legenda sempre que houver 2 séries ou mais. Toda paleta passa pelo validador da skill
  `dataviz` contra a superfície escura antes de entrar.
- **Estrutura:** barra lateral (logo ADR com "Inteligência comercial", as 5 telas e, no rodapé, o selo "Projeto conceitual de
  candidatura · dados simulados" e "por Cauê Franco", com link para https://github.com/cauedev30/painel-adr);
  faixa superior com o nome da tela, os filtros e "dados até 30/09/2026".
- **Celular:** tudo empilha e continua legível.
- **Movimento (2026-10-15):** ao trocar de tela, cada bloco entra com fade e sobe 6 px (320 ms), em
  cascata de 40 ms, e os KPIs entram um a um; o título da tela troca com fade; depois da entrada do
  cartão (320 ms), toda barra cresce do eixo em 600 ms (a deitada da esquerda, a em pé de baixo), 30 ms
  uma depois da outra (no máximo 300 ms de atraso), e toda linha se desenha da esquerda, no mesmo ritmo
  da barra vendido × estoque. Trocar o filtro não refaz a entrada da tela: as barras mudam em 400 ms.
  Os tempos estão em `tokens.css` e em `animacaoDosGraficos` (`tema/echarts.ts`).
- **Acessibilidade:** contraste AA no texto; foco visível; navegação por teclado; tabela por gráfico;
  com "reduzir movimento" ligado no sistema, nada anima (nem o CSS nem o ECharts).

## 7. Arquitetura e stack

```
pipeline (Python)  →  banco (PostgreSQL/PGlite, salvo em banco.tar.gz)  →  painel (React, PGlite no navegador)
```

```
painel-adr/
├── gerar_dados.py     gera a verdade, a sujeira e o gabarito
├── pipeline.py        ler → tratar → validar → carregar
├── etl/               gerar/, ler.py, tratar/ (R1–R7), validar.py, carregar.py
├── tests/             pytest
├── requirements.txt
├── sql/               01_schema.sql, 02_views.sql, consultas/<tela>/<cartao>.sql
├── dados/             brutos/ (versionados), gabarito.json; limpos/ (gerado, ignorado)
├── notebooks/         tour-do-pipeline.ipynb
├── web/               React + Vite + TypeScript; scripts/montar-banco.mjs; public/banco.tar.gz (gerado)
├── docs/              spec.md, imagens do README
└── .github/workflows/ ci-e-publicacao.yml
```

| Ferramenta | Para quê | Por que ela |
|---|---|---|
| Python, Pandas, NumPy | Gerar e tratar os dados | Citados na vaga |
| Faker (pt-BR) | Nomes, telefones e e-mails brasileiros realistas | Dado simulado com cara de dado real |
| Matplotlib | Gráficos do notebook | Citado na vaga |
| pytest | Testes do pipeline | Padrão em Python |
| PostgreSQL (PGlite) | O banco, no build e no navegador | D2 |
| React + Vite + TypeScript | O painel | Site rápido e estático, sem servidor |
| ECharts | Gráficos | Boxplot, funil e mapa de calor prontos; tema próprio |
| Vitest | Testes das consultas | Roda os `.sql` no PGlite em Node |

Versões conferidas em 2026-10-14 (CodeMirror e Mermaid saíram com o D12): Python 3.12.7, Pandas 3.0.5, NumPy 2.5.2, Node 24.18; PGlite 0.5.9,
React 19.3, Vite 8.3, ECharts 6.1, Vitest 5.0, `@fontsource/lexend-zetta` e `@fontsource/lexend-deca` 5.3. Faker, pytest e Jupyter entram pelo
`requirements.txt`.

O PGlite roda num Web Worker para a tela não travar enquanto uma consulta executa. A versão do PGlite
é fixada (o `dumpDataDir` só é garantido entre as mesmas versões). O site é publicado com base
`/painel-adr/` e navegação por hash, para recarregar qualquer tela no GitHub Pages sem 404.

Metas de desempenho: primeira abertura em até 5 s numa conexão comum; cada consulta em até 300 ms.

## 8. Testes e critério de aceite

1. `python -m pytest` → verde. Inclui: cada regra R1–R7 trata exatamente o que o gabarito diz que foi
   sujado; a verdade gerada é coerente (uma venda ativa por unidade, parcelas somam o valor da venda,
   pagamentos não passam da parcela); o fim a fim, em que os dados limpos batem com a verdade fora do
   que foi para a quarentena.
2. `python gerar_dados.py && python pipeline.py` → termina com código 0 e imprime o resumo das 4
   etapas; gera `web/public/banco.tar.gz`.
3. `npm test` em `web/` → verde. Cada `.sql` de `sql/consultas/` roda no banco gerado e respeita
   invariantes: VGV por empreendimento soma o VGV total; faixas de atraso somam o vencido em aberto;
   funil é decrescente; os padrões plantados aparecem nos dados (exemplo: o canal de maior conversão
   não é o que traz mais leads).
4. `npm run build` → sem erro.
5. Checagem no navegador (`npm run preview`): as 5 telas abrem com dados; trocar filtro muda os
   números; "ver como tabela" mostra os números do cartão; nenhum erro no console do navegador;
   leitura conferida em 390 px de largura.
6. Notebook executa do zero: `jupyter nbconvert --to notebook --execute notebooks/tour-do-pipeline.ipynb`.
7. GitHub Actions verde no último commit da `main`, e `https://cauedev30.github.io/painel-adr/`
   responde 200 com a versão desse commit.

## 9. Publicação e README

O workflow `ci-e-publicacao.yml` roda a cada push na `main`: gera os dados, roda o pipeline, o pytest,
o Vitest e o build e publica no GitHub Pages. Se qualquer passo falhar, não publica.

README: o que é o projeto e a dor que resolve; como os dados chegam; o pipeline em uma frase; DER;
como rodar localmente; o que é real e o que é simulado (incluindo os padrões plantados); o selo.

## 10. Riscos

- **Uso da marca:** logo e fotos são da ADR; o selo deixa claro que o projeto é conceitual e os dados
  são simulados.
- **Tamanho do download:** PGlite (≈ 3,7 MB gzip) mais o banco; mitigado pela tela de carregamento e
  pelo cache do navegador.
- **Pandas 3:** strings e cópia têm comportamento novo; os testes cobrem as regras de tratamento.
- **Padrões plantados:** as conclusões são verdadeiras nos dados porque foram plantadas; o README diz
  isso, e numa base real a análise é que descobriria os padrões.

## 11. Fora de escopo (desta entrega)

- Relatório .xlsx com PROCX e aba para tabela dinâmica (lacuna 1, para depois do corpo pronto).
- Versão em Power BI e medidas DAX (lacuna 2, depois que o Cauê estudar BI).
- Tema claro, login, servidor, dados reais e correção monetária das parcelas por INCC.
