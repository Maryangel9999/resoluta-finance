# TODO — Resoluta AGI + Resoluta Finance

## 0. Análise do projeto existente
- [x] Clonar repositório e analisar código
- [x] Identificar stack (HTML/CSS/JS estático → GitHub Pages)
- [x] Identificar bugs (paths `css/styles.css` e `js/script.js` quebrados)
- [x] Extrair paleta da logo (bordo/vinho + dourado + marrom + bege)

## 1. Estrutura e identidade visual
- [x] Criar estrutura `css/`, `js/`, `icons/`
- [x] Mover `style.css` → `css/styles.css` e `script.js` → `js/script.js` (corrige paths)
- [x] Vendorizar bcryptjs (offline)
- [x] Gerar ícones PWA a partir do logo (bordo/dourado)
- [x] Reescrever CSS completo com identidade da marca (bordo/dourado)

## 2. Página inicial + nova seção de Planos
- [x] Reescrever index.html (landing recolorida + planos PF/PJ + app + legal + modais + VLibras)
- [x] Preservar TODAS as seções existentes (hero, soluções, benefícios, método, números, contato, CTA)
- [x] Seção de Planos (PF/PJ, Free/Pro, nota Premium futuro)
- [x] Botões "Começar Grátis" e "Assinar Pro" funcionais

## 3. App financeiro (dashboard)
- [x] Roteamento por hash (home ↔ app ↔ legal)
- [x] Dashboard com KPIs e gráficos (SVG)
- [x] Calculadora de markup (PRIORIDADE MÁXIMA)
- [x] Produtos e serviços (CRUD)
- [x] Lançamentos financeiros (CRUD + filtros + busca)
- [x] Fluxo de caixa
- [x] Contas a pagar/receber
- [x] Capital de giro / Ticket médio / Margem de contribuição / Margem de lucro / Ponto de equilíbrio
- [x] Diagnóstico financeiro
- [x] Planejamento e metas
- [x] Simulador de cenários
- [x] Relatórios + exportação CSV
- [x] Assistente de IA (baseado em regras)
- [x] Aprenda (módulos + quizzes)
- [x] Configurações

## 4. Conta e segurança
- [x] Cadastro/login/logout (bcryptjs)
- [x] Bloqueio após 3 tentativas
- [x] Recuperação de senha
- [x] Indicador de força de senha
- [x] Separação de dados por usuário
- [x] Políticas: Privacidade, Cookies, Termos

## 5. Acessibilidade
- [x] VLibras (widget oficial)
- [x] Tema claro/escuro, alto contraste, tamanho de fonte
- [x] Leitura em voz alta (SpeechSynthesis)
- [x] Navegação por teclado, ARIA, skip link
- [x] Redução de animações

## 6. PWA
- [x] manifest.webmanifest
- [x] Service worker (offline)
- [x] Ícones e instalação

## 7. Reconstrução do JavaScript (perdido no reset)
- [x] Escrever js/script.js completo (28 seções)
- [x] Validar sintaxe (node --check)
- [x] Corrigir bug: modal de autenticação não abria (early-return de `data-auth-tab` antes de `data-action="open-auth"`)

## 8. Testes e entrega
- [x] Testar cálculos (markup + guarda do divisor, capital de giro, ticket médio, MC, margem, PE, cenários)
- [x] Testar CRUD (produtos, lançamentos, contas + pago, metas) e persistência (localStorage)
- [x] Testar autenticação (bcrypt, 3 tentativas + bloqueio, login correto, logout)
- [x] Testar exportação CSV/JSON e importação de backup
- [x] Testar assistente, quizzes, planos PF/PJ, formulário de contato, banner de cookies, páginas legais
- [x] Testar acessibilidade (tema, contraste, fonte, leitura, movimento, leitura em voz alta)
- [x] Verificar ausência de erros no console em todas as rotas
- [x] Verificar PWA (manifest válido + service worker registrado)
- [x] Commit + push em branch de feature + PR (PR #3: https://github.com/Maryangel9999/resoluta-finance/pull/3)
