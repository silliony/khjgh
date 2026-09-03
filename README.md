# 💰 Remix - Controle Financeiro Inteligente

Aplicação moderna de gestão financeira pessoal com categorização inteligente de gastos, controle de faturas e extratos, orçamento com metodologia 50/30/20, simulador de compras esporádicas e relatórios de comportamento financeiro.

---

## 🚀 Como Enviar para o GitHub e Ativar o GitHub Pages

### 1. Inicializar o Repositório Git Localmente
No terminal do seu computador, na pasta do projeto:

```bash
git init
git add .
git commit -m "feat: deploy inicial do controle financeiro inteligente"
git branch -M main
```

Conecte ao seu repositório no GitHub:
```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

---

### 2. Ativar o Deploy no GitHub Pages via GitHub Actions
O projeto já conta com o fluxo de automação configurado em `.github/workflows/deploy.yml`:

1. No repositório no GitHub, vá na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Na seção **Build and deployment**:
   - Em **Source**, selecione **GitHub Actions**.
4. Pronto! O GitHub Actions executará o deploy automaticamente e publicará sua aplicação em:
   `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/`

---

## 🔒 Blindagem para Repositório Aberto (Open Source)

Este repositório foi arquitetado para ser **100% seguro em código aberto (Public/Open-Source)**. Nenhuma chave secreta, ID privado ou credencial é commitada no Git.

### 1. Camada de Arquivos Protegidos (`.gitignore`)
Os seguintes arquivos e padrões estão estritamente bloqueados contra commit acidental:
- `.env`, `.env.local`, `.env.*` (exceto `.env.example`)
- `firebase-applet-config.json`, `firebase-applet-config*.json`, `firebase_applet_config.xml`
- `service-account*.json`, `credentials.json`, `*.pem`, `*.key`
- Diretórios de compilação temporária (`dist/`, `build/`, `.pnp*`)

### 2. Tabela de Variáveis de Ambiente (`.env`)

| Variável | Escopo | Obrigatória? | Descrição |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Servidor (Backend)** | Opcional | Chave do Google AI Studio para recursos avançados de IA (nunca exposta ao navegador). |
| `VITE_FIREBASE_API_KEY` | **Cliente (Frontend)** | Opcional | Chave pública da API do seu projeto Firebase. |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Cliente (Frontend)** | Opcional | Domínio de autenticação (ex: `seu-projeto.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | **Cliente (Frontend)** | Opcional | ID do projeto no Firebase Console. |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Cliente (Frontend)** | Opcional | Bucket do Firebase Storage. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Cliente (Frontend)** | Opcional | Sender ID do Firebase Messaging. |
| `VITE_FIREBASE_APP_ID` | **Cliente (Frontend)** | Opcional | App ID do aplicativo Web no Firebase. |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | **Cliente (Frontend)** | Opcional | ID do banco Firestore (ou `(default)`). |
| `VITE_BASE_PATH` | **Build (Frontend)** | Opcional | Caminho base do deploy (padrão `./` para GitHub Pages). |

> **Nota:** Se nenhuma variável do Firebase for definida, a aplicação continua funcionando perfeitamente em **modo offline seguro**, utilizando armazenamento no navegador do usuário e inteligência heurística local para importação e categorização de extratos.

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   cd SEU_REPOSITORIO
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse em: `http://localhost:3000`

---

## 🛠️ Scripts Disponíveis

- `npm run dev`: Inicia o ambiente de desenvolvimento completo (servidor Node + Vite).
- `npm run build:pages`: Compila os arquivos estáticos otimizados para o GitHub Pages.
- `npm run preview`: Pré-visualiza os arquivos compilados localmente.
- `npm run lint`: Executa verificação de tipos TypeScript (`tsc --noEmit`).
- `npm run build`: Compilação completa (frontend Vite + servidor Node para Cloud Run / Docker).
