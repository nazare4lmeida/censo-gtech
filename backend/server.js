import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuração necessária para __dirname funcionar com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Substitui o body-parser antigo

// Escapa o texto digitado pelo usuário antes de colocar no e-mail
function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

app.post("/send-email", async (req, res) => {
  const dados = req.body;
  const { nome, email } = dados;

  // 1. Mapa de campos (Mesma lógica da API da Vercel)
  const mapaCampos = {
      edicao_gt: "Edição do Geração Tech",
      atualizacao_cadastro: "Atualização Cadastral",
      ensino_superior: "Ensino Superior",
      qual_curso: "Curso Superior",
      mercado_trabalho: "Está no Mercado de Trabalho?",
      trabalha_tech: "Trabalha na Área Tech?",
      projetos_prog: "Envolvido em Projetos?",
      tipo_atuacao: "Tipo de Atuação",
      linkedin: "LinkedIn",
      naturalidade: "Naturalidade",
      raca: "Raça/Cor",
      genero: "Identidade de gênero",
      pcd: "É PCD?",
      qual_pcd: "Descrição PCD"
  };

  try {
    // 2. Gera a lista HTML das respostas
    let htmlListaRespostas = '<ul style="list-style: none; padding: 0;">';
    for (const key in dados) {
      if (key !== "nome" && key !== "email" && mapaCampos[key]) {
        htmlListaRespostas += `
          <li style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
            <strong style="color: #39586D; display:block; font-size: 14px;">${mapaCampos[key]}</strong>
            <span style="color: #333; font-size: 16px;">${escapar(dados[key]) || "Não informado"}</span>
          </li>`;
      }
    }
    htmlListaRespostas += '</ul>';

    // 3. Lê o Template
    const templatePath = path.join(__dirname, 'template-email.html');
    let emailTemplate = fs.readFileSync(templatePath, 'utf8');

    // 4. Substitui os dados no template
    emailTemplate = emailTemplate
      .replace('{{nome}}', escapar(nome))
      .replace('{{conteudo_do_resultado}}', htmlListaRespostas);

    // 5. Envia o e-mail
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Censo Geração Tech" <${process.env.EMAIL_USER}>`,
      to: email,
      bcc: process.env.EMAIL_USER, // Cópia oculta para você
      subject: "Confirmação de Participação - Censo Geração Tech",
      html: emailTemplate,
    });

    console.log(`E-mail enviado localmente para: ${email}`);
    res.json({ ok: true });

  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Porta do servidor local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Local rodando na porta ${PORT}`));