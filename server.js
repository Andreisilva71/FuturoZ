const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { cadastrarUsuarioService, loginUsuarioService, analisarPerfilService } = require('./services');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Banco de Dados SQLite
// Apenas faz o link com o banco criado por fora
const db = new sqlite3.Database(path.join(__dirname, 'FuturoZ_db.db'), (err) => {
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
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuário cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
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
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
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
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               respostas:
 *                 type: array
 *                 items:
 *                   type: string
 *               usuario_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Resultado da análise
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.post('/api/analisar-perfil', async (req, res) => {
  try {
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
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: usuario_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de perfis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Perfil'
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
