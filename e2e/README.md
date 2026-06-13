# Suíte de Testes End-to-End (E2E) - FuturoZ 🚀

Esta pasta contém os testes end-to-end do projeto **FuturoZ** utilizando a ferramenta **Playwright**. Os testes cobrem desde a interface visual (frontend) até os fluxos de requisição e persistência no banco de dados (backend).

---

## 🛠️ Pré-requisitos

Antes de executar os testes, certifique-se de que as dependências do projeto estejam instaladas e os navegadores de teste do Playwright estejam configurados:

```bash
# Instalar dependências do projeto
npm install

# Instalar navegadores do Playwright (Chromium)
npx playwright install chromium
```

---

## 🚀 Como Executar os Testes

Você pode rodar os testes utilizando os seguintes comandos no seu terminal na raiz do projeto:

### 1. Modo Silencioso (Headless)
Ideal para integração contínua (CI) ou verificações rápidas. Roda todos os testes em segundo plano e exibe o resumo no terminal:
```bash
npm run test:e2e
```

### 2. Modo Interativo (Interface UI)
**Recomendado para desenvolvimento/depuração.** Abre uma interface visual onde você pode selecionar testes individuais, assistir à execução em tempo real passo a passo, ver prints e analisar a linha do tempo (timeline):
```bash
npx playwright test --ui
```

### 3. Executar uma spec específica
Caso queira rodar apenas um arquivo de testes isoladamente:
```bash
# Roda apenas os testes de autenticação (Cadastro e Login)
npx playwright test e2e/auth.spec.js

# Roda apenas os testes das APIs REST
npx playwright test e2e/api.spec.js
```

---

## 📊 Relatório de Testes

Caso algum teste falhe, o Playwright grava automaticamente prints, vídeos do comportamento e rastreios (traces). Você pode abrir o relatório interativo HTML gerado no seu navegador com o seguinte comando:

```bash
npx playwright show-report
```

---

## 📂 Organização dos Testes

* `e2e/helpers.js`: Funções auxiliares compartilhadas pelos testes (login via UI, completamento do quiz, requisições de API).
* `e2e/api.spec.js`: Testes diretos das rotas da API REST backend.
* `e2e/auth.spec.js`: Testes do fluxo de login, cadastro, alternância de abas e validação de formulários.
* `e2e/landing.spec.js`: Testes da página inicial, seções de conteúdo, links e Dark Mode.
* `e2e/quiz.spec.js`: Testes da dinâmica de perguntas do questionário.
* `e2e/resultados.spec.js`: Testes da tela de resultados da IA, gráficos de match de carreiras e abas.
* `e2e/historico.spec.js`: Testes de visualização e abertura do histórico de análises salvas.
