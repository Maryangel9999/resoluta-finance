# Resoluta Finance — MVP

Breve: projeto full-stack com Node.js + SQLite e uma SPA front-end para o site institucional da Resoluta AGI + Resoluta Finance.

## Requisitos
- Node.js >= 18
- npm

## Instalação
1. `git clone <repositório>`
2. `cd resoluta-finance`
3. `npm install`
4. Crie um arquivo `.env` a partir de `.env.example`
5. `mkdir -p data`
6. `npm run migrate`
7. `npm start`
8. Acesse `http://localhost:3000`

## Variáveis de ambiente
- `PORT`: porta do servidor
- `JWT_SECRET`: chave secreta para autenticação
- `OPENAI_API_KEY`: opcional; habilita assistente IA com OpenAI

## Scripts
- `npm start` — inicia o servidor
- `npm run dev` — inicia em modo watch com nodemon
- `npm run migrate` — cria o banco SQLite
- `npm test` — executa testes

## Estrutura
- `server.js` — API Express + rotas principais
- `migrations/init_db.js` — criação do banco
- `public/` — front-end
- `data/` — banco e arquivos locais

## Principais rotas
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/markup/calc`
- `GET /api/reports/transactions.csv`
- `POST /api/ai`

## Observações de segurança
- Não use `JWT_SECRET` padrão em produção.
- NUNCA exponha chaves sensíveis no front-end.
- Publique sempre via HTTPS.

## Próximos passos recomendados
- implementar autenticação completa com e-mail e recuperação de senha
- melhorar a UI com framework moderno (React/Vue)
- adicionar testes automatizados e E2E
- configurar hospedagem e domínio
- expandir relatórios, metas e IA para uso real

## Observação
Este repositório contém um MVP funcional e seguro para desenvolvimento local, com foco em uma primeira versão do site institucional e das ferramentas financeiras da Resoluta AGI + Resoluta Finance.
