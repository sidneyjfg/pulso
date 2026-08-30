# Operacao de producao

Este guia cobre a base para rodar o Pulso em producao com proxy, imagens versionadas, rate limit distribuido, migrations controladas e rollback.

## Entrada publica

Use `docker-compose.prod.yml`. Apenas o `proxy` publica portas `80` e `443`.

```text
cliente -> Caddy -> web
                -> api
```

`api`, `worker` e `redis` ficam apenas na rede interna do Docker. Redis nao deve ser exposto publicamente.

## Variaveis obrigatorias

Crie o `.env` de producao a partir de `.env.production.example` e troque todos os segredos.

Pontos criticos:

- `NODE_ENV=production`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `RATE_LIMIT_STORE=redis`
- `INTERNAL_JOB_SECRET` com valor aleatorio forte
- `DATABASE_URL` apontando para MySQL de producao
- `CORS_ORIGINS` com o dominio publico real
- tags de imagem imutaveis via `ERP_VERSION` ou `ERP_*_IMAGE`

## Subida inicial

```bash
APP_DOMAIN=app.seudominio.com ERP_VERSION=0.1.0 docker compose -f docker-compose.prod.yml pull
APP_DOMAIN=app.seudominio.com ERP_VERSION=0.1.0 docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
APP_DOMAIN=app.seudominio.com ERP_VERSION=0.1.0 docker compose -f docker-compose.prod.yml up -d
```

## Escala horizontal

Nao use `container_name` em servicos escalaveis. O Compose de producao ja evita isso.

```bash
docker compose -f docker-compose.prod.yml up -d --scale api=2 --scale worker=1
```

A API deve continuar stateless: sessao em JWT/banco, rate limit em Redis e jobs recorrentes no worker.

## Performance

Antes de aumentar replicas, valide banco, Redis e rotas quentes:

```bash
node scripts/check-performance.mjs --pool --explain
node scripts/check-stock-concurrency.mjs
PERF_CONCURRENCY=16 PERF_ROUNDS=8 PERF_MAX_P95_MS=1500 node scripts/check-performance.mjs --load
```

Pontos de operacao:

- `DATABASE_URL` deve definir `connection_limit` e `pool_timeout`.
- Calcule `connection_limit` por replica: deixe margem para migrations, worker e acesso administrativo ao MySQL.
- Rotas pesadas usam rate limit proprio: sync catalogo iFood, polling/ingestao/reprocessamento de eventos, acoes iFood, imports e reports.
- Rode `EXPLAIN` sempre que mudar listagens de dashboard, vendas, estoque, eventos iFood, pendencias iFood ou busca global.
- Rode o teste de concorrencia de estoque antes de alterar reserva, cancelamento, criacao de pedido ou processamento iFood.
- Para carga real, teste com pelo menos duas replicas da API atras do proxy e `RATE_LIMIT_STORE=redis`.

Para teste local com build interno e duas replicas da API:

```bash
docker compose -p erp_scale -f docker-compose.prod.yml -f docker-compose.prod.local-scale.yml build api worker web
HTTP_PORT=8080 HTTPS_PORT=8443 docker compose -p erp_scale -f docker-compose.prod.yml -f docker-compose.prod.local-scale.yml up -d --scale api=2 --scale worker=1
PERF_API_URL=http://127.0.0.1:8080 PERF_CONCURRENCY=20 PERF_ROUNDS=5 node scripts/check-performance.mjs --load
```

## Polling iFood

O polling recorrente nao roda mais dentro da API. O worker chama `/internal/jobs/ifood/orders/poll` usando `INTERNAL_JOB_SECRET` e usa lock Redis para evitar execucao duplicada.

Nao escale `worker` sem revisar concorrencia de jobs e locks.

## Deploy com menor indisponibilidade

Fluxo recomendado:

1. Publicar imagens GHCR com tag imutavel.
2. Rodar backup do banco.
3. Executar migrations compativeis:

```bash
ERP_VERSION=0.1.1 docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

4. Atualizar containers:

```bash
ERP_VERSION=0.1.1 docker compose -f docker-compose.prod.yml pull
ERP_VERSION=0.1.1 docker compose -f docker-compose.prod.yml up -d --no-deps api worker web
```

5. Validar:

```bash
curl -fsS https://app.seudominio.com/health
curl -fsS https://app.seudominio.com/ready
```

Compose reduz a janela de reinicio, mas zero downtime real exige duas instancias saudaveis atras do proxy ou orquestrador com rolling update.

## Rollback

Se a nova versao falhar e a migration for compativel com a versao anterior:

```bash
ERP_VERSION=0.1.0 docker compose -f docker-compose.prod.yml up -d --no-deps api worker web
```

Evite migrations destrutivas no mesmo deploy da aplicacao. Use o padrao expand/contract:

1. Adicionar estruturas novas sem remover antigas.
2. Publicar aplicacao usando as estruturas novas.
3. Remover estruturas antigas apenas em deploy posterior.

## Build interno

O Compose de producao usa `image` por padrao. Para build interno, comente `image:` e descomente o bloco `build:` do servico desejado.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
