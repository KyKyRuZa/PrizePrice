# Infrastructure

## Структура

```
infra/
├── docker/
│   ├── Dockerfile               # Production (server + client-build + caddy stages)
│   ├── Dockerfile.dev           # Dev (server + client stages)
│   ├── docker-compose.dev.yml   # Dev: postgres + redis + server + client
│   ├── docker-compose.prod.yml  # Prod: postgres + redis + server + caddy
│   └── .dockerignore
├── caddy/
│   └── Caddyfile                # Reverse proxy + HTTPS + static
├── env/
│   ├── .env.dev                 # Development secrets (не в git!)
│   └── .env.prod                # Production secrets (не в git!)
├── monitoring/
│   ├── docker-compose.monitoring.yml  # Prometheus + Grafana
│   └── prometheus.yml
└── README.md
```

## Dev

```bash
# Отредактировать infra/env/.env.dev при необходимости
./dev.sh up -d
```

**Порты:**
- Client: http://localhost:5173
- Server: http://localhost:3001
- Postgres: localhost:5442
- Redis: localhost:6389

## Production

```bash
# 1. Отредактировать infra/env/.env.prod (секреты, SITE_HOST, JWT_SECRET и т.д.)
# 2. Запустить (всё соберётся автоматически)
./prod.sh up -d --build
```

### Автозапуск через systemd

```bash
# 1. Скопировать unit-файл
sudo cp infra/systemd/prizeprice.service /etc/systemd/system/
# 2. Отредактировать WorkingDirectory на актуальный путь
# 3. Включить и запустить
sudo systemctl enable --now prizeprice
```

**Порты:**
- HTTP: 80
- HTTPS: 443 (автоматический HTTPS через Caddy + Let's Encrypt)

## Monitoring

```bash
cd infra/monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

**Требование:** Production API должен быть запущен на `localhost:3001`.

**Порты:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin / admin)

## Миграции БД

Миграции запускаются автоматически при старте сервера (`RUN_DB_MIGRATIONS_ON_BOOT=true`).

```bash
# Принудительно запустить миграции
docker exec prizeprice-server node src/scripts/migrate.js
```

## Перенос БД из dev в prod

```bash
# 1. Дамп из dev
docker exec prizeprice-dev-postgres pg_dump -U prizeprice prizeprice > /tmp/prizeprice_dump.sql

# 2. Восстановление в prod
cat /tmp/prizeprice_dump.sql | docker exec -i prizeprice-postgres psql -U prizeprice -d prizeprice
```
