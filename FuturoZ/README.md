# ❤️ FuturoZ

> Descubra o Futuro que Você Está Construindo Hoje — uma aplicação web para orientação profissional da Geração Z.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

- **Node.js** (versão 14 ou superior) → [Baixar aqui](https://nodejs.org/)
- **npm** (já vem junto com o Node.js)

Para verificar se está instalado, abra o terminal e execute:

```bash
node --version
npm --version
```

---

## 🚀 Como Iniciar o Projeto

### 1. Abra o terminal na pasta do projeto

No Windows, você pode:
- Navegar até a pasta `FuturoZ` no Explorador de Arquivos
- Clicar com o botão direito e selecionar **"Abrir no Terminal"**

Ou pelo terminal, navegue até a pasta:

```bash
cd "FuturoZ"
```

### 2. Instale as dependências

Execute o seguinte comando para instalar o **Express** (única dependência):

```bash
npm install
```

> Isso criará automaticamente a pasta `node_modules/` com as dependências necessárias.

### 3. Inicie o servidor

```bash
npm run dev
```

Você verá a seguinte mensagem no terminal:

```
  ❤️  FuturoZ - Servidor iniciado com sucesso!

  🌐 Acesse: http://localhost:3000

  Pressione Ctrl+C para encerrar o servidor.
```

### 4. Acesse no navegador

Abra seu navegador e acesse:

```
http://localhost:3000
```

---

## 📁 Estrutura do Projeto

```
FuturoZ/
├── index.html      # Estrutura HTML das páginas (Landing, Quiz, Resultados)
├── Style.css       # Estilos e design da aplicação
├── script.js       # Lógica de navegação e quiz em JavaScript
├── server.js       # Servidor Node.js com Express
├── package.json    # Configurações e dependências do projeto
└── README.md       # Este arquivo
```

---

## 🛑 Como Parar o Servidor

No terminal onde o servidor está rodando, pressione:

```
Ctrl + C
```

---

## 🧩 Páginas da Aplicação

| Página | Descrição |
|--------|-----------|
| **Landing** | Página inicial com apresentação do FuturoZ |
| **Quiz** | Questionário interativo com 15 perguntas |
| **Resultados** | Análise personalizada com carreiras recomendadas |
