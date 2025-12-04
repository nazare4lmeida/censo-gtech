// --- DADOS DO CENSO ---
const questoesCenso = [
  {
    id: "edicao_gt",
    tipo: "radio",
    pergunta: "Qual sua edição no projeto Geração Tech?",
    opcoes: [
      "Edição Presencial - 2024",
      "Edição Online - 2024",
      "Edição Presencial - 2025",
      "Edição Online - 2025"
    ]
  },
  {
    id: "atualizacao_cadastro",
    tipo: "text",
    pergunta: "Atualização de Cadastro (Descrição opcional):",
    placeholder: "Ex: Mudei de endereço, troquei de telefone..."
  },
  {
    id: "ensino_superior",
    tipo: "radio",
    pergunta: "Você está cursando o ensino superior?",
    opcoes: [
      "Sim, comecei antes do projeto",
      "Sim, comecei depois do projeto",
      "Ainda não",
      "Já sou graduado"
    ]
  },
  {
    id: "qual_curso",
    tipo: "text",
    pergunta: "Se sim, qual o curso?",
    placeholder: "Digite o nome do curso (se aplicável)"
  },
  {
    id: "mercado_trabalho",
    tipo: "radio",
    pergunta: "Você está no mercado de trabalho?",
    opcoes: ["Sim", "Ainda não"]
  },
  {
    id: "trabalha_tech",
    tipo: "radio",
    pergunta: "Se está trabalhando, está na área de tecnologia?",
    opcoes: ["Sim", "Não", "Não estou trabalhando"]
  },
  {
    id: "projetos_prog",
    tipo: "radio",
    pergunta: "Você está envolvido em projetos de programação no momento? (Seja para empresa ou freelancer)",
    opcoes: ["Sim", "Não"]
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
      "Não atuo na área ainda"
    ]
  },
  {
    id: "linkedin",
    tipo: "text",
    pergunta: "Insira o link do seu LinkedIn:",
    placeholder: "https://linkedin.com/in/seu-perfil"
  },
  {
    id: "naturalidade",
    tipo: "radio",
    pergunta: "Naturalidade:",
    opcoes: [
      "Fortaleza-CE",
      "Região Metropolitana/Interior do Ceará",
      "Nascido em outro Estado"
    ]
  },
  {
    id: "raca",
    tipo: "radio",
    pergunta: "Sua Raça autodeclarada:",
    opcoes: [
      "Branca",
      "Indígena",
      "Parda",
      "Preta",
      "Prefiro não declarar"
    ]
  },
  {
    id: "pcd",
    tipo: "radio",
    pergunta: "É PCD (Pessoa com Deficiência)?",
    opcoes: ["Sim", "Não"]
  },
  {
    id: "qual_pcd",
    tipo: "text",
    pergunta: "Se sim, Qual?",
    placeholder: "Descreva se aplicável"
  }
];

// --- SELETORES DO DOM ---
const homepageSection = document.getElementById("homepage");
const iniciarQuizBtn = document.getElementById("iniciar-quiz");
const cadastroSection = document.getElementById("cadastro");
const cadastroForm = document.getElementById("cadastro-form");
const quizSection = document.getElementById("quiz");
const questoesContainer = document.getElementById("questoes-container");
const feedbackQuestaoDiv = document.getElementById("feedback-questao");
const resultadoSection = document.getElementById("resultado");
const nivelResultadoFinal = document.getElementById("nivel-resultado-final");
const analiseFinal = document.getElementById("analise-final");
const botoesAcaoContainer = document.getElementById("botoes-acao-container"); // Novo container na tela final

// --- CRIAÇÃO DOS BOTÕES DE NAVEGAÇÃO ---
// Container para os botões (Voltar e Próxima)
const navContainer = document.createElement("div");
navContainer.className = "botoes-nav";
quizSection.appendChild(navContainer);

// Botão Voltar
const anteriorQuestaoBtn = document.createElement("button");
anteriorQuestaoBtn.id = "anterior-questao";
anteriorQuestaoBtn.textContent = "Voltar";
anteriorQuestaoBtn.style.display = "none"; // Começa invisível
navContainer.appendChild(anteriorQuestaoBtn);

// Botão Próxima
const proximaQuestaoBtn = document.createElement("button");
proximaQuestaoBtn.id = "proxima-questao";
proximaQuestaoBtn.textContent = "Próxima";
navContainer.appendChild(proximaQuestaoBtn);


// --- VARIÁVEIS DE ESTADO ---
let indiceQuestaoAtual = 0;
let nomeUsuario = "";
let emailUsuario = "";
let respostasUsuario = {}; 
let censoConcluido = sessionStorage.getItem("censoConcluido") === "true";

// --- INICIALIZAÇÃO ---
function mostrarSeccao(seccao) {
  document.querySelectorAll(".quiz-section").forEach((sec) => sec.classList.remove("active"));
  document.getElementById(seccao).classList.add("active");
}

if (censoConcluido) {
  mostrarFimCenso("Obrigado! Seus dados já foram registrados anteriormente.", false);
} else {
  mostrarSeccao("homepage");
}

iniciarQuizBtn.addEventListener("click", () => {
  mostrarSeccao("cadastro");
});

cadastroForm.addEventListener("submit", (e) => {
  e.preventDefault();
  nomeUsuario = document.getElementById("nome").value;
  emailUsuario = document.getElementById("email").value;
  
  respostasUsuario["nome"] = nomeUsuario;
  respostasUsuario["email"] = emailUsuario;

  mostrarSeccao("quiz");
  exibirQuestao();
});

// --- LÓGICA DO CENSO ---

function exibirQuestao() {
  const questao = questoesCenso[indiceQuestaoAtual];
  
  // Limpa container e feedback
  questoesContainer.innerHTML = "";
  feedbackQuestaoDiv.innerHTML = ""; 
  feedbackQuestaoDiv.className = "feedback-large";

  // Gerencia visibilidade do botão Voltar
  if (indiceQuestaoAtual === 0) {
    anteriorQuestaoBtn.style.display = "none";
  } else {
    anteriorQuestaoBtn.style.display = "block"; // ou "inline-block" dependendo do flex
  }

  // Muda texto do botão Próxima se for a última
  if (indiceQuestaoAtual === questoesCenso.length - 1) {
    proximaQuestaoBtn.textContent = "Finalizar";
  } else {
    proximaQuestaoBtn.textContent = "Próxima";
  }

  // --- RENDERIZAÇÃO DA PERGUNTA ---
  let htmlContent = `
    <div class="questao">
      <div class="pergunta-header">
        <span class="questao-nivel">Questão ${indiceQuestaoAtual + 1} de ${questoesCenso.length}</span>
      </div>
      <h3>${questao.pergunta}</h3>
  `;

  // Verifica se já tem resposta salva para preencher (MEMÓRIA)
  const respostaSalva = respostasUsuario[questao.id] || "";

  if (questao.tipo === "radio") {
    htmlContent += `<div class="opcoes">`;
    questao.opcoes.forEach(opcao => {
      // Checa se essa opção é a que estava salva
      const checked = respostaSalva === opcao ? "checked" : "";
      
      htmlContent += `
        <label>
          <input type="radio" name="${questao.id}" value="${opcao}" ${checked}>
          <span>${opcao}</span>
        </label>
      `;
    });
    htmlContent += `</div>`;
  } else if (questao.tipo === "text") {
    htmlContent += `
      <div class="opcoes" style="border:none; box-shadow:none; background:transparent;">
        <input type="text" id="input-${questao.id}" 
          placeholder="${questao.placeholder || ''}" 
          value="${respostaSalva}"
          style="width: 100%; padding: 15px; margin-top: 10px; border-radius: 8px; border: 1px solid #ccc;">
      </div>
    `;
  }

  htmlContent += `</div>`;
  questoesContainer.innerHTML = htmlContent;

  // UX: Highlight na seleção
  if(questao.tipo === "radio") {
     const radios = document.querySelectorAll(`input[name="${questao.id}"]`);
     radios.forEach(radio => {
         radio.addEventListener('change', () => {
             document.querySelectorAll('.opcoes label').forEach(l => l.style.backgroundColor = ''); 
             radio.parentElement.style.backgroundColor = '#e3e8ec';
         });
         // Marca visualmente se já veio preenchido
         if(radio.checked) {
             radio.parentElement.style.backgroundColor = '#e3e8ec';
         }
     });
  }
}

// --- BOTÃO VOLTAR ---
anteriorQuestaoBtn.onclick = () => {
    if (indiceQuestaoAtual > 0) {
        indiceQuestaoAtual--;
        exibirQuestao();
    }
};

// --- BOTÃO PRÓXIMA ---
proximaQuestaoBtn.onclick = () => {
  const questao = questoesCenso[indiceQuestaoAtual];
  let resposta = "";
  let respondeu = false;

  // Captura resposta
  if (questao.tipo === "radio") {
    const selecionado = document.querySelector(`input[name="${questao.id}"]:checked`);
    if (selecionado) {
      resposta = selecionado.value;
      respondeu = true;
    }
  } else if (questao.tipo === "text") {
    const inputTexto = document.getElementById(`input-${questao.id}`);
    resposta = inputTexto.value.trim();
    respondeu = true; // Textos assumimos como opcionais ou sempre válidos por enquanto
  }

  // Validação (apenas para radios)
  if (questao.tipo === "radio" && !respondeu) {
    feedbackQuestaoDiv.innerHTML = "<p style='color: #c95151;'>Por favor, selecione uma opção.</p>";
    return;
  }

  // Salva no objeto global
  respostasUsuario[questao.id] = resposta;

  // Navegação
  indiceQuestaoAtual++;
  if (indiceQuestaoAtual < questoesCenso.length) {
    exibirQuestao();
  } else {
    finalizarCenso();
  }
};

function finalizarCenso() {
  mostrarSeccao("resultado");
  // Oculta botões de navegação
  navContainer.style.display = "none";
  
  // Envia para o Google Sheets
  enviarParaGoogleForms(respostasUsuario);
  
  // Mostra tela final com opção de email
  mostrarFimCenso("Seus dados foram coletados com sucesso. Obrigado por fazer parte do Geração Tech!", true);
  
  sessionStorage.setItem("censoConcluido", "true");
}

function mostrarFimCenso(mensagem, mostrarBotaoEmail) {
  mostrarSeccao("resultado");
  if(nivelResultadoFinal) nivelResultadoFinal.style.display = 'none';
  
  analiseFinal.innerHTML = `
    <div class="feedback-final-card" style="text-align:center;">
      <h3 style="color: #273f2f; margin-bottom: 15px;">Censo Concluído!</h3>
      <p>${mensagem}</p>
    </div>
  `;

  // Renderiza o botão de e-mail se solicitado
  if (mostrarBotaoEmail) {
      botoesAcaoContainer.innerHTML = `
        <div class="botoes-resultado">
             <button id="enviar-email-btn">Enviar cópia para meu e-mail</button>
        </div>
      `;
      
      const btnEmail = document.getElementById("enviar-email-btn");
      btnEmail.addEventListener("click", () => {
          enviarEmailCopia(respostasUsuario, btnEmail);
      });
  }
}

// --- INTEGRAÇÃO GOOGLE FORMS (Não esqueça de colocar os IDs reais!) ---
function enviarParaGoogleForms(dados) {
  const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdlahHWiLMMTDBC5PP0mUwU3RTzcUHarPfbeR5AVdGrahcIig/formResponse";
  const params = new URLSearchParams();

  params.append("entry.697814456", dados.nome);           
  params.append("entry.1742734606", dados.email);         
  
  // params.append("entry.SEU_ID_AQUI", dados.edicao_gt);
  // ... mapeie o resto aqui ...

  fetch(FORM_URL, {
    method: "POST",
    body: params,
    mode: "no-cors",
  }).catch((e) => console.error("Erro no envio forms", e));
}

// --- ENVIO DE EMAIL (API) ---
async function enviarEmailCopia(dados, botao) {
  // Feedback visual que está carregando
  botao.textContent = "Enviando...";
  botao.disabled = true;

  try {
      // IMPORTANTE: Essa API precisa estar preparada para receber o JSON com a estrutura nova do Censo
      await fetch("https://devcheck-housejs.vercel.app/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      .then(res => res.json())
      .then(data => {
          if(data.ok || data.success) { // Ajuste conforme o retorno da sua API
            Swal.fire({
                icon: "success",
                title: "Enviado!",
                text: "Uma cópia das respostas foi enviada para " + dados.email,
                confirmButtonColor: "#39586D",
            });
            botao.textContent = "E-mail Enviado!";
          } else {
             throw new Error("Erro na API");
          }
      });
  } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Ops...",
        text: "Não foi possível enviar o e-mail agora. Mas não se preocupe, seus dados já foram salvos no Censo.",
        confirmButtonColor: "#39586D",
      });
      botao.textContent = "Tentar Novamente";
      botao.disabled = false;
  }
}