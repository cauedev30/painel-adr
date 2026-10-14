# Painel de Dados ADR

> **Projeto conceitual de candidatura · dados simulados.** Não é material oficial da ADR
> Empreendimentos. Os nomes e fatos públicos dos empreendimentos vêm do site da empresa; todos os
> números são simulados.

Painel de dados **comercial e de recebíveis** pensado para a ADR Empreendimentos, construtora de
compactos de alto padrão em João Pessoa (PB). Ele mostra o que um analista de dados faria lá dentro
para a diretoria: juntar o que vem do CRM, da planilha do comercial e do ERP financeiro, tratar e
validar esses dados num banco PostgreSQL e transformar tudo em respostas claras.

**Status:** em construção. O desenho completo está em [`docs/spec.md`](docs/spec.md).

## Do dado à resposta

```mermaid
flowchart TD
  SIM["No projeto, os 3 sistemas são simulados<br/>gerar_dados.py cria a verdade e suja do jeito de cada um"]

  subgraph ORIGEM["① ONDE O DADO NASCE · 3 sistemas que não conversam"]
    direction LR
    CRM["CRM<br/>leads do site, WhatsApp<br/>e Instagram"] ~~~ PLAN["Planilha do comercial<br/>vendas e corretores"] ~~~ ERP["ERP financeiro<br/>parcelas e pagamentos"]
  end

  subgraph PIPE["② PIPELINE · python pipeline.py · PREPARA"]
    direction LR
    LER["1 · Ler<br/>cada arquivo vira<br/>um DataFrame"] --> TRATAR["2 · Tratar<br/>padroniza e junta"] --> VALIDAR["3 · Validar<br/>confere; se falhar, para"] --> CARREGAR["4 · Carregar<br/>no banco"]
  end

  subgraph BANCO["③ BANCO POSTGRESQL · GUARDA E RESPONDE VIA SQL"]
    direction LR
    TAB["10 tabelas limpas"] ~~~ AUD["Relatório de qualidade<br/>e quarentena"]
  end

  subgraph PAINEL["④ PAINEL · MOSTRA"]
    direction LR
    TELAS["6 telas<br/>com os KPIs"] ~~~ VERSQL["Ver SQL<br/>a consulta de cada gráfico"] ~~~ CONSOLE["Console SQL<br/>para testar ao vivo"]
  end

  DIR(["DIRETORIA · pergunta → resposta → decisão"])

  SIM -.-> ORIGEM
  ORIGEM -- "exports bagunçados" --> PIPE
  PIPE -- "dados confiáveis" --> BANCO
  BANCO -- "consultas SQL" --> PAINEL
  PAINEL -- "insights" --> DIR
```

## Stack

Python (Pandas, NumPy, Matplotlib) · PostgreSQL rodando no navegador com PGlite · React, Vite e
TypeScript · ECharts · publicação automática no GitHub Pages.

---

Por Cauê Franco.
