import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Escapa o texto digitado pelo usuário antes de colocar no e-mail
function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export default async function handler(req, res) {
  // 1. Configuração de CORS (Importante para não dar erro no navegador)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido" });
  }

  // Debug para ver se as variáveis estão lendo (aparece no log da Vercel)
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "OK" : "NÃO CONFIGURADA");
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "OK" : "NÃO CONFIGURADA");

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      ok: false,
      error: "As credenciais do e-mail não estão configuradas corretamente no .env",
    });
  }

  try {
    // 2. Recebe os dados. Separamos Nome e Email, o resto vai para 'respostas'
    const { nome, email, ...respostas } = req.body;

    // 3. Dicionário para deixar os IDs mais bonitos no e-mail (Opcional, mas fica chique)
    const labels = {
      edicao_gt: "Edição GT",
      atualizacao_cadastro: "Atualização Cadastral",
      ensino_superior: "Ensino Superior",
      qual_curso: "Curso",
      mercado_trabalho: "Mercado de Trabalho",
      trabalha_tech: "Trabalha com Tech?",
      projetos_prog: "Projetos Atuais",
      tipo_atuacao: "Tipo de Atuação",
      linkedin: "LinkedIn",
      naturalidade: "Naturalidade",
      raca: "Autodeclaração",
      genero: "Identidade de gênero",
      pcd: "PCD",
      qual_pcd: "Qual PCD"
    };

    // 4. Gera a lista HTML das respostas dinamicamente
    let listaRespostasHtml = '<ul style="list-style: none; padding: 0;">';
    
    for (const [key, value] of Object.entries(respostas)) {
      // Se o valor estiver vazio, pula ou mostra "Não informado"
      const respostaExibida = value ? escapar(value) : "<em>Não informado</em>";
      // Usa o label bonito ou o próprio ID se não tiver label
      const labelExibido = labels[key] || key;

      listaRespostasHtml += `
        <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
          <strong style="color: #39586D;">${labelExibido}:</strong><br>
          <span style="color: #555;">${respostaExibida}</span>
        </li>
      `;
    }
    listaRespostasHtml += '</ul>';

    // 5. Monta o HTML final para injetar no template
    const conteudoDoResultado = `
      <p style="font-size: 16px; color: #333;">
        Olá, <strong>${escapar(nome)}</strong>! Aqui está a cópia das suas respostas para o Censo Geração Tech.
      </p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h3 style="color: #2C4156; margin-top: 0;">Resumo dos Dados:</h3>
        ${listaRespostasHtml}
      </div>
    `;

    // 6. Lê o Template HTML (Certifique-se que o arquivo existe em backend/template-email.html)
    const templatePath = path.join(process.cwd(), "backend", "template-email.html");
    let emailTemplate;
    
    // Tratamento de erro caso o arquivo template não exista
    if (fs.existsSync(templatePath)) {
        emailTemplate = fs.readFileSync(templatePath, "utf8");
        // Substitui as variáveis no HTML
        emailTemplate = emailTemplate
          .replace("{{nome}}", escapar(nome))
          .replace("{{conteudo_do_resultado}}", conteudoDoResultado);
    } else {
        // Fallback se não achar o arquivo html
        emailTemplate = conteudoDoResultado; 
    }

    // 7. Configura o Transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 8. Envia o E-mail
    await transporter.sendMail({
      from: `"Censo Geração Tech" <${process.env.EMAIL_USER}>`,
      to: email, // Envia para o usuário
      bcc: process.env.EMAIL_USER, // Opcional: Envia uma cópia oculta para você mesma
      subject: "Confirmação de Participação - Censo Geração Tech",
      html: emailTemplate,
    });

    return res.status(200).json({ ok: true, message: "E-mail enviado com sucesso!" });

  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}