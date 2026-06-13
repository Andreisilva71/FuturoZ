// @ts-check
const { test, expect } = require('@playwright/test');
const { testEmail, completarQuiz } = require('./helpers');

const RES_EMAIL = testEmail('resultados');
const RES_SENHA = 'resultados@E2E123';

const completarTodoOQuiz = completarQuiz;

test.describe('Resultados e Análise IA', () => {
  test.beforeAll(async ({ request }) => {
    await request.post('/api/cadastro', {
      data: { nome: 'Resultados User', email: RES_EMAIL, senha: RES_SENHA },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('usuario'));
    await page.evaluate(() => window.navegarPara('login'));
    await page.fill('#login-email', RES_EMAIL);
    await page.fill('#login-senha', RES_SENHA);
    await page.click('form#form-login button[type="submit"]');
    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
  });

  test('tela de loading aparece ao finalizar quiz', async ({ page }) => {
    await completarTodoOQuiz(page);
    await expect(page.locator('#loading-ia')).not.toHaveClass('escondido');
  });

  test('conteudo-resultados exibe aba Visão Geral com estatísticas', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    // Estatísticas devem ter 3 cards
    const estatisticas = page.locator('.estatistica-card');
    await expect(estatisticas).toHaveCount(3);
    await expect(estatisticas.first()).toContainText('%');
  });

  test('gráficos Chart.js são renderizados na aba Visão Geral', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await expect(page.locator('#perfilChart')).toBeVisible();
    await expect(page.locator('#forcasChart')).toBeVisible();
  });

  test('aba Carreiras exibe 3 itens com match e skills', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await page.click('button:has-text("Carreiras")');
    await expect(page.locator('.carreira-item')).toHaveCount(3);
    await expect(page.locator('.carreira-match').first()).toContainText('%');
    await expect(page.locator('.skill-tag').first()).toBeVisible();
  });

  test('aba Insights exibe 2 cards de insight', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await page.click('button:has-text("Insights")');
    const insights = page.locator('#tab-insights .card');
    await expect(insights).toHaveCount(2);
  });

  test('navegação entre abas Visão Geral → Carreiras → Insights funciona', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await page.click('button:has-text("Carreiras")');
    await expect(page.locator('#tab-carreiras')).toHaveClass(/ativo/);

    await page.click('button:has-text("Insights")');
    await expect(page.locator('#tab-insights')).toHaveClass(/ativo/);

    await page.click('button:has-text("Visão Geral")');
    await expect(page.locator('#tab-visao-geral')).toHaveClass(/ativo/);
  });

  test('botão Refazer questionário retorna ao quiz', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await page.click('text=Refazer questionário');
    await expect(page.locator('#pagina-quiz')).not.toHaveClass('escondido');
  });

  test('botão Voltar ao início retorna à landing', async ({ page }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    await page.click('text=Voltar ao início');
    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
  });

  test('resultado é salvo no histórico após análise', async ({ page, request }) => {
    await completarTodoOQuiz(page);
    await page.waitForSelector('#conteudo-resultados:not(.escondido)', { timeout: 15_000 });

    // Retrieve user id from localStorage
    const usuario = await page.evaluate(() => JSON.parse(localStorage.getItem('usuario') || '{}'));
    expect(usuario.id).toBeTruthy();

    const res = await request.get(`/api/historico/${usuario.id}`);
    expect(res.ok()).toBe(true);
    const historico = await res.json();
    expect(historico.length).toBeGreaterThan(0);
  });
});
