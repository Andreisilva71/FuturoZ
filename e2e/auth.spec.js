// @ts-check
const { test, expect, request } = require('@playwright/test');
const { testEmail, navegarPara } = require('./helpers');

// Unique credentials for this spec run
const NOME = 'Usuário E2E';
const EMAIL = testEmail('auth');
const SENHA = 'senha@E2E123';

test.describe('Autenticação – Cadastro e Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('usuario'));
    // Navigate to login page
    await page.evaluate(() => window.navegarPara('login'));
    await expect(page.locator('#pagina-login')).not.toHaveClass('escondido');
  });

  // ─── Tab switching ────────────────────────────────────────────────
  test('alternância entre abas Entrar / Criar Conta', async ({ page }) => {
    await expect(page.locator('#form-login')).not.toHaveClass('escondido');
    await expect(page.locator('#form-cadastro')).toHaveClass(/escondido/);

    await page.click('#tab-btn-cadastro');
    await expect(page.locator('#form-cadastro')).not.toHaveClass('escondido');
    await expect(page.locator('#form-login')).toHaveClass(/escondido/);

    await page.click('#tab-btn-login');
    await expect(page.locator('#form-login')).not.toHaveClass('escondido');
  });

  // ─── Cadastro ─────────────────────────────────────────────────────
  test('cadastro com campos vazios exibe erro', async ({ page }) => {
    await page.click('#tab-btn-cadastro');
    await page.click('form#form-cadastro button[type="submit"]');
    await expect(page.locator('#cadastro-erro')).not.toHaveClass('escondido');
  });

  test('cadastro com dados válidos → sucesso', async ({ page }) => {
    await page.click('#tab-btn-cadastro');
    await page.fill('#cadastro-nome', NOME);
    await page.fill('#cadastro-email', EMAIL);
    await page.fill('#cadastro-senha', SENHA);
    await page.click('form#form-cadastro button[type="submit"]');

    // After success the app navigates to landing and nav-auth shows user
    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
    await expect(page.locator('#nav-auth')).toContainText(NOME.split(' ')[0]);
  });

  test('cadastro com email já existente exibe erro de conflito', async ({ page }) => {
    await page.click('#tab-btn-cadastro');
    // EMAIL was registered in the previous test – same run_id means same email
    await page.fill('#cadastro-nome', NOME);
    await page.fill('#cadastro-email', EMAIL);
    await page.fill('#cadastro-senha', SENHA);
    await page.click('form#form-cadastro button[type="submit"]');
    await expect(page.locator('#cadastro-erro')).not.toHaveClass('escondido');
    await expect(page.locator('#cadastro-erro')).toContainText('cadastrado');
  });

  // ─── Login ────────────────────────────────────────────────────────
  test('login com senha incorreta exibe erro', async ({ page }) => {
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-senha', 'senha_errada');
    await page.click('form#form-login button[type="submit"]');
    await expect(page.locator('#login-erro')).not.toHaveClass('escondido');
    await expect(page.locator('#login-erro')).toContainText(/incorretos|senha/i);
  });

  test('login com credenciais corretas → sucesso e nav-auth atualizado', async ({ page }) => {
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-senha', SENHA);
    await page.click('form#form-login button[type="submit"]');

    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
    await expect(page.locator('#nav-auth')).toContainText(NOME.split(' ')[0]);
  });

  test('login confirma ao pressionar Enter', async ({ page }) => {
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-senha', SENHA);
    await page.locator('#login-senha').press('Enter');

    await expect(page.locator('#pagina-landing')).not.toHaveClass('escondido');
    await expect(page.locator('#nav-auth')).toContainText(NOME.split(' ')[0]);
  });
});
