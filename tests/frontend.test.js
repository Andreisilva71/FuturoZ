/**
 * @jest-environment jsdom
 */

// Ambiente isolado do Frontend
document.body.innerHTML = `
  <button id="btn-darkmode">🌙</button>
  <div id="estatisticas-container"></div>
  <div id="quiz-contador"></div>
  <div id="quiz-progresso"></div>
  <h2 id="pergunta-titulo"></h2>
  <div id="opcoes-container"></div>
  <button id="btn-voltar"></button>
  <button id="btn-proxima"></button>
`;

Object.defineProperty(window, 'localStorage', {
  value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true
});

global.Chart = {
  defaults: { color: '', borderColor: '', font: { family: '' } }
};

const { 
  toggleDarkMode, 
  selecionarOpcao,
  renderizarEstatisticas,
  perguntas,
  getRespostas,
  resetRespostas
} = require('../script.js');

describe('Testes Unitários no Frontend (Interface e Comportamento)', () => {
  beforeEach(() => {
    resetRespostas();
    jest.clearAllMocks();
  });

  // Componente 1
  it('Teste 1: Componente de Dark Mode - Deve alternar o estado do componente visualmente e se comportar como esperado', () => {
    document.body.classList.remove('dark-mode');
    
    // Simula Evento de Interação do usuário
    toggleDarkMode();
    
    // Verifica renderização corretamente na tela e comportamentos de estado
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(document.getElementById('btn-darkmode').innerText).toBe('☀️');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  // Componente 2
  it('Teste 2: Lógica de Interação do Quiz - Eventos de clique nas opções disparam armazenamento do estado no componente', () => {
    const pergunta = perguntas[0];
    
    // Simula Interação do usuário (clique em botão)
    selecionarOpcao(pergunta.id, pergunta.opcoes[0], 'escolha-unica');
    
    // Verifica se os estados do componente se comportam como esperado
    const respostas = getRespostas();
    expect(respostas[pergunta.id]).toBe(pergunta.opcoes[0]);
  });

  // Componente 3
  it('Teste 3: Listagem de Dados - O componente de estatísticas é renderizado corretamente na tela com os dados passados', () => {
    const dadosMockados = {
      indiceCriativo: { valor: '95%', texto: 'Criativo' },
      pensamentoAnalitico: { valor: '80%', texto: 'Analítico' },
      habilidadeSocial: { valor: '85%', texto: 'Social' }
    };

    // Renderiza componente
    renderizarEstatisticas(dadosMockados);

    // Verifica renderização visual no DOM
    const htmlRenderizado = document.getElementById('estatisticas-container').innerHTML;
    expect(htmlRenderizado).toContain('95%');
    expect(htmlRenderizado).toContain('Criativo');
    expect(htmlRenderizado).toContain('80%');
  });
});
