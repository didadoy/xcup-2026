# AI World Cup 2026 ⚽

Predicción del cuadro eliminatorio del **Mundial 2026** con un modelo
estadístico entrenado sobre **datos reales** (~49.500 partidos
internacionales, 1872→2026).

No es un generador de resultados al azar: el modelo se valida
*out-of-sample* (reentrenando **sin** el Mundial 2026) y consigue ~56 % de
acierto de resultado (1X2) con probabilidades bien calibradas.

## ✨ Qué hace

- **Cuadro proyectado (16avos → final).** Grupos oficiales reales + los
  resultados ya jugados; los partidos que faltan se simulan (Monte Carlo) y
  en cada cruce avanza el favorito, con su probabilidad. Cuadro coherente
  de principio a fin.
- **Predicción por partido.** Goles esperados (xG), probabilidades 1X2 y
  distribución de marcadores. Pulsa cualquier cruce.
- **Grupos.** Clasificación real actual de los 12 grupos.
- **Favoritos.** Probabilidad de cada selección de ganar el Mundial.
- **Precisión.** Backtest honesto (out-of-sample) con métricas y la tabla
  predicho-vs-real de los partidos ya jugados.

## 🧠 El modelo

- **Elo** (World Football Elo) entrenado sobre toda la historia.
- **Poisson ataque/defensa** (GLM, scikit-learn) con más peso a los
  partidos recientes y de Mundial.
- **Monte Carlo** para proyectar el torneo.
- Fuente de datos: [martj42/international_results](https://github.com/martj42/international_results).

## 🚀 Cómo ejecutarlo

**Backend** (Python 3.11+):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173>. (En Windows puedes usar `start.ps1` desde la
raíz para arrancar todo de una vez.)

La proyección y el backtest se **precalculan en memoria** al arrancar y se
refrescan **automáticamente cada 12 h** (descarga resultados nuevos,
reentrena y recalcula). Las peticiones de los usuarios solo leen esa caché,
así que aguanta mucha concurrencia y nadie puede forzar el recálculo.

## 🛠️ Stack

| | |
|---|---|
| Frontend | React 18 · Vite 6 · Tailwind CSS 3 |
| Backend | FastAPI · NumPy · scikit-learn · SciPy |
| Datos | CSV de resultados internacionales reales |

## ⚠️ Aviso

Proyección estadística con fines informativos y de aprendizaje. **No es un
pronóstico oficial** ni una recomendación de apuestas.
