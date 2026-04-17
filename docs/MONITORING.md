# Мониторинг PrizePrice

## Стек

- **Prometheus** — сбор и хранение метрик
- **Grafana** — визуализация и дашборды

## Запуск

Mониторинг запускается **отдельно** и подключается к API через общую Docker-сеть `prizeprice`:

```bash
cd infra/monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

**Требование:** Production API должен быть запущен в той же сети (`prizeprice`).

## Доступы

| Сервис | URL | Логин/пароль |
|--------|-----|--------------|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | admin / admin |

## Метрики приложения

Сервер экспортирует метрики на `/metrics` с Bearer-аутентификацией:

```bash
curl -H "Authorization: Bearer <METRICS_TOKEN>" http://localhost:3001/metrics
```

Prometheus использует `bearer_token: ${METRICS_TOKEN}` в `prometheus.yml`.

### Ключевые метрики

| Метрика | Описание |
|---------|----------|
| `http_request_duration_seconds_count` | Количество HTTP-запросов |
| `http_request_duration_seconds_bucket` | Гистограмма задержек (для percentile) |
| `active_users_total` | Всего активных пользователей |
| `price_watcher_errors_total` | Ошибки price watcher |
| `nodejs_heap_size_used_bytes` | Использованная куча Node.js |

## Алерты

Определены в `../monitoring/alerts.prometheus.yml`:

| Алерт | Severity | Условие |
|-------|----------|---------|
| PrizePriceApiHigh5xxRatio | critical | 5xx > 2% за 5 мин |
| PrizePriceApiHighP95Latency | warning | p95 > 750ms за 10 мин |
| PrizePriceApiTargetDown | critical | API не отвечает 2 мин |
| PrizePriceAuth429Spike | warning | Скачок 429 на auth |
| PrizePriceMetricsUnauthorizedSpike | warning | 401 на /metrics |
| PrizePriceWatcherFailures | warning | Ошибки watcher за 10 мин |

## Дашборды

Grafana дашборд: `infra/monitoring/grafana-dashboard-prizeprice.json`
Импортировать вручную через Grafana UI → Import → Upload JSON.
