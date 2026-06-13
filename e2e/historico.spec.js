// @ts-check
const { test, expect } = require('@playwright/test');
const { testEmail } = require('./helpers');

const HIST_EMAIL_NOVO = testEmail('historico_novo');
const HIST_EMAIL_EXISTENTE = testEmail('historico_existente');
const HIST_SENHA = 'historico@E2E123';

test.describe('Histórico', () => {
  test.beforeAll(async ({ request }) => {
    // User with no analyses
    await request.post('/api/cadastro', {
      data: { nome: 'Hist Novo', email: HIST_EMAIL_NOVO, senha: HIST_SENHA },
    });
    // User that will have at least one analysis (inserted via API)
    const res = await request.post('/api/cadastro', {
      data: { nome: 'Hist Existente', email: HIST_EMAIL_EXISTENTE, senha: HIST_SENHA },
    });
    const user = await res.json();

    // Insert mock analysis in database via API
    await request.post('/api/analisar-perfil', {
      data: {
        usuario_id: user.id,
        respostas: { q1: 'Liderança' },
      },
    });
  });

  async function loginComo(page, email, senha) {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('usuario'));
    await page.evaluate(() => window.navegarPara('login'));
    await page.fill('#login-email', email);
    await page.fill('#login-senha', senha);
    await page.click('form#form-login button[type="submit"]');
    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
  }

  test('usuário sem análises vê #historico-vazio', async ({ page }) => {
    await loginComo(page, HIST_EMAIL_NOVO, HIST_SENHA);
    await page.evaluate(() => window.abrirHistorico());
    await expect(page.locator('#pagina-historico')).not.toHaveClass('escondido');
    await expect(page.locator('#historico-vazio')).not.toHaveClass('escondido');
  });

  test('botão Começar Questionário em histórico vazio vai para quiz', async ({ page }) => {
    await loginComo(page, HIST_EMAIL_NOVO, HIST_SENHA);
    await page.evaluate(() => window.abrirHistorico());
    await page.click('#historico-vazio .btn-primario');
    // Quiz requires login — already logged in so goes directly
    await expect(page.locator('#pagina-quiz')).not.toHaveClass('escondido');
  });

  test('usuário com análise vê #lista-historico com cards', async ({ page }) => {
    await loginComo(page, HIST_EMAIL_EXISTENTE, HIST_SENHA);
    await page.evaluate(() => window.abrirHistorico());
    await expect(page.locator('#pagina-historico')).not.toHaveClass('escondido');
    await page.waitForSelector('#lista-historico .card', { timeout: 8_000 });
    const cards = page.locator('#lista-historico .card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicar em card de histórico exibe conteudo-resultados', async ({ page }) => {
    await loginComo(page, HIST_EMAIL_EXISTENTE, HIST_SENHA);
    await page.evaluate(() => window.abrirHistorico());
    await page.waitForSelector('#lista-historico .card', { timeout: 8_000 });
    await page.locator('#lista-historico .card').first().click();
    await expect(page.locator('#conteudo-resultados')).not.toHaveClass('escondido');
  });
});
