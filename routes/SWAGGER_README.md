# Documentação Swagger — FuturoZ

Este arquivo descreve como usar a documentação Swagger incluída no projeto FuturoZ.

**Propósito**
- Documentar e testar os endpoints mínimos de `Usuários` (nome e email) via Swagger UI.

**Arquivos relevantes**
- `app.js` — servidor Express com configuração do Swagger e rota `/api-docs`.
- `routes/users.js` — roteador com endpoints documentados para `Usuario`.

Como executar
1. Abra um terminal na pasta do projeto FuturoZ.
2. Instale dependências (caso ainda não tenha instalado):

```powershell
npm install
```

3. Inicie o servidor:

```powershell
node app.js
```

4. Abra a documentação no navegador:

- Swagger UI: http://localhost:3000/api-docs
- Spec JSON:   http://localhost:3000/api-docs.json

Endpoints documentados
- GET `/usuarios` — lista usuários existentes.
- POST `/usuarios` — cria um usuário novo. Body JSON esperado:

```json
{
  "nome": "Nome Exemplo",
  "email": "nome@exemplo.com"
}
```

Exemplo com curl

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@exemplo.com"}'
```

Notas
- O Swagger UI e a spec são gerados por `swagger-jsdoc` e servidos com `swagger-ui-express`.
- Este README descreve apenas a parte de documentação; verifique o `package.json` para scripts e dependências.

Se quiser, eu posso atualizar o `README.md` principal do projeto ou adicionar instruções em Português/English adicionais.
