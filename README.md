# Rifa Elias & Ezequiel 💜

Aplicação completa em React + TypeScript + Vite + Supabase, pronta para publicar na Vercel.

## O que já funciona

- Página pública responsiva com a arte `public/capa.png`.
- Rifa configurada inicialmente com 50 cotas de R$ 15,00.
- Prêmio calculado automaticamente em 20% da arrecadação.
- Os outros 80% são mostrados como valor destinado aos gêmeos.
- Números entregues automaticamente do menor para o maior.
- Reserva de 1 a 10 cotas.
- Nome, parentesco e mensagem opcional.
- Reserva fica pendente até o administrador confirmar o Pix.
- QR Code Pix e Pix copia e cola gerados para o valor exato da reserva.
- Dashboard protegido por login do Supabase.
- Dashboard para editar valor, quantidade, percentual do prêmio, data, Instagram e dados do Pix.
- Confirmação ou liberação de pagamentos.
- Atualização em tempo real dos números.

## 1. Criar o banco

Crie um projeto em Supabase e abra **SQL Editor**.

Cole todo o conteúdo de `supabase.sql` e execute.

Depois vá em **Authentication > Users > Add user** e crie o usuário dos pais.

Copie o UUID do usuário e execute no SQL Editor:

```sql
insert into public.profiles(id, role)
values ('UUID_DO_USUARIO', 'admin');
```

## 2. Configurar o projeto

Na pasta do projeto:

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

A `anon key` fica em Supabase > Project Settings > API.

Depois:

```bash
npm run dev
```

Abra o endereço mostrado pelo Vite.

## 3. Configurar Pix

Entre na área **Área dos pais** com o usuário criado.

Preencha:
- Chave Pix
- Nome no Pix
- Cidade

Salve.

O QR Code passa a ser gerado automaticamente com o valor da compra.

## 4. Publicar na Vercel

Suba o projeto para GitHub.

Na Vercel:
1. New Project
2. Import Git Repository
3. Escolha este repositório
4. Framework: Vite
5. Adicione as mesmas duas variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy

Depois do deploy, a Vercel fornece o endereço público da rifa.

## 5. Publicar pelo GitHub

No terminal, dentro da pasta:

```bash
git init
git add .
git commit -m "feat: rifa Elias e Ezequiel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/rifa-elias-ezequiel.git
git push -u origin main
```

**Importante:** nunca coloque a `service_role key` do Supabase no projeto. A aplicação usa somente a `anon key`.

## Observação sobre o prêmio

Com 50 cotas a R$ 15:
- Arrecadação máxima: R$ 750
- Prêmio (20%): R$ 150
- Gêmeos (80%): R$ 600

Se os administradores alterarem preço ou quantidade, o dashboard recalcula tudo automaticamente.

## Estrutura

- `src/App.tsx` — página pública + dashboard
- `src/styles.css` — visual
- `src/lib/pix.ts` — geração do Pix
- `src/lib/supabase.ts` — conexão e tipos
- `supabase.sql` — banco, segurança e funções
- `public/capa.png` — arte enviada

## Se aparecer TS5083: Cannot read tsconfig.json

Este projeto inclui `tsconfig.json` na raiz. Se o arquivo não estiver na pasta do projeto, extraia novamente o ZIP e confirme que a estrutura é:

```text
rifa-elias-ezequiel/
├── package.json
├── tsconfig.json
├── index.html
├── public/
└── src/
```

Depois, dentro dessa pasta, execute:

```bash
npm install
npm run build
```


## Privacidade da rifa

- O site público não consulta a tabela `tickets`, então visitantes não recebem a lista de números, quantidade vendida ou cotas restantes.
- A tabela `tickets` pode ser lida somente por usuários marcados como `admin`.
- Reservas e valores financeiros também ficam restritos aos administradores.
- Números são reservados no PostgreSQL em ordem crescente e uma cota marcada como `paid` não pode voltar a `available`.
- Reservas pendentes expiram após 30 minutos e são liberadas automaticamente quando uma nova reserva é processada.
