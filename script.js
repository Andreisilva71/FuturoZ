// ==================== LÓGICA DE DARK MODE ====================
function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  if (isDark) {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('btn-darkmode');
    if (btn) btn.innerText = '☀️';
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('btn-darkmode').innerText = isDark ? '☀️' : '🌙';
  
  const isDarkMode = document.body.classList.contains('dark-mode');
  Chart.defaults.color = isDarkMode ? '#cbd5e1' : '#64748b';
  Chart.defaults.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  if(perfilChartInstancia) perfilChartInstancia.update();
  if(forcasChartInstancia) forcasChartInstancia.update();
}

// Inicializa o tema ao carregar
initTheme();

// ==================== SCROLL NAV ====================
window.addEventListener('scroll', () => {
  const header = document.querySelector('#pagina-landing header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
});

// ==================== ESTADO GLOBAL ====================
let paginaAtual = 'landing';
let perfilChartInstancia = null;
let forcasChartInstancia = null;
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;

// ==================== AUTENTICAÇÃO ====================
function atualizarNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;
  if (usuarioLogado) {
    navAuth.innerHTML = `
      <div class="nav-usuario">
        <span>Olá, <strong>${usuarioLogado.nome.split(' ')[0]}</strong> 👋</span>
        <button class="btn btn-contorno" onclick="fazerLogout()">Sair</button>
      </div>
    `;
  } else {
    navAuth.innerHTML = `<button class="btn btn-contorno" onclick="navegarPara('login')">Entrar</button>`;
  }
}

function alternarAuthTab(tab) {
  document.getElementById('form-login').classList.toggle('escondido', tab !== 'login');
  document.getElementById('form-cadastro').classList.toggle('escondido', tab !== 'cadastro');
  document.getElementById('tab-btn-login').classList.toggle('ativo', tab === 'login');
  document.getElementById('tab-btn-cadastro').classList.toggle('ativo', tab === 'cadastro');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erro = document.getElementById('login-erro');
  erro.classList.add('escondido');

  if (!email || !senha) {
    erro.textContent = 'Preencha o email e a senha.';
    erro.classList.remove('escondido');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const dados = await res.json();
    if (!res.ok) {
      erro.textContent = dados.error || 'Email ou senha incorretos.';
      erro.classList.remove('escondido');
      return;
    }
    usuarioLogado = dados;
    localStorage.setItem('usuario', JSON.stringify(dados));
    atualizarNavAuth();
    navegarPara('landing');
  } catch (e) {
    erro.textContent = 'Erro de conexão. Tente novamente.';
    erro.classList.remove('escondido');
  }
}

async function fazerCadastro() {
  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const erro = document.getElementById('cadastro-erro');
  erro.classList.add('escondido');

  if (!nome || !email || !senha) {
    erro.textContent = 'Preencha todos os campos.';
    erro.classList.remove('escondido');
    return;
  }

  try {
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    });
    const dados = await res.json();
    if (!res.ok) {
      erro.textContent = dados.error || 'Erro ao criar conta.';
      erro.classList.remove('escondido');
      return;
    }
    usuarioLogado = dados;
    localStorage.setItem('usuario', JSON.stringify(dados));
    atualizarNavAuth();
    navegarPara('landing');
  } catch (e) {
    erro.textContent = 'Erro de conexão. Tente novamente.';
    erro.classList.remove('escondido');
  }
}

function fazerLogout() {
  usuarioLogado = null;
  localStorage.removeItem('usuario');
  atualizarNavAuth();
  navegarPara('landing');
}

// Inicializar nav ao carregar
atualizarNavAuth();

// ==================== NAVEGAÇÃO ====================
function navegarPara(pagina) {
  // Verificar se o usuário está tentando acessar o quiz sem estar autenticado
  if (pagina === 'quiz' && !usuarioLogado) {
    alert('⚠️ Você precisa fazer login antes de começar o questionário!');
    navegarPara('login');
    alternarAuthTab('login');
    return;
  }

  // Esconder todas as páginas
  document.getElementById('pagina-landing').classList.add('escondido');
  document.getElementById('pagina-quiz').classList.add('escondido');
  document.getElementById('pagina-resultados').classList.add('escondido');
  document.getElementById('pagina-login').classList.add('escondido');
  document.getElementById('pagina-historico').classList.add('escondido');

  // Mostrar página selecionada
  document.getElementById(`pagina-${pagina}`).classList.remove('escondido');
  
  // Rolar para o topo
  window.scrollTo(0, 0);

  // Inicializar dados se for o quiz
  if (pagina === 'quiz') {
    iniciarQuiz();
  }
}

// ==================== DADOS DO QUIZ ====================
const perguntas = [
  {
    id: 1,
    tipo: 'multipla-escolha',
    pergunta: 'O que você mais gosta de fazer no seu tempo livre?',
    opcoes: [
      'Criar conteúdo digital (vídeos, posts, designs)',
      'Jogar videogames ou explorar tecnologia',
      'Ler livros ou aprender coisas novas',
      'Praticar esportes ou atividades físicas',
      'Sair com amigos e socializar'
    ]
  },
  {
    id: 2,
    tipo: 'escolha-unica',
    pergunta: 'Qual ambiente de trabalho você prefere?',
    opcoes: [
      'Escritório tradicional com equipe presente',
      'Home office / trabalho remoto',
      'Espaços colaborativos / coworking',
      'Ambientes dinâmicos que mudam frequentemente'
    ]
  },
  {
    id: 3,
    tipo: 'multipla-escolha',
    pergunta: 'Quais destas habilidades você gostaria de desenvolver?',
    opcoes: [
      'Programação e desenvolvimento',
      'Design gráfico e visual',
      'Marketing e vendas',
      'Análise de dados e estatística',
      'Gestão de projetos e liderança'
    ]
  },
  {
    id: 4,
    tipo: 'escolha-unica',
    pergunta: 'Como você prefere aprender algo novo?',
    opcoes: [
      'Vídeos rápidos e dinâmicos (TikTok/Reels)',
      'Tutoriais aprofundados e cursos em vídeo (YouTube)',
      'Lendo artigos, livros ou documentações',
      'Colocando a mão na massa e errando até acertar'
    ]
  },
  {
    id: 5,
    tipo: 'escolha-unica',
    pergunta: 'Quando você se depara com um problema complexo, qual é a sua primeira reação?',
    opcoes: [
      'Pensar em soluções criativas e fora da caixa',
      'Pesquisar dados, fatos e padrões analíticos',
      'Conversar com outras pessoas para ter diferentes perspectivas',
      'Dividir o problema em partes menores e testar cada uma'
    ]
  },
  {
    id: 6,
    tipo: 'escala',
    pergunta: 'Qual o seu nível de conforto ao se expressar e falar em público?',
    minLabel: 'Sou tímido(a)',
    maxLabel: 'Super tranquilo'
  },
  {
    id: 7,
    tipo: 'multipla-escolha',
    pergunta: 'Que tipo de impacto você quer causar no mundo?',
    opcoes: [
      'Inovar desenvolvendo novas tecnologias',
      'Ajudar as pessoas diretamente no dia a dia',
      'Promover sustentabilidade e impacto ambiental',
      'Inspirar pessoas através de arte, cultura e design',
      'Liderar mudanças sociais e novos negócios'
    ]
  },
  {
    id: 8,
    tipo: 'escolha-unica',
    pergunta: 'Como você lida com a rotina?',
    opcoes: [
      'Adoro ter uma rotina bem estruturada e previsível',
      'Gosto de rotina, mas preciso de flexibilidade',
      'Prefiro que cada dia seja diferente do outro',
      'Evito ao máximo, preciso de desafios novos sempre'
    ]
  },
  {
    id: 9,
    tipo: 'escala',
    pergunta: 'Você se considera uma pessoa mais analítica (lógica/dados) ou mais intuitiva/criativa?',
    minLabel: 'Analítica',
    maxLabel: 'Criativa'
  },
  {
    id: 10,
    tipo: 'escolha-unica',
    pergunta: 'Se você tivesse que organizar um projeto em grupo, qual seria o seu papel principal?',
    opcoes: [
      'O planejador: organiza as tarefas e cronogramas',
      'O visionário: dá as principais ideias e o rumo do projeto',
      'O mediador: mantém a equipe unida e motivada',
      'O executor: foca em fazer a parte técnica e entregar o resultado'
    ]
  },
  {
    id: 11,
    tipo: 'multipla-escolha',
    pergunta: 'Quais destas ferramentas ou temas você tem mais curiosidade ou facilidade?',
    opcoes: [
      'Softwares de edição (Photoshop, Premiere, Figma)',
      'Ferramentas de organização (Notion, Trello, Asana)',
      'Editores de código, IA e lógica de programação',
      'Redes sociais, trends e criação de conteúdo',
      'Planilhas, finanças e análise de dados'
    ]
  },
  {
    id: 12,
    tipo: 'escolha-unica',
    pergunta: 'Como você costuma agir sob pressão ou com prazos curtos?',
    opcoes: [
      'Mantenho a calma e foco no que é mais importante',
      'Fico um pouco ansioso(a), mas consigo entregar',
      'Trabalho melhor sob pressão, me dá mais foco',
      'Travo ou preciso de tempo extra para não perder a qualidade'
    ]
  },
  {
    id: 13,
    tipo: 'multipla-escolha',
    pergunta: 'O que é mais importante para o seu futuro profissional?',
    opcoes: [
      'Estabilidade e segurança financeira',
      'Liberdade geográfica e flexibilidade de horários',
      'Trabalhar com algo que tenha um propósito forte',
      'Reconhecimento no mercado e crescimento acelerado',
      'Estar sempre aprendendo e me desafiando'
    ]
  },
  {
    id: 14,
    tipo: 'escolha-unica',
    pergunta: 'Como você prefere se comunicar em um ambiente de trabalho ou estudo?',
    opcoes: [
      'Mensagens rápidas (WhatsApp/Slack)',
      'Videochamadas ou reuniões online',
      'E-mails detalhados e bem estruturados',
      'Conversas presenciais e diretas'
    ]
  },
  {
    id: 15,
    tipo: 'escala',
    pergunta: 'O quanto você gosta de resolver problemas lógicos, matemáticos ou quebra-cabeças complexos?',
    minLabel: 'Detesto',
    maxLabel: 'Adoro'
  }
];

let perguntaAtualIndex = 0;
let respostas = {};

// ==================== LÓGICA DO QUIZ ====================
function iniciarQuiz() {
  perguntaAtualIndex = 0;
  respostas = {};
  renderizarPergunta();
}

function renderizarPergunta() {
  const pergunta = perguntas[perguntaAtualIndex];
  
  // Atualizar cabeçalho e progresso
  document.getElementById('quiz-contador').innerText = `Pergunta ${perguntaAtualIndex + 1} de ${perguntas.length}`;
  const progresso = ((perguntaAtualIndex + 1) / perguntas.length) * 100;
  document.getElementById('quiz-progresso').style.width = `${progresso}%`;

  // Atualizar título
  document.getElementById('pergunta-titulo').innerText = pergunta.pergunta;

  // Renderizar opções
  const container = document.getElementById('opcoes-container');
  container.innerHTML = '';

  if (pergunta.tipo === 'multipla-escolha' || pergunta.tipo === 'escolha-unica') {
    pergunta.opcoes.forEach(opcao => {
      const btn = document.createElement('button');
      btn.className = 'opcao-btn';
      
      // Verificar se está selecionado
      const selecionado = respostas[pergunta.id] && 
        (Array.isArray(respostas[pergunta.id]) 
          ? respostas[pergunta.id].includes(opcao) 
          : respostas[pergunta.id] === opcao);

      if (selecionado) btn.classList.add('selecionado');

      btn.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: ${pergunta.tipo === 'multipla-escolha' ? '4px' : '50%'}; border: 2px solid ${selecionado ? 'var(--cor-primaria)' : 'var(--cor-borda)'}; display: flex; align-items: center; justify-content: center; background: ${selecionado ? 'var(--cor-primaria)' : 'transparent'}">
          ${selecionado && pergunta.tipo === 'multipla-escolha' ? '<span style="color: white; font-size: 14px;">✓</span>' : ''}
          ${selecionado && pergunta.tipo === 'escolha-unica' ? '<div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>' : ''}
        </div>
        ${opcao}
      `;

      btn.onclick = () => selecionarOpcao(pergunta.id, opcao, pergunta.tipo);
      container.appendChild(btn);
    });
  } else if (pergunta.tipo === 'escala') {
    const valorAtual = respostas[pergunta.id] || 50;
    container.innerHTML = `
      <div style="padding: 2rem 0;">
        <input type="range" min="0" max="100" value="${valorAtual}" id="range-input" oninput="document.getElementById('range-val').innerText = this.value + '%'">
        <div style="display: flex; justify-content: space-between; color: var(--cor-texto-claro);">
          <span>${pergunta.minLabel}</span>
          <span id="range-val" style="font-size: 1.5rem; font-weight: bold; color: var(--cor-primaria);">${valorAtual}%</span>
          <span>${pergunta.maxLabel}</span>
        </div>
      </div>
    `;
    
    // Salvar valor ao mudar o slider
    setTimeout(() => {
      document.getElementById('range-input').addEventListener('change', (e) => {
        respostas[pergunta.id] = e.target.value;
        atualizarBotoes();
      });
      // Salvar inicial
      if(!respostas[pergunta.id]) respostas[pergunta.id] = 50;
    }, 0);
  }

  atualizarBotoes();
}

function selecionarOpcao(perguntaId, opcao, tipo) {
  if (tipo === 'multipla-escolha') {
    if (!respostas[perguntaId]) respostas[perguntaId] = [];
    
    const index = respostas[perguntaId].indexOf(opcao);
    if (index > -1) {
      respostas[perguntaId].splice(index, 1); // Remover
    } else {
      respostas[perguntaId].push(opcao); // Adicionar
    }
  } else {
    // Escolha única
    respostas[perguntaId] = opcao;
  }
  
  renderizarPergunta();
}

function atualizarBotoes() {
  const btnVoltar = document.getElementById('btn-voltar');
  const btnProxima = document.getElementById('btn-proxima');
  const pergunta = perguntas[perguntaAtualIndex];

  // Estado botão voltar
  btnVoltar.disabled = perguntaAtualIndex === 0;
  btnVoltar.style.opacity = perguntaAtualIndex === 0 ? '0.5' : '1';

  // Verificar se respondeu para liberar próxima
  let respondeu = false;
  if (respostas[pergunta.id]) {
    if (Array.isArray(respostas[pergunta.id])) {
      respondeu = respostas[pergunta.id].length > 0;
    } else {
      respondeu = true;
    }
  }

  btnProxima.disabled = !respondeu;
  btnProxima.style.opacity = !respondeu ? '0.5' : '1';
  
  if (perguntaAtualIndex === perguntas.length - 1) {
    btnProxima.innerText = 'Finalizar 🎉';
  } else {
    btnProxima.innerText = 'Próxima →';
  }
}

function proximaPergunta() {
  if (perguntaAtualIndex < perguntas.length - 1) {
    perguntaAtualIndex++;
    renderizarPergunta();
  } else {
    finalizarQuiz();
  }
}

function perguntaAnterior() {
  if (perguntaAtualIndex > 0) {
    perguntaAtualIndex--;
    renderizarPergunta();
  }
}

async function finalizarQuiz() {
  navegarPara('resultados');

  // Reseta os estados visuais (Loading aparece, Conteúdo esconde)
  document.getElementById('loading-ia').classList.remove('escondido');
  document.getElementById('conteudo-resultados').classList.add('escondido');
  document.getElementById('loading-ia').innerHTML = `
      <div class="spinner"></div>
      <h2 style="font-size: 2rem; margin-bottom: 1rem;">A IA está analisando seu perfil...</h2>
      <p style="color: var(--cor-texto-claro);">Isso pode levar alguns segundos. Estamos mapeando suas respostas e buscando as melhores carreiras.</p>
  `;

  try {
    const response = await fetch('/api/analisar-perfil', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ respostas, usuario_id: usuarioLogado ? usuarioLogado.id : null })
    });

    if (!response.ok) {
      const erro = await response.json();
      if (response.status === 401) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }
      throw new Error(erro.error || "Erro na resposta do servidor.");
    }

    const dados = await response.json();

    // Esconde o loading e mostra os resultados
    document.getElementById('loading-ia').classList.add('escondido');
    document.getElementById('conteudo-resultados').classList.remove('escondido');

    // Popula o HTML com os dados dinâmicos da IA
    renderizarEstatisticas(dados.VisaoGeral);
    renderizarGraficos(dados.GraficoPerfil, dados.GraficoForcas);
    renderizarCarreiras(dados.Carreiras);
    renderizarInsights(dados.Insights);

  } catch (erro) {
    console.error("Erro ao finalizar quiz:", erro);
    document.getElementById('loading-ia').innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
      <h2 style="font-size: 2rem; margin-bottom: 1rem; color: #ef4444;">Ops, algo deu errado.</h2>
      <p style="color: var(--cor-texto-claro); margin-bottom: 2rem;">${erro.message}</p>
      <button class="btn btn-primario" onclick="finalizarQuiz()">Tentar Novamente</button>
    `;
  }
}

// ==================== LÓGICA DE RESULTADOS ====================
function mudarTab(tabId) {
  // Reset botões
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));
  // Reset conteudos
  document.querySelectorAll('.tab-conteudo').forEach(conteudo => conteudo.classList.remove('ativo'));

  // Ativar selecionado
  event.target.classList.add('ativo');
  document.getElementById(`tab-${tabId}`).classList.add('ativo');
}

function renderizarEstatisticas(visaoGeral) {
  const container = document.getElementById('estatisticas-container');
  if(!visaoGeral) return;
  
  container.innerHTML = `
    <div class="estatistica-card">
      <div class="estatistica-valor">${visaoGeral.indiceCriativo?.valor || '0%'}</div>
      <h3>Índice Criativo</h3>
      <p>${visaoGeral.indiceCriativo?.texto || '-'}</p>
    </div>
    <div class="estatistica-card">
      <div class="estatistica-valor">${visaoGeral.pensamentoAnalitico?.valor || '0%'}</div>
      <h3>Pensamento Analítico</h3>
      <p>${visaoGeral.pensamentoAnalitico?.texto || '-'}</p>
    </div>
    <div class="estatistica-card">
      <div class="estatistica-valor">${visaoGeral.habilidadeSocial?.valor || '0%'}</div>
      <h3>Habilidade Social</h3>
      <p>${visaoGeral.habilidadeSocial?.texto || '-'}</p>
    </div>
  `;
}

function renderizarCarreiras(carreiras) {
  const container = document.getElementById('lista-carreiras');
  if(!carreiras || carreiras.length === 0) return;

  container.innerHTML = carreiras.map(carreira => `
    <div class="carreira-item">
      <div class="carreira-match">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">${carreira.icone || '🎯'}</div>
        <span class="texto-gradiente">${carreira.match}%</span>
        <div style="font-size: 0.875rem; color: var(--cor-texto-claro);">Compatível</div>
      </div>
      <div>
        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${carreira.titulo}</h3>
        <p style="color: var(--cor-texto-claro); margin-bottom: 1rem;">${carreira.descricao}</p>
        <div class="skills-tags">
          ${(carreira.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderizarInsights(insights) {
  const container = document.getElementById('tab-insights');
  if(!insights || insights.length === 0) return;

  const cores = ['#eab308', '#3b82f6', '#a855f7']; // Amarelo, Azul, Roxo
  
  container.innerHTML = insights.map((insight, index) => `
    <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${cores[index % cores.length]};">
      <h3>${insight.titulo}</h3>
      <p style="margin-bottom: 0.5rem;">${insight.texto}</p>
      ${insight.fraseMotivadora ? `<p style="font-weight: 500; color: ${cores[index % cores.length]}; font-style: italic;">"${insight.fraseMotivadora}"</p>` : ''}
    </div>
  `).join('');
}

function renderizarGraficos(dadosPerfil, dadosForcas) {
  const ctxPerfil = document.getElementById('perfilChart').getContext('2d');
  const ctxForcas = document.getElementById('forcasChart').getContext('2d');

  if (perfilChartInstancia) perfilChartInstancia.destroy();
  if (forcasChartInstancia) forcasChartInstancia.destroy();

  const isDarkMode = document.body.classList.contains('dark-mode');
  Chart.defaults.color = isDarkMode ? '#cbd5e1' : '#64748b';
  Chart.defaults.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  Chart.defaults.font.family = "'Inter', sans-serif";

  const comumOptions = {
    responsive: true,
    layout: {
      padding: {
        left: 40,
        right: 40,
        top: 20,
        bottom: 20
      }
    },
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 12
          }
        },
        ticks: {
          display: true,
          min: 0,
          max: 100,
          stepSize: 25,
          color: '#94a3b8',
          backdropColor: 'transparent'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  perfilChartInstancia = new Chart(ctxPerfil, {
    type: 'radar',
    data: {
      labels: ['Criatividade', 'Análise', 'Social', 'Liderança', 'Técnico', 'Inovação'],
      datasets: [{
        label: 'Seu Perfil',
        data: dadosPerfil || [0,0,0,0,0,0],
        backgroundColor: 'rgba(168, 85, 247, 0.5)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
      }]
    },
    options: comumOptions
  });

  forcasChartInstancia = new Chart(ctxForcas, {
    type: 'radar',
    data: {
      labels: ['Criatividade', 'Adaptabilidade', 'Colaboração', 'Pensamento Crítico'],
      datasets: [{
        label: 'Suas Forças',
        data: dadosForcas || [0,0,0,0],
        backgroundColor: 'rgba(168, 85, 247, 0.5)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
      }]
    },
    options: comumOptions
  });
}

// ==================== LÓGICA DE HISTÓRICO ====================
function abrirHistorico() {
  if (!usuarioLogado) {
    alert('Você precisa estar logado para ver seu histórico!');
    navegarPara('login');
    return;
  }
  
  navegarPara('historico');
  carregarHistorico();
}

async function carregarHistorico() {
  const loading = document.getElementById('loading-historico');
  const lista = document.getElementById('lista-historico');
  const vazio = document.getElementById('historico-vazio');
  
  loading.classList.remove('escondido');
  lista.innerHTML = '';
  vazio.classList.add('escondido');

  try {
    const res = await fetch(`/api/historico/${usuarioLogado.id}`);
    if (!res.ok) throw new Error('Erro ao buscar histórico');
    
    const historico = await res.json();
    loading.classList.add('escondido');

    if (historico.length === 0) {
      vazio.classList.remove('escondido');
    } else {
      renderizarListaHistorico(historico);
    }
  } catch (erro) {
    console.error(erro);
    loading.classList.add('escondido');
    lista.innerHTML = '<p class="form-erro">Ocorreu um erro ao carregar seu histórico. Tente novamente mais tarde.</p>';
  }
}

function renderizarListaHistorico(historico) {
  const lista = document.getElementById('lista-historico');
  lista.innerHTML = historico.map(item => {
    const data = new Date(item.data_criacao).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // Pegar a melhor carreira (a primeira da lista)
    const melhorCarreira = item.resultado_ia.Carreiras && item.resultado_ia.Carreiras.length > 0 
      ? item.resultado_ia.Carreiras[0] 
      : { titulo: 'Perfil Analisado', icone: '🧠' };

    return `
      <div class="card" style="cursor: pointer; transition: transform 0.2s;" onclick='abrirResultadoAnterior(${JSON.stringify(item.resultado_ia).replace(/'/g, "&#39;")})'>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div class="badge" style="margin: 0; font-size: 0.8rem;">📅 ${data}</div>
          <div style="font-size: 1.5rem;">${melhorCarreira.icone}</div>
        </div>
        <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">${melhorCarreira.titulo}</h3>
        <p style="color: var(--cor-texto-claro); font-size: 0.9rem;">
          Índice Criativo: ${item.resultado_ia.VisaoGeral?.indiceCriativo?.valor || '--'}<br>
          Pensamento Analítico: ${item.resultado_ia.VisaoGeral?.pensamentoAnalitico?.valor || '--'}
        </p>
        <button class="btn btn-contorno" style="width: 100%; margin-top: 1rem; padding: 0.5rem;">Ver Detalhes</button>
      </div>
    `;
  }).join('');
}

function abrirResultadoAnterior(resultado_ia) {
  navegarPara('resultados');
  
  document.getElementById('loading-ia').classList.add('escondido');
  document.getElementById('conteudo-resultados').classList.remove('escondido');

  renderizarEstatisticas(resultado_ia.VisaoGeral);
  renderizarGraficos(resultado_ia.GraficoPerfil, resultado_ia.GraficoForcas);
  renderizarCarreiras(resultado_ia.Carreiras);
  renderizarInsights(resultado_ia.Insights);
  
  // Forçar para a primeira aba
  mudarTab('visao-geral');
}

// ==================== LÓGICA DE MENU MOBILE ====================
const btnHamburger = document.getElementById('btn-hamburger');
const menuNav = document.querySelector('.nav-menu');

function toggleMenu() {
  if (!menuNav || !btnHamburger) return;
  const aberto = menuNav.classList.toggle('aberto');
  btnHamburger.setAttribute('aria-expanded', aberto);
  btnHamburger.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
  btnHamburger.innerText = aberto ? '✕' : '☰';
}

if (btnHamburger) {
  btnHamburger.addEventListener('click', toggleMenu);
}

// Fechar menu ao clicar em links ou botões internos
if (menuNav) {
  menuNav.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.btn')) {
      if (menuNav.classList.contains('aberto')) {
        toggleMenu();
      }
    }
  });
}

// Fechar menu ao clicar fora dele
document.addEventListener('click', (e) => {
  if (menuNav && menuNav.classList.contains('aberto')) {
    if (!menuNav.contains(e.target) && !btnHamburger.contains(e.target)) {
      toggleMenu();
    }
  }
});

// Exportações para testes (QA)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initTheme,
    toggleDarkMode,
    atualizarNavAuth,
    alternarAuthTab,
    fazerLogin,
    fazerCadastro,
    fazerLogout,
    navegarPara,
    iniciarQuiz,
    renderizarPergunta,
    selecionarOpcao,
    atualizarBotoes,
    proximaPergunta,
    perguntaAnterior,
    finalizarQuiz,
    mudarTab,
    renderizarEstatisticas,
    renderizarCarreiras,
    renderizarInsights,
    renderizarGraficos,
    abrirHistorico,
    carregarHistorico,
    renderizarListaHistorico,
    abrirResultadoAnterior,
    perguntas,
    getRespostas: () => respostas,
    setResposta: (id, val) => respostas[id] = val,
    resetRespostas: () => respostas = {},
    getUsuarioLogado: () => usuarioLogado,
    setUsuarioLogado: (val) => usuarioLogado = val
  };
}

