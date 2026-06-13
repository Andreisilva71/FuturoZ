const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function cadastrarUsuarioService(db, dados) {
  return new Promise((resolve, reject) => {
    const { nome, email, senha } = dados;

    if (!nome || !email || !senha) {
      return reject({ status: 400, message: 'Nome, email e senha são obrigatórios.' });
    }

    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row) => {
      if (err) return reject({ status: 500, message: 'Erro interno.' });
      if (row) return reject({ status: 409, message: 'Este email já está cadastrado.' });

      try {
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        db.run(
          'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
          [nome, email, senhaCriptografada],
          function (err) {
            if (err) return reject({ status: 500, message: 'Erro ao criar conta.' });
            resolve({ id: this.lastID, nome, email });
          }
        );
      } catch (err) {
        reject({ status: 500, message: 'Erro interno na criptografia.' });
      }
    });
  });
}

function loginUsuarioService(db, dados) {
  return new Promise((resolve, reject) => {
    const { email, senha } = dados;

    if (!email || !senha) {
      return reject({ status: 400, message: 'Email e senha são obrigatórios.' });
    }

    db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, usuario) => {
      if (err) return reject({ status: 500, message: 'Erro interno.' });
      if (!usuario) return reject({ status: 401, message: 'Email ou senha incorretos.' });

      try {
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) return reject({ status: 401, message: 'Email ou senha incorretos.' });

        resolve({ id: usuario.id, nome: usuario.nome, email: usuario.email });
      } catch (err) {
        reject({ status: 500, message: 'Erro interno na verificação.' });
      }
    });
  });
}

// Tenta chamar a API do Gemini até maxTentativas vezes em caso de erros transitórios (503, 429)
async function chamarGeminiComRetry(model, prompt, maxTentativas = 3) {
  const ERROS_RETRY = [429, 503];
  let ultimoErro;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (err) {
      ultimoErro = err;
      const status = err?.status || err?.httpStatusCode || 503;

      // Erros permanentes — não adianta tentar novamente
      if (status === 400 || status === 401 || status === 403) throw err;

      // Erros transitórios — aguarda e tenta novamente
      if (ERROS_RETRY.includes(status) && tentativa < maxTentativas) {
        const espera = Math.pow(2, tentativa - 1) * 1000; // 1s, 2s, 4s...
        console.warn(`  ⚠️  Gemini retornou ${status}. Tentativa ${tentativa}/${maxTentativas}. Aguardando ${espera / 1000}s...`);
        await new Promise(r => setTimeout(r, espera));
        continue;
      }

      throw err;
    }
  }

  throw ultimoErro;
}

async function analisarPerfilService(db, dados, apiKey) {
  const { respostas, usuario_id } = dados;

  if (!respostas) {
    throw { status: 400, message: 'Respostas não fornecidas.' };
  }

  if (!apiKey || apiKey === 'sua_chave_aqui') {
    return {
      "GraficoPerfil": [92, 78, 85, 60, 70, 88],
      "GraficoForcas": [95, 80, 85, 75],
      "VisaoGeral": {
        "indiceCriativo": { "valor": "92%", "texto": "Muito acima da média" },
        "pensamentoAnalitico": { "valor": "78%", "texto": "Acima da média" },
        "habilidadeSocial": { "valor": "85%", "texto": "Muito desenvolvida" }
      },
      "Carreiras": [
        { "titulo": "Designer de Experiência (UX/UI)", "match": 94, "descricao": "Combine criatividade com análise para criar produtos digitais intuitivos.", "skills": ["Design", "Empatia", "Pesquisa"], "icone": "✨" },
        { "titulo": "Desenvolvedor Full-Stack", "match": 88, "descricao": "Construa soluções tecnológicas completas do início ao fim.", "skills": ["Programação", "Lógica", "Criatividade"], "icone": "💻" },
        { "titulo": "Product Manager", "match": 85, "descricao": "Lidere o desenvolvimento de produtos que impactam milhões.", "skills": ["Estratégia", "Comunicação", "Liderança"], "icone": "🎯" }
      ],
      "Insights": [
        { "titulo": "💡 Você é naturalmente inovador", "texto": "Suas respostas indicam que você busca constantemente formas novas de resolver problemas.", "fraseMotivadora": "O mundo precisa da sua visão!" },
        { "titulo": "👥 Trabalho em equipe te energiza", "texto": "Você prospera em ambientes colaborativos onde pode trocar ideias.", "fraseMotivadora": "Juntos chegamos mais longe!" }
      ]
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `Você é um orientador vocacional especialista em carreiras de tecnologia, criatividade e negócios para a Geração Z.
Vou te passar as respostas de um usuário em um questionário vocacional. O formato é um JSON onde a chave é o ID da pergunta (ignorar o significado do ID, olhe apenas a resposta em si) e o valor é a resposta ou array de respostas escolhidas por ele.

Respostas do usuário:
${JSON.stringify(respostas, null, 2)}

Analise profundamente essas respostas e retorne um JSON VÁLIDO E ESTRITAMENTE FORMATADO com a seguinte estrutura exata:
{
  "GraficoPerfil": [A, B, C, D, E, F], 
  "GraficoForcas": [W, X, Y, Z],
  "VisaoGeral": {
    "indiceCriativo": { "valor": "XX%", "texto": "frase muito curta de impacto" },
    "pensamentoAnalitico": { "valor": "XX%", "texto": "frase muito curta de impacto" },
    "habilidadeSocial": { "valor": "XX%", "texto": "frase muito curta de impacto" }
  },
  "Carreiras": [
    { "titulo": "Nome da Profissão", "match": 95, "descricao": "Descrição engajadora.", "skills": ["Skill1", "Skill2", "Skill3"], "icone": "🚀" }
  ],
  "Insights": [
    { 
      "titulo": "💡 Título do Insight", 
      "texto": "Texto personalizado baseado nas respostas dele.",
      "fraseMotivadora": "Uma frase de efeito super motivacional relacionada ao insight."
    }
  ]
}

Instruções:
- GraficoPerfil: números (0 a 100) para 'Criatividade', 'Análise', 'Social', 'Liderança', 'Técnico', 'Inovação'.
- GraficoForcas: números (0 a 100) para 'Criatividade', 'Adaptabilidade', 'Colaboração', 'Pensamento Crítico'.
- Carreiras: exatamente 3 carreiras ideais com match acima de 70.
- Insights: exatamente 2 objetos de insights personalizados com frases motivadoras únicas.`;

  let result;
  try {
    result = await chamarGeminiComRetry(model, prompt, 3);
  } catch (apiError) {
    const status = apiError?.status || apiError?.httpStatusCode || 503;
    const msg = apiError?.message || 'Erro desconhecido na API do Gemini.';
    console.error(`  ❌ Erro na API Gemini após todas as tentativas [${status}]:`, msg);
    if (status === 429) throw { status: 429, message: 'Limite de requisições da IA atingido. Aguarde alguns minutos e tente novamente.' };
    if (status === 401 || status === 403) throw { status: 401, message: 'Chave de API inválida ou sem permissão. Verifique o arquivo .env.' };
    throw { status: 503, message: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.' };
  }

  const responseText = result.response.text();

  let data;
  try {
    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    data = JSON.parse(jsonStr);
  } catch (parseError) {
    throw { status: 500, message: "Falha ao interpretar a resposta da IA como JSON." };
  }

  return new Promise((resolve, reject) => {
    const uid = usuario_id || null;
    db.run(
      'INSERT INTO perfis (usuario_id, respostas, resultado_ia) VALUES (?, ?, ?)',
      [uid, JSON.stringify(respostas), JSON.stringify(data)],
      function (err) {
        if (err) {
          console.error("Erro ao salvar no banco de dados:", err.message);
        } else {
          console.log(`  📝 Perfil salvo! ID: ${this.lastID}${uid ? " | Usuário: " + uid : " | Visitante"}`);
        }
        resolve(data);
      }
    );
  });
}

module.exports = {
  cadastrarUsuarioService,
  loginUsuarioService,
  analisarPerfilService,
  chamarGeminiComRetry // exportado para facilitar testes unitários
};
