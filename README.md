# RESOLUTA FINANCE

Aplicativo financeiro para microempresas e pequenos negócios.

## Visão geral
A RESOLUTA FINANCE é a vertical financeira da RESOLUTA AGI. O objetivo é ajudar empreendedores a controlar receitas, despesas, lucros, custos, formação de preços e indicadores financeiros de forma simples e acessível.

## Stack inicial
- React + TypeScript + Vite
- Tailwind CSS
- Vitest + Testing Library
- LocalStorage como persistência inicial

## Requisitos
- Node.js 18+
- npm

## Instalação
```bash
npm install
```

## Execução
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Testes
```bash
npm run test
```

## Limitações da versão inicial
- A persistência é local, em navegador, usando localStorage.
- Não há autenticação, banco de dados ou backend persistente ainda.
- A funcionalidade está focada na base de movimentações, filtros e cálculos financeiros básicos.

## Estrutura principal
```text
src/
  app/
  components/
  features/
    dashboard/
    movements/
    pricing/
  lib/
  test/
  types/
  utils/
```

## Próxima fase
- dashboard financeiro com KPIs e gráficos
- calculadora de markup e formação de preço
- produtos e serviços
- relatórios e análise financeira
- área educativa
- planos FREE/PRO
- integração com banco e autenticação em deploy posterior
