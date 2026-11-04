import crypto from "crypto";

// Painel admin do censo. Toda operação passa por aqui.
// O banco (Supabase) só é acessado pelo servidor, com a chave service_role,
// que nunca vai para o navegador.

const TAMANHO_PAGINA = 50;
const LOTE_LEITURA = 1000;
const LOTE_GRAVACAO = 300;
const MAX_REGISTROS_IMPORTACAO = 500;
const DURACAO_SESSAO_H = 12;
const COLUNAS_LISTA = "id,nome,email,telefone,cidade,genero,trabalha_tech,gt_listas,edicao";
const CAMPOS = [
  "nome", "email", "telefone", "linkedin", "cidade", "genero", "trabalha_tech",
  "area_tech", "gt_listas", "origem", "edicao", "curso_superior", "naturalidade",
  "raca", "pcd", "qual_pcd", "confianca", "observacoes",
];
const SIM_NAO = ["Sim", "Não", "Sem resposta"];
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const env = (nome) => (process.env[nome] || "").trim();

function configuracaoCompleta() {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "ADMIN_PASSWORD", "ADMIN_SECRET"].every(env);
}

// ---------- Sessão (token assinado, sem guardar nada no servidor) ----------

function assinar(texto) {
  return crypto.createHmac("sha256", env("ADMIN_SECRET")).update(texto).digest("base64url");
}

function criarToken() {
  const corpo = Buffer.from(
    JSON.stringify({ exp: Date.now() + DURACAO_SESSAO_H * 3600_000 })
  ).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

function sessaoValida(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return false;
  const a = Buffer.from(assinatura);
  const b = Buffer.from(assinar(corpo));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    return Date.now() < JSON.parse(Buffer.from(corpo, "base64url").toString()).exp;
  } catch {
    return false;
  }
}

function senhaCorreta(senha) {
  const a = Buffer.from(String(senha ?? ""));
  const b = Buffer.from(env("ADMIN_PASSWORD"));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Texto, e-mail e telefone ----------

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

function emailsDe(texto) {
  const emails = String(texto ?? "")
    .split(/[;,\s/]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => REGEX_EMAIL.test(e));
  return [...new Set(emails)];
}

// Devolve só os números de telefones válidos (10 ou 11 dígitos, com ou sem 55).
function telefonesDe(texto) {
  return String(texto ?? "")
    .split(/[;,/]+/)
    .map((parte) => {
      const d = parte.replace(/\D/g, "");
      return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
    })
    .filter((d) => d.length === 10 || d.length === 11);
}

function formatarTelefone(digitos) {
  const d = digitos.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return null;
}

// Valida e limpa os dados vindos do formulário manual.
function prepararAluno(corpo) {
  const dados = {};
  for (const campo of CAMPOS) {
    if (corpo[campo] !== undefined) dados[campo] = textoOuNulo(corpo[campo]);
  }
  if (!dados.nome) return { erro: "Informe o nome." };
  if (dados.email) {
    const emails = emailsDe(dados.email);
    if (!emails.length) return { erro: "E-mail inválido." };
    dados.email = emails.join("; ");
  }
  if (dados.telefone) {
    const fone = telefonesDe(dados.telefone)[0];
    if (!fone) return { erro: "Telefone precisa ter DDD e número (10 ou 11 dígitos)." };
    dados.telefone = formatarTelefone(fone);
  }
  if (dados.trabalha_tech && !SIM_NAO.includes(dados.trabalha_tech)) {
    return { erro: "Valor inválido em 'Atua em tecnologia'." };
  }
  return { dados };
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

  // content-range vem como "0-49/4285" quando pedimos count=exact
  const intervalo = res.headers.get("content-range") || "";
  const total = intervalo.includes("/") ? Number(intervalo.split("/")[1]) : null;
  return { dados: texto ? JSON.parse(texto) : null, total };
}

// Lê todos os alunos que atendem ao filtro, em lotes (o banco limita cada leitura).
async function buscarTodos(filtro, colunas) {
  const linhas = [];
  for (let inicio = 0; ; inicio += LOTE_LEITURA) {
    const query = [
      `select=${colunas}`,
      filtro,
      "order=nome.asc",
      `limit=${LOTE_LEITURA}`,
      `offset=${inicio}`,
    ].filter(Boolean).join("&");
    const { dados } = await supa("GET", "alunos", { query });
    linhas.push(...dados);
    if (dados.length < LOTE_LEITURA) return linhas;
  }
}

async function registrar(acao, alunoId, antes, depois) {
  try {
    await supa("POST", "alteracoes", {
      corpo: { acao, aluno_id: alunoId ?? null, antes: antes ?? null, depois: depois ?? null },
      preferir: "return=minimal",
    });
  } catch (erro) {
    console.error("Falha ao registrar alteração:", erro);
  }
}

// ---------- Filtros da lista ----------

function limparBusca(texto) {
  return String(texto ?? "").replace(/[^\p{L}\p{N}\s@._+-]/gu, "").trim().slice(0, 80);
}

function filtrosDe(params) {
  const f = new URLSearchParams();
  const busca = limparBusca(params.busca);
  if (busca) {
    f.set("or", `(nome.ilike.*${busca}*,email.ilike.*${busca}*,telefone.ilike.*${busca}*)`);
  }
  if (params.cidade) f.set("cidade", `eq.${String(params.cidade).slice(0, 80)}`);
  if (params.genero) f.set("genero", `eq.${String(params.genero).slice(0, 80)}`);
  if (SIM_NAO.includes(params.trabalha_tech)) f.set("trabalha_tech", `eq.${params.trabalha_tech}`);
  if (/^GT [0-9]{1,2}$/.test(params.gt ?? "")) f.set("gt_listas", `like.*${params.gt}*`);
  return f;
}

async function emailEmUso(email, idIgnorado) {
  const principal = emailsDe(email)[0];
  if (!principal) return null;
  const q = new URLSearchParams({ select: "id,nome", email: `ilike.${principal}`, limit: "1" });
  if (idIgnorado) q.set("id", `neq.${idIgnorado}`);
  const { dados } = await supa("GET", "alunos", { query: q.toString() });
  return dados[0] || null;
}

// ---------- Importação ----------

// Um registro é repetido quando o nome é igual a um já cadastrado E há contato
// em comum (e-mail ou telefone), ou quando um dos dois lados não tem contato.
// Pessoas diferentes que dividem o mesmo e-mail/telefone com nomes diferentes entram normalmente.
async function importar(corpo) {
  const registros = Array.isArray(corpo.registros)
    ? corpo.registros.slice(0, MAX_REGISTROS_IMPORTACAO)
    : [];
  const gravar = corpo.gravar === true;

  const existentes = await buscarTodos("", "nome,email,telefone");
  const indice = new Map();
  const indexar = (chave, emails, fones) => {
    if (!indice.has(chave)) indice.set(chave, []);
    indice.get(chave).push({ emails: new Set(emails), fones: new Set(fones) });
  };
  for (const e of existentes) {
    indexar(semAcento(e.nome), emailsDe(e.email), telefonesDe(e.telefone));
  }

  const repetido = (chave, emails, fones) =>
    (indice.get(chave) || []).some((p) => {
      const semContato = emails.length + fones.length === 0 || p.emails.size + p.fones.size === 0;
      const compartilha = emails.some((e) => p.emails.has(e)) || fones.some((f) => p.fones.has(f));
      return semContato || compartilha;
    });

  const contagem = { novos: 0, repetidos: 0, semNome: 0 };
  const aInserir = [];

  for (const r of registros) {
    const nome = textoOuNulo(r.nome);
    if (!nome) {
      contagem.semNome++;
      continue;
    }
    const emails = emailsDe(r.email);
    const fones = telefonesDe(r.telefone);
    const chave = semAcento(nome);

    if (repetido(chave, emails, fones)) {
      contagem.repetidos++;
      continue;
    }
    indexar(chave, emails, fones);

    const aluno = { nome };
    for (const campo of CAMPOS) {
      if (campo === "nome" || campo === "email" || campo === "telefone") continue;
      aluno[campo] = textoOuNulo(r[campo]);
    }
    aluno.email = emails.length ? emails.join("; ") : textoOuNulo(r.email);
    aluno.telefone = fones.length ? formatarTelefone(fones[0]) : textoOuNulo(r.telefone);
    aluno.detalhes = {};
    if (r.detalhes && typeof r.detalhes === "object") {
      for (const [chaveDetalhe, valor] of Object.entries(r.detalhes)) {
        const texto = textoOuNulo(valor);
        if (texto && chaveDetalhe.length <= 80) {
          aluno.detalhes[chaveDetalhe.slice(0, 80)] = texto.slice(0, 10000);
        }
      }
    }
    aInserir.push(aluno);
    contagem.novos++;
  }

  if (gravar && aInserir.length) {
    const agora = new Date().toISOString();
    for (let i = 0; i < aInserir.length; i += LOTE_GRAVACAO) {
      const lote = aInserir
        .slice(i, i + LOTE_GRAVACAO)
        .map((a) => ({ ...a, criado_em: agora, atualizado_em: agora }));
      await supa("POST", "alunos", { corpo: lote, preferir: "return=minimal" });
      await registrar("importou", null, null, { quantidade: lote.length });
    }
  }

  return { ok: true, gravado: gravar, ...contagem };
}

// ---------- Rotas ----------

function lerCorpo(req) {
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  return req.body ?? {};
}

function metodoInvalido(res) {
  return res.status(405).json({ ok: false, error: "Método não permitido." });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const acao = String(req.query?.acao ?? "");
  const params = req.query || {};

  try {
    if (acao === "login") {
      if (req.method !== "POST") return metodoInvalido(res);
      if (!configuracaoCompleta()) {
        return res.status(500).json({
          ok: false,
          error: "Configuração incompleta na Vercel: SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_PASSWORD e ADMIN_SECRET.",
        });
      }
      if (!senhaCorreta(lerCorpo(req).senha)) {
        return res.status(401).json({ ok: false, error: "Senha incorreta." });
      }
      return res.json({ ok: true, token: criarToken() });
    }

    if (!configuracaoCompleta()) {
      return res.status(500).json({ ok: false, error: "Configuração incompleta na Vercel." });
    }
    if (!sessaoValida(req)) {
      return res.status(401).json({ ok: false, error: "Sessão expirada. Entre novamente." });
    }

    switch (acao) {
      case "listar": {
        if (req.method !== "GET") return metodoInvalido(res);
        const pagina = Math.max(1, Number.parseInt(params.pagina, 10) || 1);
        const f = filtrosDe(params);
        f.set("select", COLUNAS_LISTA);
        f.set("order", "nome.asc");
        f.set("limit", String(TAMANHO_PAGINA));
        f.set("offset", String((pagina - 1) * TAMANHO_PAGINA));
        const { dados, total } = await supa("GET", "alunos", {
          query: f.toString(),
          preferir: "count=exact",
        });
        return res.json({
          ok: true,
          alunos: dados,
          total: total ?? dados.length,
          pagina,
          tamanho: TAMANHO_PAGINA,
        });
      }

      case "opcoes": {
        if (req.method !== "GET") return metodoInvalido(res);
        const linhas = await buscarTodos("", "cidade,genero,gt_listas");
        const cidades = new Set();
        const generos = new Set();
        const gts = new Set();
        for (const l of linhas) {
          if (l.cidade) cidades.add(l.cidade);
          if (l.genero) generos.add(l.genero);
          for (const parte of String(l.gt_listas || "").split(",")) {
            const gt = parte.trim();
            if (/^GT [0-9]{1,2}$/.test(gt)) gts.add(gt);
          }
        }
        const ordenar = (conjunto) => [...conjunto].sort((a, b) => a.localeCompare(b, "pt-BR"));
        return res.json({ ok: true, cidades: ordenar(cidades), generos: ordenar(generos), gts: ordenar(gts) });
      }

      case "exportar": {
        if (req.method !== "GET") return metodoInvalido(res);
        const alunos = await buscarTodos(filtrosDe(params).toString(), "*");
        return res.json({ ok: true, alunos });
      }

      case "ver": {
        if (req.method !== "GET") return metodoInvalido(res);
        const id = String(params.id || "");
        if (!REGEX_UUID.test(id)) return res.status(400).json({ ok: false, error: "Aluno inválido." });
        const { dados } = await supa("GET", "alunos", { query: `select=*&id=eq.${id}` });
        if (!dados.length) return res.status(404).json({ ok: false, error: "Aluno não encontrado." });
        const { dados: historico } = await supa("GET", "alteracoes", {
          query: `select=acao,antes,depois,criado_em&aluno_id=eq.${id}&order=criado_em.desc&limit=10`,
        });
        return res.json({ ok: true, aluno: dados[0], historico });
      }

      case "criar": {
        if (req.method !== "POST") return metodoInvalido(res);
        const { dados, erro } = prepararAluno(lerCorpo(req));
        if (erro) return res.status(400).json({ ok: false, error: erro });
        const outro = await emailEmUso(dados.email);
        if (outro) {
          return res.status(409).json({ ok: false, error: `Já existe um aluno com este e-mail: ${outro.nome}.` });
        }
        const agora = new Date().toISOString();
        const { dados: criado } = await supa("POST", "alunos", {
          corpo: { ...dados, criado_em: agora, atualizado_em: agora },
          preferir: "return=representation",
        });
        const aluno = criado[0];
        await registrar("criou", aluno.id, null, aluno);
        return res.json({ ok: true, aluno });
      }

      case "atualizar": {
        if (req.method !== "PUT") return metodoInvalido(res);
        const id = String(params.id || "");
        if (!REGEX_UUID.test(id)) return res.status(400).json({ ok: false, error: "Aluno inválido." });
        const { dados: atuais } = await supa("GET", "alunos", { query: `select=*&id=eq.${id}` });
        if (!atuais.length) return res.status(404).json({ ok: false, error: "Aluno não encontrado." });
        const { dados, erro } = prepararAluno(lerCorpo(req));
        if (erro) return res.status(400).json({ ok: false, error: erro });
        const outro = await emailEmUso(dados.email, id);
        if (outro) {
          return res.status(409).json({ ok: false, error: `Já existe outro aluno com este e-mail: ${outro.nome}.` });
        }
        const { dados: atualizado } = await supa("PATCH", "alunos", {
          query: `id=eq.${id}`,
          corpo: { ...dados, atualizado_em: new Date().toISOString() },
          preferir: "return=representation",
        });
        await registrar("editou", id, atuais[0], atualizado[0]);
        return res.json({ ok: true, aluno: atualizado[0] });
      }

      case "excluir": {
        if (req.method !== "DELETE") return metodoInvalido(res);
        const id = String(params.id || "");
        if (!REGEX_UUID.test(id)) return res.status(400).json({ ok: false, error: "Aluno inválido." });
        const { dados: atuais } = await supa("GET", "alunos", { query: `select=*&id=eq.${id}` });
        if (!atuais.length) return res.status(404).json({ ok: false, error: "Aluno não encontrado." });
        await supa("DELETE", "alunos", { query: `id=eq.${id}`, preferir: "return=minimal" });
        await registrar("excluiu", id, atuais[0], null);
        return res.json({ ok: true });
      }

      case "importar": {
        if (req.method !== "POST") return metodoInvalido(res);
        return res.json(await importar(lerCorpo(req)));
      }

      default:
        return res.status(400).json({ ok: false, error: "Ação desconhecida." });
    }
  } catch (erro) {
    console.error("Erro no painel admin:", erro);
    return res.status(500).json({ ok: false, error: "Não foi possível concluir. Tente novamente." });
  }
}
