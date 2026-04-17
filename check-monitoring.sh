# Проверка monitoring stack

## 1. Проверить таргеты Prometheus
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, state: .state, lastError: .lastError}'

## 2. Проверить доступность API из контейнера Prometheus
docker exec monitoring-prometheus sh -c "wget -qO- http://prizeprice-server:3001/health"

## 3. Проверить /metrics с Bearer token (METRICS_TOKEN из .env.prod)
docker exec monitoring-prometheus sh -c "wget -qO- --header='Authorization: Bearer \$METRICS_TOKEN' http://prizeprice-server:3001/metrics | head -20"

## 4. Проверить, что метрика active_users_total присутствует
curl -s http://localhost:9090/api/v1/query?query=active_users_total | jq '.data.result'

## 5. Проверить, что алерты загружены
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | {name: .name, rules: .rules[] | {alert: .alert, state: .state}}'

## 6. Проверить миграцию last_seen (колонка должна быть в users)
docker exec prizeprice-server psql -U prizeprice -d prizeprice -c "\d users" | grep last_seen

## 7. Проверить, что activeUsersUpater запущен (логи сервера)
docker logs prizeprice-server 2>&1 | grep "active_users_updater_started"
