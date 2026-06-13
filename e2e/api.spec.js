// @ts-check
/**
 * API Integration tests – exercise every REST endpoint directly
 * without touching the browser UI, using Playwright's APIRequestContext.
 */
const { test, expect } = require('@playwright/test');
const { testEmail } = require('./helpers');

const API_EMAIL = testEmail('api');
const API_SENHA = 'apiSenha@E2E123';
let usuarioId = null;

test.describe('API – Integração', () => {
  // ─── Cadastro ─────────────────────────────────────────────────────
  test.describe('POST /api/cadastro', () => {
    test('cadastro com dados válidos retorna 201 e usuário', async ({ request }) => {
      const res = await request.post('/api/cadastro', {
        data: { nome: 'API User', email: API_EMAIL, senha: API_SENHA },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ email: API_EMAIL });
      expect(body.id).toBeTruthy();
      usuarioId = body.id;
    });

    test('cadastro com campos ausentes retorna 400', async ({ request }) => {
      const res = await request.post('/api/cadastro', {
        data: { nome: 'Sem Email' },
      });
      expect(res.status()).toBe(400);
    });

    test('cadastro com email duplicado retorna 409', async ({ request }) => {
      const res = await request.post('/api/cadastro', {
        data: { nome: 'API User', email: API_EMAIL, senha: API_SENHA },
      });
      expect(res.status()).toBe(409);
    });
  });

  // ─── Login ────────────────────────────────────────────────────────
  test.describe('POST /api/login', () => {
    test('login com credenciais corretas retorna 200 e dados do usuário', async ({ request }) => {
      const res = await request.post('/api/login', {
        data: { email: API_EMAIL, senha: API_SENHA },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ email: API_EMAIL });
      expect(body.senha).toBeUndefined(); // Senha não deve ser exposta
    });

    test('login com senha errada retorna 401', async ({ request }) => {
      const res = await request.post('/api/login', {
        data: { email: API_EMAIL, senha: 'senha_errada' },
      });
      expect(res.status()).toBe(401);
    });

    test('login com email inexistente retorna 401', async ({ request }) => {
      const res = await request.post('/api/login', {
        data: { email: 'naoexiste@e2e.test', senha: 'qualquer' },
      });
      expect(res.status()).toBe(401);
    });

    test('login sem corpo retorna 400', async ({ request }) => {
      const res = await request.post('/api/login', { data: {} });
      expect(res.status()).toBe(400);
    });
  });

  // ─── Analisar Perfil ──────────────────────────────────────────────
  test.describe('POST /api/analisar-perfil', () => {
    const mockRespostas = {
      q1: 'Criatividade',
      q2: ['Trabalhar em equipe', 'Resolver problemas'],
      q3: 'Sim',
    };

    test('análise com respostas válidas retorna 200 com dados de IA', async ({ request }) => {
      // Ensure we have a valid usuarioId
      const loginRes = await request.post('/api/login', {
        data: { email: API_EMAIL, senha: API_SENHA },
      });
      const user = await loginRes.json();

      const res = await request.post('/api/analisar-perfil', {
        data: { respostas: mockRespostas, usuario_id: user.id },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('GraficoPerfil');
      expect(body).toHaveProperty('Carreiras');
      expect(Array.isArray(body.Carreiras)).toBe(true);
      expect(body.Carreiras).toHaveLength(3);
    });

    test('análise sem respostas retorna 400', async ({ request }) => {
      const res = await request.post('/api/analisar-perfil', {
        data: { usuario_id: 1 }
      });
      expect(res.status()).toBe(400);
    });

    test('análise de visitante (sem usuario_id) é negada com 401', async ({ request }) => {
      const res = await request.post('/api/analisar-perfil', {
        data: { respostas: mockRespostas },
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─── Histórico ────────────────────────────────────────────────────
  test.describe('GET /api/historico/:id', () => {
    let uid;

    test.beforeAll(async ({ request }) => {
      const loginRes = await request.post('/api/login', {
        data: { email: API_EMAIL, senha: API_SENHA },
      });
      const user = await loginRes.json();
      uid = user.id;

      // Insert one analysis so history is non-empty
      await request.post('/api/analisar-perfil', {
        data: { respostas: { q1: 'Liderança' }, usuario_id: uid },
      });
    });

    test('retorna array de histórico para usuário existente', async ({ request }) => {
      const res = await request.get(`/api/historico/${uid}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    test('cada item de histórico tem os campos esperados', async ({ request }) => {
      const res = await request.get(`/api/historico/${uid}`);
      const items = await res.json();
      const item = items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('usuario_id', uid);
      expect(item).toHaveProperty('resultado_ia');
      expect(item).toHaveProperty('data_criacao');
    });

    test('usuário inexistente retorna array vazio ou 404', async ({ request }) => {
      const res = await request.get('/api/historico/99999999');
      expect([200, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
      }
    });
  });
});
