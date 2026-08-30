# Pulso ERP

Pulso e um ERP SaaS moderno para pequenos negocios brasileiros. A proposta do produto e simples: dar ao dono da empresa o pulso das vendas, do estoque e das lojas antes que o problema apareca no fechamento do mes.

O sistema nasce como monolito modular, multiempresa e multiloja, com foco em seguranca, integridade de estoque e manutencao por uma equipe futura. A experiencia do usuario deve continuar simples mesmo quando a operacao crescer de uma loja para varias empresas, filiais, depositos, usuarios e canais externos.

## O que o Pulso resolve

- Mostra vendas, pedidos, produtos acabando e produtos sem estoque em uma tela acionavel.
- Controla estoque por empresa, loja, deposito e produto usando ledger de movimentacoes.
- Evita misturar dados entre empresas, lojas e usuarios.
- Permite cadastrar produto de forma simples, deixando dados fiscais avancados para depois.
- Prepara a base para importacao de outros ERPs via CSV/XLSX.
- Deixa a arquitetura pronta para futuras integracoes com iFood, 99Food, PDV, e-commerce e marketplaces.
- Separa admin da plataforma de admin da empresa.

## Escopo atual

O projeto ja possui base para:

- autenticacao com tokens separados;
- registro publico criando conta SaaS inicial;
- contexto ativo de organizacao, empresa e loja;
- RBAC granular;
- auditoria;
- produtos, categorias, codigos de barras e preco por loja;
- estoque com saldos, movimentos, ajustes, transferencias e inventario;
- clientes, fornecedores, vendas, compras e pagamentos;
- dashboard operacional;
- fiscal estrutural sem emissao de NF-e/NFC-e;
- integracao iFood por aplicativo distribuido, polling, catalogo, pedidos e pendencias de vinculo;
- documentacao Markdoc em `/docs`.

A primeira versao nao emite NF-e ou NFC-e. A estrutura fiscal existe para permitir essa evolucao sem reescrever o nucleo.

## Arquitetura

```text
erp/
├── apps/
│   ├── web/       # Next.js, React, Tailwind, shadcn/ui
│   ├── api/       # Fastify, Zod, Pino
│   └── worker/    # BullMQ e jobs assincronos
├── packages/
│   ├── database/  # Prisma, migrations e seed
│   ├── contracts/ # schemas e tipos compartilhados
│   ├── fiscal/    # dominio fiscal
│   ├── integrations/
│   ├── security/
│   ├── ui/
│   └── config/
├── docker/
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

O backend e organizado por dominio em `apps/api/src/modules`. Controllers lidam com HTTP, services concentram regra de negocio e repositories lidam com persistencia.

## Multiempresa e multiloja

A hierarquia principal e:

```text
Organization
  └── Company
      └── Branch
          └── Warehouse
```

Toda requisicao autenticada trabalha com um `TenantContext` validado no backend:

```text
userId
organizationId
companyId
branchId
role
permissions
```

O frontend pode pedir troca de empresa ou loja, mas a API valida a selecao contra os vinculos reais do banco. Campos sensiveis como `companyId`, `branchId`, `userId`, `role` e `permissions` nao sao aceitos como fonte de verdade em payloads comuns.

## Estoque

Estoque nao fica em `Product.stock`.

O saldo atual fica em `StockBalance` para leitura rapida, mas toda alteracao precisa gerar `StockMovement`. Isso permite auditar entradas, vendas, cancelamentos, transferencias, inventarios e ajustes manuais.

## Stack

- TypeScript strict
- pnpm workspaces
- Next.js, React, Tailwind CSS, shadcn/ui
- TanStack Query, React Hook Form, Zod
- Node.js, Fastify, Pino
- MySQL, Prisma ORM, Prisma Migrate
- Redis, BullMQ
- Docker Compose
- Vitest e Playwright

## Ambiente local

O MySQL deve apontar para a sua instancia local existente. O projeto nao sobe um container MySQL por padrao. O Redis pode ser iniciado pelo Docker Compose do projeto.

1. Instale dependencias:

```bash
corepack pnpm install
```

2. Configure `.env`:

```bash
cp .env.example .env
```

Confira principalmente:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/erp
REDIS_URL=redis://localhost:6379
```

3. Rode o setup local:

```bash
corepack pnpm setup:local
```

O setup:

- preserva `.env` existente;
- tenta criar o banco caso ele ainda nao exista;
- sobe Redis quando necessario;
- gera Prisma Client;
- executa migrations;
- executa seed de desenvolvimento.

4. Inicie a aplicacao:

```bash
corepack pnpm dev
```

Servicos padrao:

- Web: `http://localhost:3000`
- API: `http://localhost:3333`
- Docs Markdoc: `http://localhost:3000/docs`

## Sem container

Use quando MySQL e Redis ja estiverem rodando na maquina:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

## Com container local

O compose atual sobe Redis. MySQL continua sendo a sua instancia externa.

```bash
corepack pnpm dev:infra
corepack pnpm setup:local
corepack pnpm dev
```

Para derrubar a infraestrutura do projeto:

```bash
corepack pnpm dev:infra:down
```

## Docker de producao

Use `docker-compose.prod.yml` para rodar a aplicacao por imagens publicadas no GHCR. O arquivo deixa o modo de build interno comentado em cada servico. O `docker-compose.yml` principal permanece focado em infraestrutura local.

Modo imagem:

```bash
APP_DOMAIN=app.seudominio.com ERP_VERSION=0.1.0 docker compose -f docker-compose.prod.yml up -d
```

Variaveis para trocar os nomes das imagens:

```env
ERP_API_IMAGE=ghcr.io/sua-org/pulso-erp-api:0.1.0
ERP_WORKER_IMAGE=ghcr.io/sua-org/pulso-erp-worker:0.1.0
ERP_WEB_IMAGE=ghcr.io/sua-org/pulso-erp-web:0.1.0
```

Modo build interno:

1. Comente `image:` no servico desejado.
2. Descomente o bloco `build:` correspondente.
3. Rode `docker compose -f docker-compose.prod.yml up -d --build`.

Em producao, use `NODE_ENV=production`, `COOKIE_SECURE=true`, segredos reais para JWT/encryptacao, `DATABASE_URL` apontando para MySQL gerenciado ou externo e tags de imagem imutaveis. O servico `web` nao recebe `.env` completo para evitar exposicao desnecessaria de segredos no container frontend. O guia completo esta em `docs/production-operations.md`.

## Atualizacoes sem parada

Para reduzir impacto em cliente, publique imagens versionadas, aplique migrations compativeis com a versao anterior, suba a nova imagem e espere `/health` e `/ready` ficarem saudaveis antes de trocar trafego. Para zero downtime real, rode pelo menos duas instancias atras de proxy/load balancer; com Compose simples, a troca com `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d --no-deps api worker web` reduz a janela, mas ainda pode reiniciar containers individualmente.

## Scripts principais

```bash
corepack pnpm dev
corepack pnpm setup:local
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:security
corepack pnpm check:production
corepack pnpm check:production:smoke
```

## Login e registro

O registro publico cria a primeira estrutura da conta:

- organizacao;
- empresa;
- loja;
- deposito principal;
- usuario administrador;
- permissoes iniciais;
- sessao e tokens.

Endpoint:

```text
POST /api/v1/auth/register
```

Login de usuario:

```text
POST /api/v1/auth/login
```

Login administrativo global:

```text
POST /api/admin/auth/login
```

## Validacao

Comandos usados para validar os pacotes principais:

```bash
corepack pnpm --filter @erp/api lint
corepack pnpm --filter @erp/api typecheck
corepack pnpm --filter @erp/api test
corepack pnpm --filter @erp/web lint
corepack pnpm --filter @erp/web typecheck
```

## Principios de seguranca

- Nunca confiar no frontend.
- Validar body, params, query e headers relevantes com Zod.
- Negar por padrao quando houver duvida de permissao.
- Validar tenant em toda consulta multiempresa.
- Nunca aceitar IDs sensiveis do payload como fonte de verdade.
- Nunca gravar senha, token, cookie completo ou segredo em log.
- Nunca apagar movimentos de estoque ou auditoria concluida por endpoint comum.

## Produto

Internamente o Pulso usa conceitos como `Organization`, `Company`, `Branch`, `Warehouse`, `StockMovement`, `TaxRuleVersion` e `IntegrationConnection`.

Na interface, a linguagem deve ser mais simples:

- Minha empresa
- Minha loja
- Meu estoque
- Minhas vendas
- Produto acabando
- Corrigir estoque

A arquitetura pode ser robusta. A experiencia nao pode parecer complicada.
