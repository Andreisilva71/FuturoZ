const { cadastrarUsuarioService, loginUsuarioService, analisarPerfilService } = require('../services.js');

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
});
