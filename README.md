# Loja de Promoções – Natal Antecipado (GitHub Pages + Supabase)

Site de promoções com vitrine, carrinho, cadastro completo do cliente (nome, CPF, telefone, e-mail, endereço, login e senha), área "Minha conta" com pedidos, pagamento por **PIX (QR Code + Copia e Cola com valor e nº do pedido)** ou **cartão (link de pagamento)**, botão para **enviar o comprovante no WhatsApp** e **painel administrativo** completo.

## O que tem no site

| Página | Para quê |
|---|---|
| `index.html` | Vitrine: banners, categorias, ofertas, busca, filtros |
| `produto.html` | Página do produto com galeria de fotos |
| `carrinho.html` | Carrinho |
| `entrar.html` | Login e cadastro do cliente (CEP preenche o endereço sozinho) |
| `checkout.html` | Confirma dados e escolhe PIX ou cartão |
| `pagamento.html` | Mostra o **nº do pedido** (PED1001, PED1002...), o PIX/cartão e o botão do WhatsApp |
| `minha-conta.html` | Pedidos do cliente, editar dados, trocar senha |
| `politicas.html` | Privacidade e trocas (exigido pelo Google Ads) |
| `admin.html` | **Painel do administrador** |

**No painel você muda quando quiser:** produtos (várias fotos, preço de/por, estoque, selo), categorias, banners (computador e celular), logo, nome da loja, WhatsApp, cores do site, faixa e contagem regressiva da promoção, **chave PIX**, desconto no PIX, link do cartão e parcelas. Também vê todos os pedidos, dados dos clientes e muda o status (Aguardando → Pago → Enviado → Entregue).

---

## Passo a passo para colocar no ar

### 1) Criar o banco no Supabase
1. Entre em <https://supabase.com> → **New project** (anote a senha do banco).
2. No menu, abra **SQL Editor** → **New query**.
3. Abra o arquivo `supabase/schema.sql`, copie **tudo**, cole e clique **Run**. Deve aparecer "Success".

### 2) Ajustar o login (Authentication)
Em **Authentication → Sign In / Providers → Email**:
- **Recomendado:** desligue **"Confirm email"**. Assim o cliente se cadastra e vai direto para o pagamento.
  (Se deixar ligado, ele precisa clicar no link do e-mail antes de comprar.)

Em **Authentication → URL Configuration**:
- **Site URL:** coloque o endereço do seu site (ex.: `https://seuusuario.github.io/loja-natal/`)
- **Redirect URLs:** adicione `https://seuusuario.github.io/loja-natal/**`

### 3) Ligar o site ao Supabase
1. No Supabase: **Project Settings → API** (ou **Data API**).
2. Copie a **Project URL** e a chave **anon / public**.
3. Abra `assets/js/config.js` e cole nos dois lugares indicados.

> A chave *anon* pode ficar no site, é pública. A segurança vem das regras do `schema.sql`: cada cliente só vê os próprios pedidos e só o admin altera produtos e configurações. **Nunca** coloque a chave `service_role` no site.

### 4) Publicar no GitHub Pages
1. Crie um repositório no GitHub (ex.: `loja-natal`), **público**.
2. **Add file → Upload files** → arraste **todo o conteúdo** desta pasta (incluindo a pasta `assets` e o arquivo `.nojekyll`) → **Commit**.
3. **Settings → Pages** → *Source:* **Deploy from a branch** → Branch **main** / **(root)** → **Save**.
4. Em 1–2 minutos o site fica em `https://seuusuario.github.io/loja-natal/`.
5. (Opcional) Domínio próprio: **Settings → Pages → Custom domain** e aponte o DNS (CNAME para `seuusuario.github.io`). Depois atualize o Site URL no Supabase.

### 5) Virar administrador
1. Abra o seu site e **crie uma conta** normalmente (Entrar → Criar cadastro).
2. No Supabase, **SQL Editor**, rode trocando o e-mail:
   ```sql
   update public.perfis set is_admin = true where email = 'seu@email.com';
   ```
3. Acesse `https://seuusuario.github.io/loja-natal/admin.html` e entre.

### 6) Configurar a loja (no painel)
1. **Configurações:** nome, logo, WhatsApp (formato `5562999998888`), **chave PIX + nome + cidade do recebedor**, desconto no PIX, link do cartão. Use **"Gerar PIX de teste"** e cole no app do banco para conferir se aparece seu nome.
2. **Categorias** → **Produtos** → **Banners** (1920×600 px computador / 1000×1000 px celular).

Pronto! 🎄

---

## Como funciona a compra
1. Cliente escolhe o produto → carrinho → **Finalizar compra**.
2. Se não tem conta, faz o **cadastro completo** (nome, CPF validado, telefone, e-mail, endereço, senha).
3. Escolhe **PIX** ou **Cartão** e confirma → o sistema gera o **número do pedido** (PED1001...).
   Os preços são calculados **no banco de dados**, o cliente não consegue alterar valores.
4. Na tela de pagamento:
   - **PIX:** QR Code e Copia e Cola já com o **valor** e o **nº do pedido** como identificador, caindo na sua chave.
   - **Cartão:** botão para o seu **link de pagamento** (Mercado Pago, InfinitePay, PagBank, Stone...). Se não houver link, o cliente pede pelo WhatsApp.
5. Botão **"Enviar comprovante no WhatsApp"** abre a conversa já com o nº do pedido, nome e valor.
6. Você confere e muda o status no painel; o cliente acompanha em **Minha conta**.

### Por que o cartão é por link?
Um site estático no GitHub não pode receber número de cartão com segurança (regras PCI). O link de pagamento da sua maquininha/gateway processa o cartão no ambiente deles, com antifraude e parcelamento.

## Testar antes de configurar
Abra o `index.html` com o Live Server do VS Code (ou qualquer servidor local). Sem o `config.js` preenchido, o site abre em **modo demonstração** com produtos de exemplo. Abrir o arquivo com duplo clique (`file://`) não funciona por causa dos módulos JavaScript.

## Estrutura
```
├── index.html, produto.html, carrinho.html, entrar.html, checkout.html,
│   pagamento.html, minha-conta.html, politicas.html, admin.html
├── assets/
│   ├── css/style.css, admin.css
│   └── js/config.js  ← SUAS CHAVES DO SUPABASE
│       core.js, pix.js, home.js, produto.js, carrinho.js, entrar.js,
│       checkout.js, pagamento.js, conta.js, admin.js, politicas.js, demo.js
└── supabase/schema.sql  ← rodar uma vez no SQL Editor
```

## Dicas
- **Plano grátis do Supabase pausa o projeto após 7 dias sem acesso.** Com a loja recebendo visitas isso não acontece; se pausar, é só clicar em *Restore* no painel do Supabase.
- Revise o texto de `politicas.html` com seu contador/advogado.
- Ao alterar arquivos no GitHub, o site atualiza em ~1 minuto (use Ctrl+F5 para limpar o cache).
