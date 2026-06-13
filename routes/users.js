const express = require('express');
const router = express.Router();

let users = [
  { id: 1, nome: 'João Silva', email: 'joao@exemplo.com', senha: 'senha123', data_criacao: new Date().toISOString() },
];

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Operações sobre usuários
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários (sem senha)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UsuarioPublico'
 */
router.get('/', (req, res) => {
  const safeUsers = users.map(({ senha, ...rest }) => rest);
  res.json(safeUsers);
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: Usuário criado (sem senha)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 */
router.post('/', (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'nome, email e senha são obrigatórios.' });
  }
  const id = users.length + 1;
  const data_criacao = new Date().toISOString();
  const user = { id, nome, email, senha, data_criacao };
  users.push(user);
  res.status(201).json({ id, nome, email, data_criacao });
});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Obtém um usuário por ID
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
  const { senha, ...safe } = user;
  res.json(safe);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 */
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Usuário não encontrado.' });
  const { nome, email, senha } = req.body;
  if (!nome && !email && !senha) return res.status(400).json({ message: 'Forneça ao menos um campo para atualizar.' });
  const user = users[idx];
  if (nome) user.nome = nome;
  if (email) user.email = email;
  if (senha) user.senha = senha; // em produção, criptografar antes de salvar
  user.data_criacao = user.data_criacao || new Date().toISOString();
  users[idx] = user;
  const { senha: _, ...safe } = user;
  res.json(safe);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Usuário removido
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Usuário não encontrado.' });
  users.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;
