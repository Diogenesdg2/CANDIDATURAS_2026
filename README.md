# 🗳️ Explorador Eleitoral 2026 (Transparência & Contas)

Uma plataforma web moderna de auditoria cívica e transparência pública desenvolvida para consultar candidaturas, comparar patrimônios, fiscalizar limites de gastos e rastrear despesas e projetos de lei de políticos brasileiros nas Eleições de 2026.

O sistema integra dados públicos em tempo real diretamente do **Portal de Divulgação de Candidaturas do TSE** e da **Câmara dos Deputados**.

---

## 🚀 Funcionalidades Principais

* **Busca e Filtragem Avançada:** Filtre candidatos por Estado (UF) e Cargo (Presidente, Governador, Senador, Deputado Federal/Estadual, etc.).
* **Raio-X Parlamentar:** Conexão direta com a API de Dados Abertos da Câmara para auditar gastos de campanha (CEAP) e últimos Projetos de Lei de deputados federais em exercício.
* **Modo "Mano a Mano" (VS):** Compare dois candidatos lado a lado (patrimônio, limite de gastos, situação e item mais caro declarado).
* **Raio-X Demográfico e Financeiro:** Gráficos interativos consolidados de gênero, raça, partidos e classificação inteligente de patrimônio (Imóveis, Veículos, Investimentos, Animais e Empresas) com precisão de casas decimais.
* **Ficha Pronta para o WhatsApp:** Botão de compartilhamento instantêncio que gera um resumo formatado da ficha do candidato para combate a *fake news*.
* **Acessibilidade Completa (a11y):** Foco visível por teclado, suporte a leitores de tela (`aria-roles`) e modais responsivos.

---

## 🛠️ Tecnologias Utilizadas

* **Vue.js 3** (Composition API)
* **Vite** (Empacotador ultrarrápido)
* **Tailwind CSS** (Estilização moderna e responsiva)
* **Firebase Firestore** (Banco de dados em nuvem para armazenamento dos candidatos)

---

## 📦 Como Instalar e Rodar o Projeto (Guia para Leigos)

Se você nunca instalou um projeto de programação antes, não se preocupe! Siga este passo a passo com calma:

### Pré-requisitos
Antes de começar, você precisará ter instalado no seu computador:
1. **Node.js** (Baixe e instale a versão LTS recomendada no site oficial: [nodejs.org](https://nodejs.org/)).
2. Um editor de código, como o **VS Code** (Baixe em: [code.visualstudio.com](https://code.visualstudio.com/)).

---

### Passo 1: Baixar os arquivos
1. Baixe este projeto em formato `.zip` clicando no botão verde **"Code"** aqui no GitHub e depois em **"Download ZIP"**, ou clone o repositório pelo terminal.
2. Extraia a pasta compactada em um local de fácil acesso no seu computador (por exemplo, na sua *Área de Trabalho*).

### Passo 2: Abrir o projeto no VS Code
1. Abra o programa **VS Code**.
2. No menu superior, clique em **File > Open Folder...** (Arquivo > Abrir Pasta...) e selecione a pasta do projeto descompactada.
3. No menu superior do VS Code, abra o terminal integrado clicando em **Terminal > New Terminal** (Novo Terminal).

### Passo 3: Instalar as dependências
Com o terminal aberto na pasta do projeto, digite o seguinte comando e aperte **Enter**:
bash
npm install

### Passo 4: Configurar o Banco de Dados (Firebase)
1. Crie uma conta gratuita no Firebase Console.
2. Crie um novo projeto, adicione uma aplicação Web e copie as credenciais de configuração (API Key, Auth Domain, Project ID, etc.).
3. Na pasta do projeto, localize (ou crie) o arquivo de configuração do Firebase (geralmente em src/firebase/config.js) e insira as suas chaves.

### Passo 5: Rodar o projeto no seu navegador
npm run dev

