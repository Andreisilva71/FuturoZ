/**
 * e2e/helpers.js
 * Shared utilities for the FuturoZ E2E test suite.
 */

const { request } = require('@playwright/test');

// ------------------------------------------------------------------ //
// Constants
// ------------------------------------------------------------------ //
const BASE_URL = 'http://localhost:3000';

// Unique-per-run email prefix to avoid conflicts between runs
const RUN_ID = Date.now();

function testEmail(label) {
  return `test_${label}_${RUN_ID}@e2e.test`;
}

// ------------------------------------------------------------------ //
// API helpers (use Playwright's APIRequestContext)
// ------------------------------------------------------------------ //

async function apiRegister(apiContext, nome, email, senha) {
  return apiContext.post(`${BASE_URL}/api/cadastro`, {
    data: { nome, email, senha },
  });
}

async function apiLogin(apiContext, email, senha) {
  return apiContext.post(`${BASE_URL}/api/login`, {
    data: { email, senha },
  });
}

async function apiAnalyze(apiContext, respostas, usuario_id) {
  return apiContext.post(`${BASE_URL}/api/analisar-perfil`, {
    data: { respostas, usuario_id },
  });
}

async function apiHistorico(apiContext, usuario_id) {
  return apiContext.get(`${BASE_URL}/api/historico/${usuario_id}`);
}

// ------------------------------------------------------------------ //
// UI helpers
// ------------------------------------------------------------------ //

/** Navigate the app to a named page using the JS router. */
async function navegarPara(page, destino) {
  await page.evaluate((d) => window.navegarPara(d), destino);
}

/** Log in a user through the UI and wait for nav-auth to update. */
async function uiLogin(page, email, senha) {
  await navegarPara(page, 'login');
  await page.fill('#login-email', email);
  await page.fill('#login-senha', senha);
  await page.click('button[type="submit"]', { strict: false });
}

/** Complete all 15 quiz questions by clicking options / setting sliders. */
async function completarQuiz(page) {
  await navegarPara(page, 'quiz');
  await page.waitForSelector('#pagina-quiz:not(.escondido)');

  for (let i = 0; i < 15; i++) {
    const isSlider = await page.locator('input[type="range"]').count() > 0;

    if (isSlider) {
      await page.evaluate(() => {
        const input = document.getElementById('range-input');
        if (input) {
          input.value = '60';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    } else {
      await page.waitForSelector('.opcao-btn');
      await page.locator('.opcao-btn').first().click();
    }

    const btnProxima = page.locator('#btn-proxima');
    await btnProxima.click();
    await page.waitForTimeout(100);
  }
}

module.exports = {
  BASE_URL,
  testEmail,
  apiRegister,
  apiLogin,
  apiAnalyze,
  apiHistorico,
  navegarPara,
  uiLogin,
  completarQuiz,
};
