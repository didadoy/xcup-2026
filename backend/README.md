---
title: xCup 2026 Backend
emoji: 🏆
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# xCup 2026 — Backend

API FastAPI del predictor del Mundial 2026, desplegada como **Space Docker**.

Endpoints:
- `GET /api/projection` — proyección Monte Carlo del cuadro
- `GET /api/backtest` — precisión del modelo
- `GET /api/status` — estado del refresco (dispara recálculo si toca)
- `GET /api/predict/{a}/{b}` — predicción de un cruce
- `GET /api/health` — salud

El código fuente vive en https://github.com/didadoy/xcup-2026 (carpeta `backend/`)
y se sincroniza aquí automáticamente con una GitHub Action en cada push a `main`.

El refresco es **dirigido por peticiones**: el proceso puede dormirse sin
problema; cuando alguien entra, si ya pasó la franja horaria, descarga
resultados nuevos, reentrena y recalcula en segundo plano.
