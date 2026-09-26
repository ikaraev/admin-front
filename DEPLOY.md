# Деплой

Этот сервис разворачивается в Kubernetes из репозитория
[`ikaraev/gameprovider-deploy`](https://github.com/ikaraev/gameprovider-deploy): там манифесты,
окружения, секреты и сборка образов. Здесь лежит только то, что меняется вместе с кодом.

```
push в dev ─► .github/workflows/ci.yml: проверки ─► сигнал в gameprovider-deploy {service: admin-front, sha}
                                                       │
     gameprovider-deploy: docker build по docker/prod/Dockerfile ─► ghcr.io/ikaraev/gameprovider-admin-front:<sha>
                                                       │
                                  kubectl apply ─► кластер обновляет поды
```

- **Ветка:** `dev`. Каждый зелёный push в неё уходит на тестовый кластер. PR в `dev` только проверяется.
- **Проверки** (`.github/workflows/ci.yml`): `tsc`, eslint и `vite build`. API берётся с того же домена по `/api/v1` (в образе `VITE_API_BASE_URL=/api/v1`).
- **Образ для прода:** `docker/prod/Dockerfile`, контекст сборки — корень репозитория. Изменения в нём выкатываются
  так же, как изменения кода. Локально: `docker build -f docker/prod/Dockerfile .`
- **Посмотреть выкатку:** Actions в `gameprovider-deploy`. Какой коммит сейчас на кластере, видно в
  `overlays/production/kustomization.yaml` → `images:`.
- **Откатиться:** в `gameprovider-deploy` Actions → deploy → Run workflow, `service=admin-front`, `ref=<старый коммит>`.
- **Секрет репозитория:** `DEPLOY_TRIGGER_TOKEN` — fine-grained PAT с правом Contents: Read and write на `gameprovider-deploy`.
