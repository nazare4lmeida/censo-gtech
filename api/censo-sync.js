// Recebe cada resposta do censo, enviada pelo próprio site, e atualiza o aluno
// ou cria um cadastro novo. Usa as mesmas variáveis do painel admin.
//
// Regra:
// - Acha o aluno pelo nome (sem acento e sem diferença de maiúsculas).
// - Se houver um só com esse nome, atualiza. Se houver vários, usa o que tiver o mesmo e-mail.
// - Se não reconhecer ninguém (ou se ainda ficar ambíguo), cria um cadastro novo.
// - Atualiza todos os dados que o censo enviou. Campo que veio em branco não apaga o que já existe.

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOTE_LEITURA = 1000;
const ORIGEM_NOVA = "Censo 2026 (site)";

const env = (nome) => (process.env[nome] || "").trim();

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textoOuNulo(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === "" ? null : texto;
}

function lerCorpo(req) {
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  return req.body ?? {};
}

// Converte as respostas do censo nas colunas do painel.
// Títulos em "detalhes" usam os mesmos nomes da base, para que tudo fique junto.
function prepararRespostas(dados) {
  const nome = textoOuNulo(dados.nome);
  if (!nome) return { erro: "Informe o nome." };

  const email = textoOuNulo(dados.email)?.toLowerCase() ?? null;
  if (email && !REGEX_EMAIL.test(email)) return { erro: "E-mail inválido." };

  const trabalhaTech = textoOuNulo(dados.trabalha_tech);
  const campos = {
    nome,
    email,
    linkedin: textoOuNulo(dados.linkedin),
    edicao: textoOuNulo(dados.edicao_gt),
    curso_superior: textoOuNulo(dados.qual_curso),
    genero: textoOuNulo(dados.genero),
    raca: textoOuNulo(dados.raca),
    naturalidade: textoOuNulo(dados.naturalidade),
    pcd: textoOuNulo(dados.pcd),
    qual_pcd: textoOuNulo(dados.qual_pcd),
    area_tech: trabalhaTech,
    trabalha_tech: trabalhaTech === "Sim" ? "Sim" : trabalhaTech === "Não" ? "Não" : "Sem resposta",
  };

  const detalhes = {
    "Cursando ensino superior?": textoOuNulo(dados.ensino_superior),
    "No mercado de trabalho?": textoOuNulo(dados.mercado_trabalho),
    "Projetos de programação?": textoOuNulo(dados.projetos_prog),
    "Como trabalha (programação)": textoOuNulo(dados.tipo_atuacao),
    "Atualização de cadastro": textoOuNulo(dados.atualizacao_cadastro),
  };
  for (const chave of Object.keys(detalhes)) {
    if (!detalhes[chave]) delete detalhes[chave];
  }
  return { campos, detalhes };
}

// ---------- Banco (Supabase REST) ----------

async function supa(metodo, tabela, { query = "", corpo, preferir } = {}) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const url = `${base}/rest/v1/${tabela}${query ? `?${query}` : ""}`;
  const chave = env("SUPABASE_SERVICE_KEY");
  const headers = { apikey: chave, Authorization: `Bearer ${chave}` };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (preferir) headers.Prefer = preferir;

  const res = await fetch(url, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

async function buscarAlunosComNome(nomeNormalizado) {
  // Traz só id/nome/email; a comparação de nome é feita aqui, sem acento.
  const linhas = [];
  for (let inicio = 0; ; inicio += LOTE_LEITURA) {
    const dados = await supa("GET", "alunos", {
      query: `select=id,nome,email&order=nome.asc&limit=${LOTE_LEITURA}&offset=${inicio}`,
    });
    linhas.push(...dados);
    if (dados.length < LOTE_LEITURA) break;
  }
  return linhas.filter((a) => semAcento(a.nome) === nomeNormalizado);
}

async function registrar(acao, alunoId, antes, depois) {
  try {
    await supa("POST", "alteracoes", {
      corpo: { acao, aluno_id: alunoId ?? null, antes: antes ?? null, depois: depois ?? null },
      preferir: "return=minimal",
    });
  } catch (erro) {
    console.error("Falha ao registrar alteração do censo:", erro);
  }
}

// ---------- Rota ----------

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }
  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_KEY")) {
    return res.status(500).json({ ok: false, error: "Configuração incompleta na Vercel." });
  }

  try {
    const { campos, detalhes, erro } = prepararRespostas(lerCorpo(req));
    if (erro) return res.status(400).json({ ok: false, error: erro });

    const candidatos = await buscarAlunosComNome(semAcento(campos.nome));
    let alvo = null;
    let ambiguo = false;
    if (candidatos.length === 1) {
      alvo = candidatos[0];
    } else if (candidatos.length > 1) {
      alvo = candidatos.find((a) => campos.email && a.email?.toLowerCase() === campos.email) || null;
      ambiguo = !alvo;
    }

    if (alvo) {
      const [atual] = await supa("GET", "alunos", { query: `select=*&id=eq.${alvo.id}` });
      // O nome salvo é mantido (com acento e grafia do cadastro); o do censo só serve para achar a pessoa.
      const novos = {};
      for (const [chave, valor] of Object.entries(campos)) {
        if (chave !== "nome" && valor !== null && valor !== undefined) novos[chave] = valor;
      }
      const depois = {
        ...atual,
        ...novos,
        detalhes: { ...(atual.detalhes || {}), ...detalhes },
        atualizado_em: new Date().toISOString(),
      };
      const [atualizado] = await supa("PATCH", "alunos", {
        query: `id=eq.${alvo.id}`,
        corpo: {
          ...novos,
          detalhes: depois.detalhes,
          atualizado_em: depois.atualizado_em,
        },
        preferir: "return=representation",
      });
      await registrar("editou", alvo.id, atual, atualizado);
      return res.json({ ok: true, acao: "atualizado", id: alvo.id });
    }

    const agora = new Date().toISOString();
    const [criado] = await supa("POST", "alunos", {
      corpo: { ...campos, origem: ORIGEM_NOVA, detalhes, criado_em: agora, atualizado_em: agora },
      preferir: "return=representation",
    });
    await registrar("criou", criado.id, null, criado);
    return res.json({ ok: true, acao: ambiguo ? "criado_ambiguo" : "criado", id: criado.id });
  } catch (erro) {
    console.error("Erro ao sincronizar o censo com o painel:", erro);
    return res.status(500).json({ ok: false, error: "Não foi possível atualizar o painel." });
  }
}
