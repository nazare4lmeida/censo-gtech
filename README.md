# Censo Geração Tech 📊

> Projeto desenvolvido para o mapeamento da comunidade **Geração Tech** 

---

### 📋 Sobre o Projeto

O **Censo Geração Tech** é uma aplicação web desenvolvida para coletar e mapear dados demográficos, acadêmicos e profissionais dos participantes do projeto Geração Tech.

Diferente da versão anterior (focada em testes de nível), esta versão atua como um **formulário interativo por etapas**. O objetivo é criar um banco de dados sólido para entender o perfil dos talentos formados, sua inserção no mercado de trabalho e suas especialidades.

Ao final do preenchimento, os dados são enviados automaticamente para uma planilha administrativa e o usuário recebe um **e-mail de confirmação** contendo uma cópia das suas respostas, servindo como comprovante de participação.

---

### 🆕 Novidades desta versão

* **Novo layout:** cartão centralizado, progresso com seções, opções em cartões com foco por teclado e versão para celular.
* **Campo de identidade de gênero** incluído no formulário e no e-mail de comprovante.
* **Segurança:** textos digitados são escapados antes de entrar no e-mail.

> ⚠️ Ao usar a versão nova, as opções de edição (inclusive as da GT 4.0) precisam existir também no Google Forms, na mesma ordem e com o mesmo texto, senão a resposta pode não ser gravada corretamente.

---

### 💡 Funcionalidades

✅ **Formulário Passo a Passo:** Interface limpa e focada, apresentando uma pergunta por vez para não sobrecarregar o usuário.  
✅ **Navegação Intuitiva:** Botões de "Voltar" e "Próxima" permitem revisar respostas anteriores sem perder os dados preenchidos (State Memory).  
✅ **Identidade Visual Profissional:** Nova paleta de cores "Navy Dream" (Tons de Azul e Cinza), transmitindo seriedade e clareza.  
✅ **Integração com Google Sheets:** As respostas são enviadas diretamente para uma planilha do Google via requisição POST (Google Forms integration).  
✅ **Envio de Comprovante por E-mail:** Integração com **Nodemailer** para enviar um resumo formatado das respostas para o e-mail do participante.  
✅ **Feedback Visual:** Uso do **SweetAlert2** para mensagens de sucesso e validações de campo obrigatório.  
✅ **Responsividade:** Layout totalmente adaptável para celulares, tablets e desktops.

---

### 🖥️ Tecnologias Utilizadas

Este projeto foi construído com as seguintes tecnologias:

* **HTML5** → Estrutura semântica e acessível.
* **CSS3** → Estilização com Variáveis CSS (:root), Flexbox e Animações.
* **JavaScript (ES6+)** → Lógica de navegação, manipulação do DOM e consumo de APIs.
* **Node.js (Serverless)** → Backend para processamento do envio de e-mails.
* **Nodemailer** → Biblioteca para disparo de e-mails transacionais.
* **Vercel** → Hospedagem do Front-end e Serverless Functions (`/api`).
* **Google Forms/Sheets** → Backend "Low-code" para armazenamento de dados.

---

### 🚀 Como Rodar Localmente

Caso queira testar ou contribuir com o código em sua máquina:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/nazare4lmeida/censo-gtech.git
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env` na pasta `backend` com as credenciais do e-mail remetente:
    ```env
    EMAIL_USER=seu-email@gmail.com
    EMAIL_PASS=sua-senha-de-app
    ```
4.  **Inicie o Servidor Local:**
    ```bash
    node backend/server.js
    ```
5.  **Acesse:** O projeto rodará em `http://localhost:3000`.

---

### 🤝 Contribuição

Este projeto é uma iniciativa voluntária para a comunidade. Sugestões são bem-vindas!

Feito com 💙 por **Nazaré Almeida**.