# xCup 2026

Predicción del cuadro eliminatorio del **Mundial 2026** mediante un modelo
estadístico entrenado sobre datos reales: ~49.500 partidos internacionales
oficiales (1872-2026). No genera resultados al azar; el modelo se valida
*out-of-sample* (reentrenado sin los partidos del Mundial 2026) y alcanza en
torno al 55 % de acierto de resultado (1X2), con probabilidades calibradas.

La aplicación web muestra, además de la proyección, una comparación
**predicho vs. real** que se actualiza conforme se juegan los partidos.

## Funcionalidades

- **Cuadro (16avos a final).** Con la fase de grupos cerrada, se parte de los
  cruces reales de eliminatoria y se avanza con el resultado real donde ya se
  jugó, o con el favorito del modelo donde falta. Cada cruce indica si la
  predicción acertó el emparejamiento y marca los partidos ya disputados con
  su resultado.
- **Predicción por partido.** Goles esperados (xG), probabilidades 1X2 y
  distribución de marcadores para cualquier cruce.
- **Grupos.** Clasificación real de los 12 grupos y predicción de cada partido.
- **Favoritos.** Probabilidad de cada selección de ganar el torneo.
- **Precisión.** Backtest *out-of-sample* con métricas (acierto 1X2, marcador
  exacto, Brier, log-loss, error de goles) y la tabla predicho-vs-real de todos
  los partidos jugados. La muestra crece y se recalcula conforme avanza el
  Mundial.

## Modelo

- **Elo** (World Football Elo Rating System) procesado sobre toda la historia.
- **Poisson de ataque/defensa** (GLM, scikit-learn) con mayor peso a los
  partidos recientes y de mayor importancia.
- **Monte Carlo** para proyectar los partidos pendientes.
- Fuente de datos: [martj42/international_results](https://github.com/martj42/international_results).

## Arquitectura

- **Backend** (FastAPI). Precalcula en memoria la proyección y el backtest; las
  peticiones solo leen esa caché, de modo que escala con muchos usuarios. El
  recálculo está **dirigido por peticiones**: cuando llega una petición y ha
  pasado la franja programada (cada 6 h), se descargan los resultados nuevos, se
  reentrena y se recalcula en segundo plano. El estado se persiste en disco y
  hay una semilla commiteada (`backend/data/state_seed.json`) para que el
  arranque en frío no tenga que simular.
- **Frontend** (React + Vite + Tailwind). Caché *stale-while-revalidate* en el
  navegador: muestra al instante lo último guardado y solo descarga la versión
  completa cuando el backend tiene datos más nuevos.

## Ejecución local

Backend (Python 3.12+):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

Frontend (Node 18+):

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. En Windows, `start.ps1` (en la raíz) arranca
ambos a la vez.

## Despliegue

- **Backend** → Hugging Face Spaces (SDK Docker). El `Dockerfile` y el `README`
  del Space están en `backend/`. El workflow `.github/workflows/deploy-hf-space.yml`
  sincroniza `backend/` con el Space en cada push a `main`; requiere los secretos
  de repositorio `HF_TOKEN` (token de escritura) y `HF_SPACE` (`usuario/espacio`).
- **Frontend** → Vercel. *Root Directory* = `frontend` y variable de entorno
  `VITE_API_URL` con la URL del backend (sin barra final). Las variables `VITE_*`
  se incrustan en el build, por lo que un cambio requiere redesplegar.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 3 |
| Backend | FastAPI, NumPy, scikit-learn, SciPy |
| Datos | Resultados internacionales reales (CSV) |

## Aviso

Proyección estadística con fines informativos y de aprendizaje. No es un
pronóstico oficial ni una recomendación de apuestas.
