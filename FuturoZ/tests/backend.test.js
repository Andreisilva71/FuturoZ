const { cadastrarUsuarioService, loginUsuarioService, analisarPerfilService, chamarGeminiComRetry } = require('../services.js');

// Mocks para isolar conexões externas
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hash_mockado')),
  compare: jest.fn((senha, hash) => Promise.resolve(senha === 'senha_correta' && hash === 'hash_mockado'))
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            GraficoPerfil: [100], GraficoForcas: [100],
            VisaoGeral: {}, Carreiras: [{ titulo: "Dev", match: 99 }], Insights: []
          })
        }
      })
    })
  }))
}));

describe('Testes Unitários no Backend (Regras de Negócio)', () => {
  let dbMock;

  beforeEach(() => {
    // Stubs para isolar código de conexões reais com o banco de dados
    dbMock = { get: jest.fn(), run: jest.fn() };
    jest.useFakeTimers(); // controla setTimeout nos testes de retry

    // Silencia logs e warnings esperados para manter o output limpo
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Função 1
  it('Teste 1: cadastrarUsuarioService - Deve cadastrar um usuário (caminho feliz) e impedir duplicação (negativo)', async () => {
    // Caminho Negativo
    dbMock.get.mockImplementationOnce((query, params, cb) => cb(null, { id: 1 }));
    await expect(cadastrarUsuarioService(dbMock, { nome: 'A', email: 'jaexiste@teste.com', senha: '1' }))
      .rejects.toEqual({ status: 409, message: 'Este email já está cadastrado.' });

    // Caminho Feliz
    dbMock.get.mockImplementationOnce((query, params, cb) => cb(null, null));
    dbMock.run.mockImplementationOnce(function(query, params, cb) { cb.call({ lastID: 99 }, null); });
    const sucesso = await cadastrarUsuarioService(dbMock, { nome: 'Novo', email: 'novo@teste.com', senha: '123' });
    expect(sucesso).toHaveProperty('id', 99);
  });

  // Função 2
  it('Teste 2: loginUsuarioService - Deve realizar login (caminho feliz) e barrar senha errada (negativo)', async () => {
    // Caminho Negativo
    dbMock.get.mockImplementationOnce((query, params, cb) => cb(null, { id: 1, senha: 'hash_mockado' }));
    await expect(loginUsuarioService(dbMock, { email: 'user@teste.com', senha: 'senha_errada' }))
      .rejects.toEqual({ status: 401, message: 'Email ou senha incorretos.' });

    // Caminho Feliz
    dbMock.get.mockImplementationOnce((query, params, cb) => cb(null, { id: 1, nome: 'User', email: 'user@teste.com', senha: 'hash_mockado' }));
    const sucesso = await loginUsuarioService(dbMock, { email: 'user@teste.com', senha: 'senha_correta' });
    expect(sucesso).toHaveProperty('id', 1);
  });

  // Função 3
  it('Teste 3: analisarPerfilService - Deve processar dados da IA (caminho feliz) e barrar requisições vazias (negativo)', async () => {
    // Caminho Negativo
    await expect(analisarPerfilService(dbMock, {}, 'chave'))
      .rejects.toEqual({ status: 400, message: 'Respostas não fornecidas.' });

    // Caminho Feliz
    dbMock.run.mockImplementationOnce(function(query, params, cb) { cb.call({ lastID: 1 }, null); });
    const sucesso = await analisarPerfilService(dbMock, { respostas: { 1: "Teste" }, usuario_id: null }, 'chave_valida');
    expect(sucesso.Carreiras[0].titulo).toBe('Dev');
  });

  // Função 4 — Retry com backoff exponencial
  it('Teste 4: chamarGeminiComRetry - Deve tentar novamente em erros 503 e ter sucesso na 2ª tentativa', async () => {
    const respostaSucesso = { response: { text: () => '{"ok": true}' } };
    const erroTransitorio = Object.assign(new Error('Service Unavailable'), { status: 503 });

    const mockGenerateContent = jest.fn()
      .mockRejectedValueOnce(erroTransitorio)  // 1ª tentativa: falha com 503
      .mockResolvedValueOnce(respostaSucesso);  // 2ª tentativa: sucesso

    const modelMock = { generateContent: mockGenerateContent };

    const promise = chamarGeminiComRetry(modelMock, 'prompt de teste', 3);

    // Avança o timer para simular o tempo de espera do backoff (1s)
    await jest.runAllTimersAsync();

    const resultado = await promise;
    expect(resultado).toBe(respostaSucesso);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  // Função 5 — Sem retry para erros permanentes
  it('Teste 5: chamarGeminiComRetry - Não deve tentar novamente em erros 401 (permanente)', async () => {
    const erroPermanente = Object.assign(new Error('Unauthorized'), { status: 401 });
    const mockGenerateContent = jest.fn().mockRejectedValue(erroPermanente);
    const modelMock = { generateContent: mockGenerateContent };

    await expect(chamarGeminiComRetry(modelMock, 'prompt', 3)).rejects.toMatchObject({ status: 401 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // só tentou 1 vez
  });
});
