(() => {
  "use strict";

  const CHAVE_TOKEN = "gt-admin-token";
  const TAMANHO_PAGINA = 50;
  const LOTE_IMPORTACAO = 300;

  // Colunas da planilha (também usadas para exportar, com estes títulos)
  const COLUNAS = [
    ["nome", "Nome"], ["email", "E-mail"], ["telefone", "Telefone"], ["linkedin", "LinkedIn"],
    ["cidade", "Cidade"], ["genero", "Gênero"], ["trabalha_tech", "Atua em tecnologia"],
    ["area_tech", "Área de tecnologia"], ["gt_listas", "GT"], ["origem", "Origem do cadastro"],
    ["edicao", "Edição (último censo)"], ["curso_superior", "Curso superior"],
    ["naturalidade", "Naturalidade"], ["raca", "Raça"], ["pcd", "PCD"], ["qual_pcd", "PCD – qual"],
    ["confianca", "Confiança"], ["observacoes", "Observações"],
  ];

  // Cabeçalho da planilha (normalizado: sem acento, sem pontuação) -> campo do sistema.
  // Cabeçalhos desconhecidos vão para "detalhes", então nada se perde na importação.
  const normalizarCabecalho = (t) =>
    String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
  const MAPA_CAMPOS = Object.fromEntries(COLUNAS.map(([campo, titulo]) => [normalizarCabecalho(titulo), campo]));
  Object.assign(MAPA_CAMPOS, {
    "nome completo": "nome",
    "e mail s": "email",
    "telefone s": "telefone",
    "listas gt aba de origem": "gt_listas",
    "curso superior curso": "curso_superior",
    "raca autodeclarada": "raca",
    "observacoes de conferencia": "observacoes",
    "area de tecnologia": "area_tech",
  });

  const CAMPOS_FORM = [
    "nome", "email", "telefone", "linkedin", "cidade", "genero", "trabalha_tech", "area_tech",
    "gt_listas", "edicao", "curso_superior", "naturalidade", "raca", "pcd", "qual_pcd",
    "origem", "confianca", "observacoes",
  ];

  const ROTULOS_ACAO = { criou: "Cadastrado", editou: "Editado", excluiu: "Excluído", importou: "Importação" };

  const $ = (seletor) => document.querySelector(seletor);

  const estado = {
    token: lerToken(),
    filtros: { busca: "", cidade: "", genero: "", trabalha_tech: "", gt: "" },
    pagina: 1,
    total: 0,
    alunoId: null,
    importacao: null,
    buscaTimer: null,
  };

  // ---------- Armazenamento e chamadas à API ----------

  function lerToken() {
    try { return sessionStorage.getItem(CHAVE_TOKEN) || ""; } catch { return ""; }
  }

  function guardarToken(token) {
    try {
      if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
      else sessionStorage.removeItem(CHAVE_TOKEN);
    } catch { /* navegador sem armazenamento: o painel segue funcionando */ }
    estado.token = token || "";
  }

  async function api(acao, { metodo = "GET", params = {}, corpo } = {}) {
    const qs = new URLSearchParams({ acao, ...params }).toString();
    const headers = {};
    if (estado.token) headers.Authorization = `Bearer ${estado.token}`;
    if (corpo !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`/api/admin?${qs}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    let dados = {};
    try { dados = await res.json(); } catch { /* resposta sem JSON */ }

    if (res.status === 401 && acao !== "login") {
      sair();
      throw new Error("Sessão expirada. Entre novamente.");
    }
    if (!res.ok || dados.ok === false) {
      throw new Error(dados.error || "Algo deu errado. Tente novamente.");
    }
    return dados;
  }

  // ---------- Utilitários de tela ----------

  function avisar(seletor, mensagem) {
    $(seletor).textContent = mensagem || "";
  }

  function limparParams(obj) {
    const saida = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== "" && v !== null && v !== undefined) saida[k] = String(v);
    }
    return saida;
  }

  function textoOuTraco(valor) {
    return valor === null || valor === undefined || valor === "" ? "—" : String(valor);
  }

  function formatarData(iso) {
    try {
      return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch { return iso; }
  }

  function preencherSelect(seletor, valores, rotuloTodos) {
    const select = $(seletor);
    const atual = select.value;
    select.innerHTML = "";
    select.append(new Option(rotuloTodos, ""));
    for (const v of valores) select.append(new Option(v, v));
    if ([...select.options].some((o) => o.value === atual)) select.value = atual;
  }

  function preencherDatalist(seletor, valores) {
    const lista = $(seletor);
    lista.innerHTML = "";
    for (const v of valores) {
      const opt = document.createElement("option");
      opt.value = v;
      lista.append(opt);
    }
  }

  // ---------- Login e sessão ----------

  function mostrarLogin() {
    $("#tela-painel").hidden = true;
    $("#tela-login").hidden = false;
    avisar("#aviso-login", "");
    setTimeout(() => $("#senha").focus(), 50);
  }

  function mostrarPainel() {
    $("#tela-login").hidden = true;
    $("#tela-painel").hidden = false;
    carregarOpcoes();
    carregarLista();
  }

  function sair() {
    guardarToken("");
    fecharModais();
    mostrarLogin();
  }

  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = $("#senha").value;
    avisar("#aviso-login", "");
    if (!senha) return avisar("#aviso-login", "Digite a senha.");
    try {
      const { token } = await api("login", { metodo: "POST", corpo: { senha } });
      guardarToken(token);
      $("#senha").value = "";
      mostrarPainel();
    } catch (erro) {
      avisar("#aviso-login", erro.message);
    }
  });

  $("#btn-sair").addEventListener("click", sair);

  // ---------- Filtros e lista ----------

  async function carregarOpcoes() {
    try {
      const { cidades, generos, gts } = await api("opcoes");
      const cidadeAtual = $("#filtro-cidade").value;
      preencherSelect("#filtro-cidade", cidades, "Todas");
      preencherSelect("#filtro-genero", generos, "Todos");
      preencherSelect("#filtro-gt", gts, "Todos");
      $("#filtro-cidade").value = cidadeAtual;
      preencherDatalist("#lista-cidades", cidades);
      preencherDatalist("#lista-generos", generos);
    } catch (erro) {
      avisar("#aviso-painel", erro.message);
    }
  }

  function lerFiltrosDaTela() {
    estado.filtros = {
      busca: $("#busca").value.trim(),
      cidade: $("#filtro-cidade").value,
      genero: $("#filtro-genero").value,
      trabalha_tech: $("#filtro-tec").value,
      gt: $("#filtro-gt").value,
    };
  }

  function mudouFiltro() {
    lerFiltrosDaTela();
    estado.pagina = 1;
    carregarLista();
  }

  $("#busca").addEventListener("input", () => {
    clearTimeout(estado.buscaTimer);
    estado.buscaTimer = setTimeout(mudouFiltro, 300);
  });
  ["#filtro-cidade", "#filtro-genero", "#filtro-tec", "#filtro-gt"].forEach((s) =>
    $(s).addEventListener("change", mudouFiltro)
  );

  $("#limpar-filtros").addEventListener("click", () => {
    $("#busca").value = "";
    $("#filtro-cidade").value = "";
    $("#filtro-genero").value = "";
    $("#filtro-tec").value = "";
    $("#filtro-gt").value = "";
    mudouFiltro();
  });

  async function carregarLista() {
    const corpo = $("#corpo-tabela");
    corpo.innerHTML = `<tr><td colspan="6" class="vazio">Carregando…</td></tr>`;
    try {
      const dados = await api("listar", {
        params: limparParams({ ...estado.filtros, pagina: estado.pagina }),
      });
      estado.total = dados.total;
      renderizarLinhas(dados.alunos);
      atualizarPaginacao(dados);
    } catch (erro) {
      corpo.innerHTML = "";
      avisar("#aviso-painel", erro.message);
    }
  }

  function celula(texto, classes = "") {
    const td = document.createElement("td");
    td.className = classes;
    td.textContent = textoOuTraco(texto);
    return td;
  }

  function renderizarLinhas(alunos) {
    const corpo = $("#corpo-tabela");
    corpo.innerHTML = "";
    if (!alunos.length) {
      corpo.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum aluno encontrado com esses filtros.</td></tr>`;
      return;
    }
    for (const a of alunos) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.dataset.id = a.id;
      tr.append(celula(a.nome, "nome"));
      tr.append(celula(a.email, "fraco"));
      tr.append(celula(a.telefone, "fraco so-desktop"));
      tr.append(celula(a.cidade, "fraco"));

      const tdTec = document.createElement("td");
      tdTec.className = "so-desktop";
      if (a.trabalha_tech === "Sim") {
        const etiqueta = document.createElement("span");
        etiqueta.className = "etiqueta sim";
        etiqueta.textContent = "Sim";
        tdTec.append(etiqueta);
      } else {
        tdTec.textContent = textoOuTraco(a.trabalha_tech);
        tdTec.classList.add("fraco");
      }
      tr.append(tdTec);
      tr.append(celula(a.gt_listas, "fraco so-desktop"));
      corpo.append(tr);
    }
  }

  function atualizarPaginacao({ total, pagina, tamanho }) {
    const paginas = Math.max(1, Math.ceil(total / (tamanho || TAMANHO_PAGINA)));
    $("#contagem").textContent = `${total} aluno${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}`;
    $("#pag-info").textContent = `Página ${pagina} de ${paginas}`;
    $("#pag-anterior").disabled = pagina <= 1;
    $("#pag-proxima").disabled = pagina >= paginas;
  }

  $("#pag-anterior").addEventListener("click", () => {
    if (estado.pagina > 1) {
      estado.pagina--;
      carregarLista();
    }
  });
  $("#pag-proxima").addEventListener("click", () => {
    estado.pagina++;
    carregarLista();
  });

  $("#corpo-tabela").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) abrirAluno(tr.dataset.id);
  });
  $("#corpo-tabela").addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      abrirAluno(tr.dataset.id);
    }
  });

  // ---------- Modais (base) ----------

  let focoAnterior = null;

  function abrirModal(seletor) {
    focoAnterior = document.activeElement;
    $(seletor).hidden = false;
    const primeiro = $(seletor).querySelector("input, select, textarea, button:not(.fechar)");
    if (primeiro) setTimeout(() => primeiro.focus(), 30);
  }

  function fecharModal(seletor) {
    $(seletor).hidden = true;
    if (focoAnterior && document.body.contains(focoAnterior)) focoAnterior.focus();
  }

  function fecharModais() {
    ["#modal-aluno", "#modal-importar"].forEach((s) => ($(s).hidden = true));
  }

  document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-fechar]");
    const modal = botao ? botao.closest(".modal") : e.target.classList.contains("modal") ? e.target : null;
    if (modal) fecharModal(`#${modal.id}`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#modal-importar").hidden) fecharModal("#modal-importar");
    else if (!$("#modal-aluno").hidden) fecharModal("#modal-aluno");
  });

  // ---------- Modal: aluno (novo, editar, excluir) ----------

  function preencherForm(aluno) {
    const form = $("#form-aluno");
    for (const campo of CAMPOS_FORM) {
      form.elements[campo].value = aluno?.[campo] ?? "";
    }
  }

  function lerForm() {
    const form = $("#form-aluno");
    const corpo = {};
    for (const campo of CAMPOS_FORM) corpo[campo] = form.elements[campo].value;
    return corpo;
  }

  function mostrarHistorico(historico) {
    const lista = $("#lista-historico");
    lista.innerHTML = "";
    for (const item of historico) {
      const li = document.createElement("li");
      let texto = `${ROTULOS_ACAO[item.acao] || item.acao} · ${formatarData(item.criado_em)}`;
      if (item.acao === "editou") {
        const campos = camposAlterados(item.antes, item.depois);
        if (campos.length) texto += ` · campos: ${campos.join(", ")}`;
      }
      li.textContent = texto;
      lista.append(li);
    }
  }

  function camposAlterados(antes = {}, depois = {}) {
    return COLUNAS.filter(([campo]) => String(antes[campo] ?? "") !== String(depois[campo] ?? ""))
      .map(([, titulo]) => titulo);
  }

  function abrirNovo() {
    estado.alunoId = null;
    $("#titulo-aluno").textContent = "Novo aluno";
    $("#btn-excluir").hidden = true;
    $("#bloco-historico").hidden = true;
    $("#confirma-exclusao").hidden = true;
    $("#form-aluno").reset();
    preencherForm(null);
    avisar("#aviso-aluno", "");
    abrirModal("#modal-aluno");
  }

  async function abrirAluno(id) {
    try {
      const { aluno, historico } = await api("ver", { params: { id } });
      estado.alunoId = id;
      $("#titulo-aluno").textContent = aluno.nome || "Aluno";
      $("#btn-excluir").hidden = false;
      $("#confirma-exclusao").hidden = true;
      $("#bloco-historico").hidden = false;
      $("#bloco-historico").open = false;
      preencherForm(aluno);
      mostrarHistorico(historico);
      avisar("#aviso-aluno", "");
      abrirModal("#modal-aluno");
    } catch (erro) {
      avisar("#aviso-painel", erro.message);
    }
  }

  $("#btn-novo").addEventListener("click", abrirNovo);

  $("#form-aluno").addEventListener("submit", async (e) => {
    e.preventDefault();
    avisar("#aviso-aluno", "");
    const corpo = lerForm();
    if (!corpo.nome.trim()) return avisar("#aviso-aluno", "Informe o nome do aluno.");

    const botao = $("#btn-salvar");
    botao.disabled = true;
    try {
      if (estado.alunoId) {
        await api("atualizar", { metodo: "PUT", params: { id: estado.alunoId }, corpo });
      } else {
        await api("criar", { metodo: "POST", corpo });
      }
      fecharModal("#modal-aluno");
      avisar("#aviso-painel", estado.alunoId ? "Alterações salvas." : "Aluno cadastrado.");
      carregarOpcoes();
      carregarLista();
    } catch (erro) {
      avisar("#aviso-aluno", erro.message);
    } finally {
      botao.disabled = false;
    }
  });

  $("#btn-excluir").addEventListener("click", () => {
    $("#nome-exclusao").textContent = $("#f-nome").value || "este aluno";
    $("#confirma-exclusao").hidden = false;
    $("#cancelar-exclusao").focus();
  });
  $("#cancelar-exclusao").addEventListener("click", () => {
    $("#confirma-exclusao").hidden = true;
  });
  $("#confirmar-exclusao").addEventListener("click", async () => {
    const botao = $("#confirmar-exclusao");
    botao.disabled = true;
    try {
      await api("excluir", { metodo: "DELETE", params: { id: estado.alunoId } });
      fecharModal("#modal-aluno");
      avisar("#aviso-painel", "Aluno excluído.");
      carregarOpcoes();
      carregarLista();
    } catch (erro) {
      avisar("#aviso-aluno", erro.message);
      $("#confirma-exclusao").hidden = true;
    } finally {
      botao.disabled = false;
    }
  });

  // ---------- Importação ----------

  function mapearLinha(linha) {
    const registro = { detalhes: {} };
    let vazia = true;
    for (const [cabecalho, valor] of Object.entries(linha)) {
      const texto = valor === null || valor === undefined ? "" : String(valor).trim();
      if (!texto) continue;
      vazia = false;
      const campo = MAPA_CAMPOS[normalizarCabecalho(cabecalho)];
      if (campo) registro[campo] = texto;
      else registro.detalhes[cabecalho] = texto;
    }
    return vazia ? null : registro;
  }

  function resetarImportacao() {
    estado.importacao = null;
    $("#arquivo-importar").value = "";
    $("#previa-importar").hidden = true;
    $("#previa-importar").textContent = "";
    $("#progresso-importar").hidden = true;
    $("#barra-importar").style.width = "0";
    $("#texto-importar").textContent = "";
    $("#btn-confirmar-importar").disabled = true;
    avisar("#aviso-importar", "");
  }

  $("#btn-importar").addEventListener("click", () => {
    resetarImportacao();
    abrirModal("#modal-importar");
  });

  async function enviarLotes(gravar, aoProgredir) {
    const registros = estado.importacao.registros;
    const totais = { novos: 0, repetidos: 0, semNome: 0 };
    for (let i = 0; i < registros.length; i += LOTE_IMPORTACAO) {
      const lote = registros.slice(i, i + LOTE_IMPORTACAO);
      const r = await api("importar", { metodo: "POST", corpo: { registros: lote, gravar } });
      totais.novos += r.novos;
      totais.repetidos += r.repetidos;
      totais.semNome += r.semNome;
      aoProgredir(Math.min(i + lote.length, registros.length), registros.length);
    }
    return totais;
  }

  $("#arquivo-importar").addEventListener("change", async (e) => {
    const arquivo = e.target.files[0];
    resetarImportacao();
    if (!arquivo) return;
    if (typeof XLSX === "undefined") {
      return avisar("#aviso-importar", "Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.");
    }

    try {
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
      const aba = wb.SheetNames.includes("Base Completa") ? "Base Completa" : wb.SheetNames[0];
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { defval: "" });
      const registros = linhas.map(mapearLinha).filter(Boolean);
      if (!registros.length) {
        return avisar("#aviso-importar", "A planilha não tem linhas preenchidas.");
      }
      estado.importacao = { registros };

      $("#previa-importar").hidden = false;
      $("#previa-importar").textContent = "Conferindo a planilha…";
      $("#progresso-importar").hidden = false;

      const previa = await enviarLotes(false, (feitos, total) => {
        $("#barra-importar").style.width = `${Math.round((feitos / total) * 100)}%`;
        $("#texto-importar").textContent = `Conferindo ${feitos} de ${total} linhas…`;
      });

      $("#progresso-importar").hidden = true;
      $("#previa-importar").innerHTML = "";
      const linhasPrevia = [
        `<strong>${registros.length}</strong> linhas lidas na planilha`,
        `<strong>${previa.novos}</strong> novos alunos para cadastrar`,
        `<strong>${previa.repetidos}</strong> já cadastrados (não entram de novo)`,
        `<strong>${previa.semNome}</strong> sem nome (não entram)`,
      ];
      $("#previa-importar").innerHTML = linhasPrevia.join("<br>");
      $("#btn-confirmar-importar").disabled = previa.novos === 0;
      $("#btn-confirmar-importar").textContent = previa.novos
        ? `Importar ${previa.novos} aluno${previa.novos === 1 ? "" : "s"}`
        : "Nada novo para importar";
    } catch (erro) {
      $("#previa-importar").hidden = true;
      $("#progresso-importar").hidden = true;
      avisar("#aviso-importar", erro.message || "Não foi possível ler a planilha.");
    }
  });

  $("#btn-confirmar-importar").addEventListener("click", async () => {
    if (!estado.importacao) return;
    const botao = $("#btn-confirmar-importar");
    botao.disabled = true;
    avisar("#aviso-importar", "");
    $("#progresso-importar").hidden = false;
    try {
      const totais = await enviarLotes(true, (feitos, total) => {
        $("#barra-importar").style.width = `${Math.round((feitos / total) * 100)}%`;
        $("#texto-importar").textContent = `Gravando ${feitos} de ${total} linhas…`;
      });
      fecharModal("#modal-importar");
      avisar("#aviso-painel", `${totais.novos} aluno${totais.novos === 1 ? "" : "s"} importado${totais.novos === 1 ? "" : "s"}.`);
      estado.pagina = 1;
      carregarOpcoes();
      carregarLista();
    } catch (erro) {
      avisar("#aviso-importar", `${erro.message} Nada além do que já foi gravado foi salvo; tente importar de novo.`);
      botao.disabled = false;
    }
  });

  // ---------- Exportação ----------

  $("#btn-exportar").addEventListener("click", async () => {
    avisar("#aviso-painel", "Preparando a planilha…");
    try {
      if (typeof XLSX === "undefined") throw new Error("Não foi possível carregar o gerador de planilhas.");
      lerFiltrosDaTela();
      const { alunos } = await api("exportar", { params: limparParams(estado.filtros) });
      if (!alunos.length) return avisar("#aviso-painel", "Nenhum aluno para exportar com esses filtros.");

      const extras = [...new Set(alunos.flatMap((a) => Object.keys(a.detalhes || {})))];
      const cabecalhos = [...COLUNAS.map(([, titulo]) => titulo), ...extras];
      const linhas = alunos.map((a) => {
        const linha = {};
        COLUNAS.forEach(([campo, titulo]) => (linha[titulo] = a[campo] ?? ""));
        extras.forEach((chave) => (linha[chave] = a.detalhes?.[chave] ?? ""));
        return linha;
      });

      const ws = XLSX.utils.json_to_sheet(linhas, { header: cabecalhos });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Alunos");
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `alunos-gt-${hoje}.xlsx`);
      avisar("#aviso-painel", `${alunos.length} aluno${alunos.length === 1 ? "" : "s"} exportado${alunos.length === 1 ? "" : "s"}.`);
    } catch (erro) {
      avisar("#aviso-painel", erro.message);
    }
  });

  // ---------- Início ----------

  if (estado.token) mostrarPainel();
  else mostrarLogin();
})();
