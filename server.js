const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { cadastrarUsuarioService, loginUsuarioService, analisarPerfilService } = require('./services');

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API FuturoZ',
      version: '1.0.0',
      description: 'Documentação da API FuturoZ - Descubra seu Futuro Profissional',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [
      { name: 'Autenticação', description: 'Operações de cadastro e login' },
      { name: 'Análise de Perfil', description: 'Operações de análise com IA' },
      { name: 'Histórico', description: 'Acesso ao histórico de perfis' },
    ],
    components: {
      schemas: {
        Usuario: {
          type: 'object',
          required: ['nome', 'email', 'senha'],
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@example.com' },
            senha: { type: 'string', example: 'senha123' },
            data_criacao: { type: 'string', format: 'date-time', example: '2026-06-10T12:34:56Z' },
          },
        },
        UsuarioPublico: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@example.com' },
            data_criacao: { type: 'string', format: 'date-time', example: '2026-06-10T12:34:56Z' },
          },
        },
        Perfil: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            usuario_id: { type: 'integer', example: 1 },
            respostas: { type: 'array', items: { type: 'string' }, example: ['Resposta 1', 'Resposta 2'] },
            resultado_ia: { type: 'object', example: { carreira: 'Desenvolvimento', compatibilidade: 95 } },
            data_criacao: { type: 'string', format: 'date-time', example: '2026-06-10T12:34:56Z' },
          },
        },
        Credenciais: {
          type: 'object',
          required: ['email', 'senha'],
          properties: {
            email: { type: 'string', format: 'email', example: 'joao@example.com' },
            senha: { type: 'string', example: 'senha123' },
          },
        },
        AnalisarPerfilRequest: {
          type: 'object',
          required: ['respostas', 'usuario_id'],
          properties: {
            respostas: {
              type: 'array',
              items: { type: 'string' },
              example: ['Gosto de trabalhar com pessoas', 'Prefiro desafios técnicos'],
            },
            usuario_id: { type: 'integer', example: 1 },
          },
        },
        AnalisarPerfilResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            usuario_id: { type: 'integer', example: 1 },
            respostas: {
              type: 'array',
              items: { type: 'string' },
              example: ['Gosto de trabalhar com pessoas', 'Prefiro desafios técnicos'],
            },
            resultado_ia: {
              type: 'object',
              example: {
                carreira: 'Desenvolvimento de Software',
                compatibilidade: 95,
                descricao: 'Você tem alto potencial para desenvolvimento',
              },
            },
            data_criacao: { type: 'string', format: 'date-time', example: '2026-06-10T12:34:56Z' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensagem de erro' },
          },
        },
      },
    },
  },
  apis: ['./server.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'FuturoZ_db.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('  💾 Banco de dados SQLite conectado com sucesso!');
    db.run('PRAGMA foreign_keys = ON');
    // Criação automática das tabelas caso não existam
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (!err) {
          console.log('  ✅ Tabela usuarios OK');
          // Tenta adicionar a coluna plano de forma resiliente
          db.run("ALTER TABLE usuarios ADD COLUMN plano TEXT DEFAULT 'free'", (alterErr) => {
            // Se der erro, provavelmente a coluna já existe, ignoramos
          });
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS perfis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        respostas TEXT NOT NULL,
        resultado_ia TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )`, (err) => { if (!err) console.log('  ✅ Tabela perfis OK'); });
    });
  }
});

// Servir arquivos estáticos da pasta atual
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Cadastro de novo usuário
/**
 * @swagger
 * /api/cadastro:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/cadastro', async (req, res) => {
  try {
    const usuario = await cadastrarUsuarioService(db, req.body);
    console.log(`  ✅ Novo usuário cadastrado! ID: ${usuario.id}`);
    res.json(usuario);
  } catch (erro) {
    res.status(erro.status || 500).json({ error: erro.message || 'Erro interno do servidor.' });
  }
});

// Login de usuário
/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Faz login com email e senha
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Credenciais'
 *     responses:
 *       200:
 *         description: Usuário autenticado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 *       400:
 *         description: Email ou senha inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/login', async (req, res) => {
  try {
    const usuario = await loginUsuarioService(db, req.body);
    console.log(`  🔑 Login realizado! Usuário: ${usuario.nome}`);
    res.json(usuario);
  } catch (erro) {
    res.status(erro.status || 500).json({ error: erro.message || 'Erro interno do servidor.' });
  }
});

// ==================== ROTA DA IA ====================

/**
 * @swagger
 * /api/analisar-perfil:
 *   post:
 *     summary: Envia respostas para análise da IA e salva perfil
 *     tags: [Análise de Perfil]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalisarPerfilRequest'
 *     responses:
 *       200:
 *         description: Análise realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalisarPerfilResponse'
 *       400:
 *         description: Dados inválidos ou usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado - usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro ao processar com a IA
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/analisar-perfil', async (req, res) => {
  try {
    const { usuario_id, respostas } = req.body;

    // Validar que usuario_id foi fornecido
    if (!usuario_id) {
      return res.status(401).json({ error: 'Você precisa estar autenticado para fazer a análise. Faça login primeiro.' });
    }

    // Validar que respostas foram fornecidas
    if (!respostas) {
      return res.status(400).json({ error: 'Respostas não fornecidas.' });
    }

    // Buscar o plano do usuário no banco de dados para validar limites do plano gratuito
    db.get('SELECT plano FROM usuarios WHERE id = ?', [usuario_id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erro interno ao validar o plano do usuário.' });
      }
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const plano = user.plano || 'free';

      if (plano === 'free') {
        // Verificar quantos perfis vocacionais o usuário gratuito já possui (limite: 3)
        db.get('SELECT COUNT(*) AS total FROM perfis WHERE usuario_id = ?', [usuario_id], async (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Erro interno ao verificar histórico.' });
          }
          if (row && row.total >= 3) {
            return res.status(403).json({ error: 'Você já utilizou seus 3 testes vocacionais gratuitos. Assine o Plano Pro para obter relatórios ilimitados!' });
          }

          // Usuário gratuito ainda possui testes disponíveis
          executarAnalise();
        });
      } else {
        // Usuário Pro tem relatórios ilimitados
        executarAnalise();
      }
    });

    const executarAnalise = async () => {
      try {
        const data = await analisarPerfilService(db, req.body, process.env.GEMINI_API_KEY);
        res.json(data);
      } catch (erro) {
        res.status(erro.status || 500).json({ error: erro.message || "Erro ao processar as respostas com a Inteligência Artificial." });
      }
    };

  } catch (erro) {
    res.status(erro.status || 500).json({ error: erro.message || "Erro ao processar as respostas com a Inteligência Artificial." });
  }
});

// ==================== ROTAS PREMIUM (PRO) ====================

// Rota para assinar o plano Pro
app.post('/api/usuarios/assinar-pro', (req, res) => {
  const { usuario_id } = req.body;
  if (!usuario_id) {
    return res.status(400).json({ error: 'Usuário não informado.' });
  }

  db.run('UPDATE usuarios SET plano = ? WHERE id = ?', ['pro', usuario_id], function(err) {
    if (err) {
      console.error('Erro ao assinar plano pro:', err);
      return res.status(500).json({ error: 'Erro interno do servidor ao atualizar assinatura.' });
    }

    db.get('SELECT id, nome, email, plano FROM usuarios WHERE id = ?', [usuario_id], (err, row) => {
      if (err || !row) {
        return res.status(500).json({ error: 'Erro ao obter dados do usuário atualizado.' });
      }
      console.log(`  🚀 Usuário assinou o Plano Pro! ID: ${row.id} | Nome: ${row.nome}`);
      res.json(row);
    });
  });
});

// Rota de Chat de Orientação Vocacional IA (exclusiva Pro)
app.post('/api/chat', async (req, res) => {
  const { usuario_id, message } = req.body;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Você precisa estar autenticado.' });
  }

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Mensagem vazia.' });
  }

  // 1. Verificar se o usuário é Pro
  db.get('SELECT plano, nome FROM usuarios WHERE id = ?', [usuario_id], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Erro ao buscar usuário.' });
    }

    if (user.plano !== 'pro') {
      return res.status(403).json({ error: 'O Chat com IA é exclusivo para membros do Plano Pro.' });
    }

    // 2. Buscar último perfil vocacional para contextualização
    db.get('SELECT resultado_ia FROM perfis WHERE usuario_id = ? ORDER BY data_criacao DESC LIMIT 1', [usuario_id], async (err, perfil) => {
      let contextoVocacional = '';
      if (perfil && perfil.resultado_ia) {
        try {
          const resultado = JSON.parse(perfil.resultado_ia);
          const carreirasStr = (resultado.Carreiras || []).map(c => `- ${c.titulo} (${c.match}% de compatibilidade): ${c.descricao}`).join('\n');
          const insightsStr = (resultado.Insights || []).map(i => `- ${i.titulo}: ${i.texto}`).join('\n');
          contextoVocacional = `
Você sabe que o usuário fez o teste vocacional do FuturoZ.
Nome do usuário: ${user.nome}
O perfil dele retornou os seguintes resultados:
Carreiras sugeridas:
${carreirasStr}

Insights de personalidade:
${insightsStr}
`;
        } catch (e) {
          console.error("Erro ao ler JSON de perfil para o chat:", e);
        }
      }

      // 3. Chamar a API do Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'sua_chave_aqui') {
        // Fallback inteligente caso a chave não esteja configurada
        const mockResponses = [
          `Olá, ${user.nome.split(' ')[0]}! Como seu orientador vocacional do FuturoZ Pro, estou aqui para ajudar você a trilhar seu caminho. Com base nas suas principais características, que dúvidas você tem sobre as carreiras sugeridas?`,
          "Excelente pergunta! O mercado de trabalho atual exige tanto conhecimento prático (hard skills) quanto inteligência interpessoal. Recomendo focar no aprendizado contínuo e na criação de projetos pessoais para montar um portfólio bacana.",
          "O caminho para o desenvolvimento profissional envolve experimentar e aprender com os erros. No seu perfil Pro, vejo grande potencial de adaptação. Que tipo de ambiente de trabalho você se imagina daqui a 5 anos?",
          "Com certeza! Para atuar nessas áreas em alta, construir conexões profissionais (networking) em comunidades online ou no LinkedIn é super importante. Posso te dar dicas de como abordar profissionais dessas áreas se quiser."
        ];
        const mockText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        return res.json({ response: mockText });
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Você é o Orientador Vocacional IA do FuturoZ Pro, um assistente inteligente, acolhedor e dinâmico, focado na Geração Z.
Seu objetivo é conversar com o usuário sobre sua carreira, dar conselhos práticos de estudo, mercado e ajudá-lo a entender suas forças.
Seja breve nas respostas (no máximo 2 a 3 parágrafos), use emojis, seja direto e empático. Use uma linguagem moderna e motivadora.

${contextoVocacional}

Mensagem do usuário: "${message}"

Responda diretamente ao usuário.`;

        const result = await model.generateContent(prompt);
        res.json({ response: result.response.text() });
      } catch (chatError) {
        console.error("Erro na chamada de IA do chat:", chatError);
        res.status(500).json({ error: "Erro ao gerar resposta com a IA." });
      }
    });
  });
});

// ==================== ROTA DE HISTÓRICO ====================

/**
 * @swagger
 * /api/historico/{usuario_id}:
 *   get:
 *     summary: Retorna histórico de perfis de um usuário
 *     tags: [Histórico]
 *     parameters:
 *       - in: path
 *         name: usuario_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Lista de perfis do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Perfil'
 *       400:
 *         description: Usuário não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro ao buscar histórico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/historico/:usuario_id', (req, res) => {
  const usuarioId = req.params.usuario_id;
  if (!usuarioId) {
    return res.status(400).json({ error: 'Usuário não informado.' });
  }

  db.all('SELECT * FROM perfis WHERE usuario_id = ? ORDER BY data_criacao DESC', [usuarioId], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar histórico:', err);
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
    
    // Converte as strings JSON de volta para objetos
    const historico = rows.map(row => ({
      ...row,
      respostas: JSON.parse(row.respostas),
      resultado_ia: JSON.parse(row.resultado_ia)
    }));

    res.json(historico);
  });
});

if (require.main === module) {
  // Iniciar o servidor
  app.listen(PORT, () => {
    console.log('');
    console.log('  ❤️  FuturoZ - Servidor iniciado com sucesso!');
    console.log(`  🔑 Status da Chave de IA: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui' ? '✅ Carregada' : '❌ Ausente'}`);
    console.log('');
    console.log(`  🌐 Acesse: http://localhost:${PORT}`);
    console.log('');
    console.log('  Pressione Ctrl+C para encerrar o servidor.');
    console.log('');
  });
}

module.exports = { app, db };
