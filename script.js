// ============================================================
//  CENSO GERAÇÃO TECH
//  Perguntas, opções e IDs do Google Forms – NÃO alterar os textos
//  das opções nem as entradas (entry.*), senão a planilha deixa de
//  reconhecer as respostas.
// ============================================================

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScVGJY5RXiRUuWKFCslwVxRTo85e8IWuL47ZRzgb_Si9W2T5Q/formResponse";

const API_EMAIL_URL = "https://censo-gtech.vercel.app/api/send-email";

// Campo do sistema -> entrada correspondente no Google Forms
const ENTRADAS_FORM = {
  nome: "entry.392478167",
  email: "entry.480521695",
  edicao_gt: "entry.1532253013",
  atualizacao_cadastro: "entry.321850158",
  ensino_superior: "entry.527423333",
  qual_curso: "entry.988922620",
  mercado_trabalho: "entry.1463990092",
  trabalha_tech: "entry.1163640138",
  projetos_prog: "entry.851163817",
  tipo_atuacao: "entry.581063350",
  naturalidade: "entry.1743511537",
  raca: "entry.1669362593",
  genero: "entry.1587409530",
  pcd: "entry.168974903",
  qual_pcd: "entry.156868990",
  linkedin: "entry.1788347010",
};

const questoesCenso = [
  {
    id: "edicao_gt",
    tipo: "radio",
    pergunta: "Qual sua edição no projeto Geração Tech?",
    opcoes: [
      "Edição Presencial - 2024",
      "Edição Online - 2024",
      "Edição Presencial - 2025",
      "Edição Online - 2025",
      "Edição Online - 2026",
      "Edição Presencial - 2026",
      "GT 4.0 - FullCycle Engenharia de Software (Online)",
      "GT 4.0 - FullCycle Engenharia de Software (Presencial)",
      "GT 4.0 - Desenvolvedor Full Stack (Online)",
      "GT 4.0 - Desenvolvedor Full Stack (Presencial)",
      "GT 4.0 - IA Generativa (Online)",
      "GT 4.0 - IA Generativa (Presencial)",
    ],
  },
  {
    id: "atualizacao_cadastro",
    tipo: "text",
    pergunta: "Atualização de cadastro (opcional)",
    placeholder: "Ex.: mudei de endereço, troquei de telefone…",
  },
  {
    id: "ensino_superior",
    tipo: "radio",
    pergunta: "Você está cursando o ensino superior?",
    opcoes: [
      "Sim, comecei antes do projeto",
      "Sim, comecei depois do projeto",
      "Ainda não",
      "Já sou graduado",
    ],
  },
  {
    id: "qual_curso",
    tipo: "text",
    pergunta: "Se sim, qual o curso?",
    placeholder: "Digite o nome do curso (se aplicável)",
  },
  {
    id: "mercado_trabalho",
    tipo: "radio",
    pergunta: "Você está no mercado de trabalho?",
    opcoes: ["Sim", "Ainda não"],
  },
  {
    id: "trabalha_tech",
    tipo: "radio",
    pergunta: "Se está trabalhando, está na área de tecnologia?",
    opcoes: ["Sim", "Não", "Não estou trabalhando"],
  },
  {
    id: "projetos_prog",
    tipo: "radio",
    pergunta:
      "Você está envolvido em projetos de programação no momento? (para empresa ou freelancer)",
    opcoes: ["Sim", "Não"],
  },
  {
    id: "tipo_atuacao",
    tipo: "radio",
    pergunta: "Se você atua com programação, como você está trabalhando?",
    opcoes: [
      "Free Lancer / PJ",
      "CLT",
      "Estágio",
      "Outro",
      "Não atuo na área ainda",
    ],
  },
  {
    id: "linkedin",
    tipo: "text",
    pergunta: "Insira o link do seu LinkedIn (opcional)",
    placeholder: "https://linkedin.com/in/seu-perfil",
  },
  {
    id: "naturalidade",
    tipo: "radio",
    pergunta: "Qual é a sua naturalidade?",
    opcoes: [
      "Fortaleza-CE",
      "Região Metropolitana/Interior do Ceará",
      "Nascido em outro Estado",
    ],
  },
  {
    id: "raca",
    tipo: "radio",
    pergunta: "Qual é a sua raça/cor autodeclarada?",
    opcoes: ["Branca", "Indígena", "Parda", "Preta", "Prefiro não declarar"],
  },
  {
    id: "genero",
    tipo: "radio",
    pergunta: "Qual a identidade de gênero com a qual você se identifica?",
    opcoes: [
      "Homem cis",
      "Mulher cis",
      "Homem trans",
      "Mulher trans",
      "Não-binário",
      "Outro",
    ],
  },
  {
    id: "pcd",
    tipo: "radio",
    pergunta: "Você é PCD (Pessoa com Deficiência)?",
    opcoes: ["Sim", "Não"],
  },
  {
    id: "qual_pcd",
    tipo: "text",
    pergunta: "Se sim, qual?",
    placeholder: "Descreva, se aplicável",
  },
];

// Seção exibida acima de cada pergunta
const SECAO_DA_PERGUNTA = {
  edicao_gt: "Sua participação",
  atualizacao_cadastro: "Sua participação",
  ensino_superior: "Formação",
  qual_curso: "Formação",
  mercado_trabalho: "Atuação profissional",
  trabalha_tech: "Atuação profissional",
  projetos_prog: "Atuação profissional",
  tipo_atuacao: "Atuação profissional",
  linkedin: "Atuação profissional",
  naturalidade: "Perfil",
  raca: "Perfil",
  genero: "Perfil",
  pcd: "Perfil",
  qual_pcd: "Perfil",
};

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const els = {
  progresso: $("progresso"),
  progressoTexto: $("progresso-texto"),
  progressoPct: $("progresso-pct"),
  progressoBarra: $("progresso-barra"),
  barra: document.querySelector(".barra"),
  etapa: $("etapa-nome"),
  pergunta: $("pergunta"),
  container: $("questoes-container"),
  aviso: $("feedback-questao"),
  voltar: $("anterior-questao"),
  proxima: $("proxima-questao"),
  quizForm: $("quiz-form"),
  cadastroForm: $("cadastro-form"),
  nome: $("nome"),
  email: $("email"),
  resultadoTitulo: $("titulo-resultado"),
  resultadoTexto: $("texto-resultado"),
  acoes: $("botoes-acao-container"),
};

// ---------- Estado ----------
let indiceAtual = 0;
let respostas = {};

// sessionStorage pode estar bloqueado (aba privada, etc.): sempre com try/catch
const armazenamento = {
  get(chave) {
    try { return sessionStorage.getItem(chave); } catch (e) { return null; }
  },
  set(chave, valor) {
    try { sessionStorage.setItem(chave, valor); } catch (e) { /* ignora */ }
  },
  remove(chave) {
    try { sessionStorage.removeItem(chave); } catch (e) { /* ignora */ }
  },
};

function salvarRascunho() {
  armazenamento.set("censoRascunho", JSON.stringify({ indice: indiceAtual, respostas }));
}

// ---------- Utilidades ----------
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function avisar({ icone = "info", titulo, texto }) {
  if (window.Swal) {
    return Swal.fire({ icon: icone, title: titulo, text: texto, confirmButtonColor: "#2C4156" });
  }
  alert(`${titulo}\n\n${texto}`);
  return Promise.resolve();
}

function mostrarSecao(id) {
  document.querySelectorAll(".secao").forEach((s) => s.classList.remove("ativa"));
  const secao = $(id);
  secao.classList.add("ativa");
  els.progresso.hidden = id !== "quiz";
  // Move o foco para o título da nova tela (leitores de tela e teclado)
  const titulo = secao.querySelector("h1, h2");
  if (titulo) titulo.focus({ preventScroll: false });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparAviso() {
  els.aviso.textContent = "";
}

function mostrarAviso(texto) {
  els.aviso.textContent = texto;
}

// ---------- Início / cadastro ----------
$("iniciar-quiz").addEventListener("click", () => {
  mostrarSecao("cadastro");
  els.nome.focus();
});

document.querySelectorAll("[data-voltar]").forEach((botao) => {
  botao.addEventListener("click", () => mostrarSecao(botao.dataset.voltar));
});

els.cadastroForm.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nome = els.nome.value.trim();
  const email = els.email.value.trim();

  if (nome.length < 3) {
    avisar({ icone: "warning", titulo: "Nome incompleto", texto: "Digite seu nome completo." });
    els.nome.focus();
    return;
  }
  if (!els.email.checkValidity() || !email) {
    avisar({ icone: "warning", titulo: "E-mail inválido", texto: "Confira o endereço de e-mail informado." });
    els.email.focus();
    return;
  }

  respostas.nome = nome;
  respostas.email = email;
  indiceAtual = 0;
  mostrarSecao("quiz");
  renderizarQuestao();
});

// ---------- Perguntas ----------
function renderizarQuestao() {
  const questao = questoesCenso[indiceAtual];
  const total = questoesCenso.length;
  const ultima = indiceAtual === total - 1;

  // Progresso
  const pct = Math.round(((indiceAtual + 1) / total) * 100);
  els.progressoTexto.textContent = `Questão ${indiceAtual + 1} de ${total}`;
  els.progressoPct.textContent = `${pct}%`;
  els.progressoBarra.style.width = `${pct}%`;
  els.barra.setAttribute("aria-valuenow", String(pct));

  // Cabeçalho e navegação
  els.etapa.textContent = SECAO_DA_PERGUNTA[questao.id] || "Censo";
  els.pergunta.textContent = questao.pergunta;
  els.voltar.hidden = indiceAtual === 0;
  els.proxima.textContent = ultima ? "Enviar respostas" : "Próxima";
  limparAviso();

  // Conteúdo
  els.container.innerHTML = "";
  const valorSalvo = respostas[questao.id] ?? "";

  if (questao.tipo === "radio") {
    const grupo = document.createElement("div");
    grupo.className = "opcoes";
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-labelledby", "pergunta");

    questao.opcoes.forEach((opcao) => {
      const rotulo = document.createElement("label");
      rotulo.className = "opcao";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = questao.id;
      input.value = opcao;
      input.checked = valorSalvo === opcao;

      const marca = document.createElement("span");
      marca.className = "marca";
      marca.setAttribute("aria-hidden", "true");

      const texto = document.createElement("span");
      texto.textContent = opcao;

      if (input.checked) rotulo.classList.add("selecionada");

      input.addEventListener("change", () => {
        grupo.querySelectorAll(".opcao").forEach((o) => o.classList.remove("selecionada"));
        rotulo.classList.add("selecionada");
        limparAviso();
      });

      rotulo.append(input, marca, texto);
      grupo.append(rotulo);
    });

    els.container.append(grupo);
  } else {
    const campo = document.createElement("div");
    campo.className = "campo";

    const rotulo = document.createElement("label");
    rotulo.htmlFor = `input-${questao.id}`;
    rotulo.textContent = "Sua resposta";
    rotulo.className = "sr-only";

    const input = document.createElement("input");
    input.type = "text";
    input.id = `input-${questao.id}`;
    input.className = "texto";
    input.placeholder = questao.placeholder || "";
    input.value = valorSalvo;
    input.maxLength = 200;
    input.autocomplete = "off";

    campo.append(rotulo, input);
    els.container.append(campo);
    setTimeout(() => input.focus({ preventScroll: true }), 60);
  }

  // Foco no título da pergunta para leitores de tela
  els.pergunta.focus({ preventScroll: true });
  salvarRascunho();
}

// Lê a resposta da tela atual. Retorna null se for pergunta de escolha sem seleção.
function lerRespostaAtual() {
  const questao = questoesCenso[indiceAtual];
  if (questao.tipo === "radio") {
    const marcado = document.querySelector(`input[name="${questao.id}"]:checked`);
    return marcado ? marcado.value : null;
  }
  const input = $(`input-${questao.id}`);
  return input ? input.value.trim() : "";
}

function guardarRespostaAtual() {
  const valor = lerRespostaAtual();
  if (valor !== null) respostas[questoesCenso[indiceAtual].id] = valor;
}

// Enter nos campos de texto e clique em "Próxima" passam pelo mesmo caminho
els.quizForm.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const questao = questoesCenso[indiceAtual];
  const valor = lerRespostaAtual();

  if (valor === null) {
    mostrarAviso("Escolha uma opção para continuar.");
    return;
  }

  respostas[questao.id] = valor;
  limparAviso();

  if (indiceAtual < questoesCenso.length - 1) {
    indiceAtual++;
    renderizarQuestao();
  } else {
    finalizarCenso();
  }
});

els.voltar.addEventListener("click", () => {
  if (indiceAtual === 0) return;
  guardarRespostaAtual();
  indiceAtual--;
  renderizarQuestao();
});

// ---------- Envio ----------
async function finalizarCenso() {
  els.proxima.disabled = true;
  els.voltar.disabled = true;
  els.proxima.textContent = "Enviando…";

  try {
    await enviarParaGoogleForms(respostas);
  } catch (erro) {
    console.error("Falha ao enviar o censo:", erro);
    els.proxima.disabled = false;
    els.voltar.disabled = false;
    els.proxima.textContent = "Enviar respostas";
    avisar({
      icone: "error",
      titulo: "Não conseguimos enviar",
      texto: "Verifique sua conexão e tente novamente. Suas respostas continuam preenchidas.",
    });
    return;
  }

  armazenamento.set("censoConcluido", "true");
  armazenamento.remove("censoRascunho");
  els.proxima.disabled = false;
  els.voltar.disabled = false;
  mostrarConclusao(respostas);
}

function enviarParaGoogleForms(dados) {
  const params = new URLSearchParams();
  Object.entries(ENTRADAS_FORM).forEach(([campo, entrada]) => {
    params.append(entrada, dados[campo] ?? "");
  });

  // mode "no-cors": o Google não libera a resposta para o navegador,
  // por isso só um erro de rede é detectado aqui.
  return fetch(FORM_URL, { method: "POST", body: params, mode: "no-cors" });
}

function mostrarConclusao(dados) {
  const primeiroNome = (dados.nome || "").split(" ")[0];
  els.resultadoTitulo.textContent = "Censo concluído!";
  els.resultadoTexto.textContent =
    `Obrigado${primeiroNome ? ", " + primeiroNome : ""}! Suas respostas foram registradas e ajudam a Geração Tech a conhecer melhor a nossa comunidade.`;

  els.acoes.innerHTML = "";
  if (dados.email) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-primary";
    botao.id = "enviar-email-btn";
    botao.textContent = "Receber cópia por e-mail";
    botao.addEventListener("click", () => enviarEmailCopia(dados, botao));
    els.acoes.append(botao);
  }

  mostrarSecao("resultado");
}

async function enviarEmailCopia(dados, botao) {
  botao.textContent = "Enviando…";
  botao.disabled = true;

  try {
    const resposta = await fetch(API_EMAIL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const retorno = await resposta.json();
    if (!resposta.ok || !(retorno.ok || retorno.success)) throw new Error("Erro na API");

    avisar({
      icone: "success",
      titulo: "Enviado!",
      texto: `Uma cópia das respostas foi enviada para ${dados.email}.`,
    });
    botao.textContent = "E-mail enviado";
  } catch (erro) {
    console.error(erro);
    avisar({
      icone: "error",
      titulo: "Não foi possível enviar agora",
      texto: "Seus dados já estão registrados. Tente o envio novamente em instantes.",
    });
    botao.textContent = "Tentar novamente";
    botao.disabled = false;
  }
}

// ---------- Início da página ----------
(function iniciar() {
  if (armazenamento.get("censoConcluido") === "true") {
    els.resultadoTitulo.textContent = "Censo concluído!";
    els.resultadoTexto.textContent =
      "Obrigado! Suas respostas já foram registradas anteriormente.";
    els.acoes.innerHTML = "";
    mostrarSecao("resultado");
    return;
  }

  // Recupera um rascunho se a página foi recarregada no meio do censo
  try {
    const rascunho = JSON.parse(armazenamento.get("censoRascunho") || "null");
    if (rascunho && rascunho.respostas && rascunho.respostas.nome) {
      respostas = rascunho.respostas;
      indiceAtual = Math.min(rascunho.indice || 0, questoesCenso.length - 1);
      mostrarSecao("quiz");
      renderizarQuestao();
      return;
    }
  } catch (e) { /* rascunho corrompido: começa do zero */ }

  mostrarSecao("homepage");
})();
