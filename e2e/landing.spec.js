// @ts-check
const { test, expect } = require('@playwright/test');
const { navegarPara } = require('./helpers');

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('carrega header com logo e navegação', async ({ page }) => {
    await expect(page.locator('header .logo').first()).toBeVisible();
    await expect(page.locator('text=FuturoZ').first()).toBeVisible();
    await expect(page.locator('#pagina-landing')).toBeVisible();
  });

  test('exibe seção hero com h1 e botões de CTA', async ({ page }) => {
    await expect(page.locator('#hero h1')).toBeVisible();
    await expect(page.locator('#hero .btn-primario').first()).toBeVisible();
    await expect(page.locator('text=Saiba mais')).toBeVisible();
  });

  test('exibe seção #problema com 3 cards de desafio', async ({ page }) => {
    await page.locator('#problema').scrollIntoViewIfNeeded();
    const cards = page.locator('#problema .card');
    await expect(cards).toHaveCount(3);
  });

  test('exibe seção #solucao com 3 cards de solução', async ({ page }) => {
    await page.locator('#solucao').scrollIntoViewIfNeeded();
    const cards = page.locator('#solucao .card');
    await expect(cards).toHaveCount(3);
  });

  test('exibe seção #como-funciona com CTA de questionário', async ({ page }) => {
    await page.locator('#como-funciona').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Começar questionário gratuito')).toBeVisible();
  });

  test('toggle de dark mode adiciona classe dark-mode ao body', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark-mode/);
    await page.click('#btn-darkmode');
    await expect(body).toHaveClass(/dark-mode/);
    // Toggle back
    await page.click('#btn-darkmode');
    await expect(body).not.toHaveClass(/dark-mode/);
  });

  test('dark mode persiste entre recarregamentos via localStorage', async ({ page }) => {
    await page.click('#btn-darkmode');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    // Cleanup
    await page.evaluate(() => localStorage.removeItem('theme'));
  });

  test('botão Começar agora no hero exige login antes do quiz', async ({ page }) => {
    // Accept the alert that will appear
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#hero .btn-primario').first().click();
    await expect(page.locator('#pagina-login')).not.toHaveClass('escondido');
  });
});
