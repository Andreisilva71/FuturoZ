// @ts-check
const { test, expect } = require('@playwright/test');
const { testEmail, navegarPara } = require('./helpers');

const QUIZ_EMAIL = testEmail('quiz');
const QUIZ_SENHA = 'quizSenha@123';

test.describe('Quiz', () => {
  test.beforeAll(async ({ request }) => {
    // Register a user to allow quiz access
    await request.post('/api/cadastro', {
      data: { nome: 'Quiz User', email: QUIZ_EMAIL, senha: QUIZ_SENHA },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear previous session
    await page.evaluate(() => localStorage.removeItem('usuario'));

    // Log in via the UI
    await page.evaluate(() => window.navegarPara('login'));
    await page.fill('#login-email', QUIZ_EMAIL);
    await page.fill('#login-senha', QUIZ_SENHA);
    await page.click('form#form-login button[type="submit"]');
    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
  });

  test('navega para pagina-quiz ao clicar Começar agora (logado)', async ({ page }) => {
    page.once('dialog', (d) => d.accept());
    await page.locator('#hero .btn-primario').first().click();
    await expect(page.locator('#pagina-quiz')).not.toHaveClass('escondido');
  });

  test('exibe contador "Pergunta 1 de 15" na primeira pergunta', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await expect(page.locator('#quiz-contador')).toContainText('Pergunta 1 de 15');
  });

  test('seleciona opção e marca .selecionado na opção clicada', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await page.waitForSelector('.opcao-btn');
    const primeira = page.locator('.opcao-btn').first();
    await primeira.click();
    await expect(primeira).toHaveClass(/selecionado/);
  });

  test('botão Próxima avança para pergunta 2', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await page.waitForSelector('.opcao-btn');
    await page.locator('.opcao-btn').first().click();
    await page.click('#btn-proxima');
    await expect(page.locator('#quiz-contador')).toContainText('Pergunta 2');
  });

  test('botão Voltar retorna para pergunta anterior', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await page.waitForSelector('.opcao-btn');
    await page.locator('.opcao-btn').first().click();
    await page.click('#btn-proxima');
    await expect(page.locator('#quiz-contador')).toContainText('Pergunta 2');
    await page.click('#btn-voltar');
    await expect(page.locator('#quiz-contador')).toContainText('Pergunta 1');
  });

  test('barra de progresso aumenta ao avançar pergunta', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await page.waitForSelector('.opcao-btn');

    const largura1 = await page.locator('#quiz-progresso').evaluate((el) =>
      parseFloat(el.style.width)
    );

    await page.locator('.opcao-btn').first().click();
    await page.click('#btn-proxima');

    const largura2 = await page.locator('#quiz-progresso').evaluate((el) =>
      parseFloat(el.style.width)
    );

    expect(largura2).toBeGreaterThan(largura1);
  });

  test('resposta é preservada ao voltar para pergunta anterior', async ({ page }) => {
    await page.evaluate(() => window.navegarPara('quiz'));
    await page.waitForSelector('.opcao-btn');

    const opcaoTexto = await page.locator('.opcao-btn').first().innerText();
    await page.locator('.opcao-btn').first().click();
    await page.click('#btn-proxima');

    // Slide 2 – answer it
    await page.waitForSelector('.opcao-btn');
    await page.locator('.opcao-btn').first().click();
    await page.click('#btn-voltar');

    // Back on slide 1 – first option should still be selected
    const selecionada = page.locator('.opcao-btn.selecionado');
    await expect(selecionada).toHaveCount(1);
    const textoSelecionado = await selecionada.innerText();
    expect(textoSelecionado).toContain(opcaoTexto.trim().split('\n').slice(-1)[0].trim());
  });
});
