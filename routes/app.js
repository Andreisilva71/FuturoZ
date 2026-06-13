const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const usersRouter = require('./users');

const app = express();
app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API FuturoZ - Usuários',
      version: '1.0.0',
      description: 'Documentação mínima para usuários (nome e email).',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Dev server' },
    ],
    tags: [{ name: 'Usuários', description: 'Operações sobre usuários' }],
    components: {
      schemas: {
        Usuario: {
          type: 'object',
          required: ['nome', 'email', 'senha'],
          properties: {
            id: { type: 'integer', description: 'ID', example: 1 },
            nome: { type: 'string', description: 'Nome completo', example: 'Maria Silva' },
            email: { type: 'string', format: 'email', description: 'E-mail', example: 'maria@exemplo.com' },
            senha: { type: 'string', description: 'Senha (armazenada criptografada no banco)', example: 'senha123' },
            data_criacao: { type: 'string', format: 'date-time', description: 'Timestamp de criação', example: '2026-05-21T12:34:56Z' },
          },
        },
        UsuarioPublico: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID', example: 1 },
            nome: { type: 'string', description: 'Nome completo', example: 'Maria Silva' },
            email: { type: 'string', format: 'email', description: 'E-mail', example: 'maria@exemplo.com' },
            data_criacao: { type: 'string', format: 'date-time', description: 'Timestamp de criação', example: '2026-05-21T12:34:56Z' },
          },
        },
        Perfil: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID do perfil', example: 1 },
            usuario_id: { type: 'integer', description: 'ID do usuário', example: 1 },
            respostas: { type: 'array', description: 'Respostas do usuário', items: { type: 'string' } },
            resultado_ia: { type: 'object', description: 'Resultado retornado pela IA' },
            data_criacao: { type: 'string', format: 'date-time', description: 'Timestamp de criação', example: '2026-05-21T12:34:56Z' },
          }
        },
      },
    },
  },
  apis: ['../server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/usuarios', usersRouter);

app.get('/', (req, res) => res.redirect('/api-docs'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor FuturoZ rodando em http://localhost:${PORT}`);
    console.log(`Docs: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
