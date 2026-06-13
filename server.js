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
      )`, (err) => { if (!err) console.log('  ✅ Tabela usuarios OK'); });

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

    const data = await analisarPerfilService(db, req.body, process.env.GEMINI_API_KEY);
    res.json(data);
  } catch (erro) {
    res.status(erro.status || 500).json({ error: erro.message || "Erro ao processar as respostas com a Inteligência Artificial." });
  }
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
