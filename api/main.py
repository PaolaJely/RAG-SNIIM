import sys
from pathlib import Path

# Permite importar desde rag/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "rag"))

from collections import defaultdict
from datetime import datetime
from typing import Optional
import time
import threading
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import config

app = FastAPI(title="SNIIM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MESES = {
    "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
}
MESES_ORDER = list(MESES.values())


PRESENTACION_FACTOR = {
    "Kilogramo":      1.0,
    "Caja de 10 kg.": 10.0,
    "Caja de 18 kg.": 18.0,
    "Caja de 19 kg.": 19.0,
    "Caja de 20 kg.": 20.0,
    "Caja de 25 kg.": 25.0,
}


_cache_lock = threading.Lock()
_cache_data: list[dict] = []
_cache_ts: float = 0.0
_CACHE_TTL = 10 * 60  # 10 minutos


def _get_pg() -> psycopg2.extensions.connection:
    """Abre una conexión a Postgres."""
    return psycopg2.connect(config.POSTGRES_DSN)


def _fetch_all_from_postgres(producto_id: str = "732") -> list[dict]:
    """Descarga todos los registros de Postgres y normaliza precios a MXN/kg."""
    conn = _get_pg()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT fecha, origen, destino, presentacion,
               precio_min, precio_max, precio_frec
        FROM   producto
        WHERE  producto_id = %s
        """,
        [producto_id],
    )
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()

    normalized = []
    for r in rows:
        factor = PRESENTACION_FACTOR.get(r.get("presentacion", "Kilogramo"), 1.0)
        normalized.append({
            **r,
            "precio_frec": round(r["precio_frec"] / factor, 2) if r["precio_frec"] else None,
            "precio_min":  round(r["precio_min"]  / factor, 2) if r["precio_min"]  else None,
            "precio_max":  round(r["precio_max"]  / factor, 2) if r["precio_max"]  else None,
        })
    return normalized


def _all_records(
    destino: Optional[str] = None,
    producto_id: str = "732",
) -> list[dict]:
    """Devuelve todos los registros normalizados con caché en memoria (TTL 10 min).

    El filtro por destino usa ILIKE vía SQL en la propia consulta a Postgres.
    """
    global _cache_data, _cache_ts

    with _cache_lock:
        if not _cache_data or (time.time() - _cache_ts) > _CACHE_TTL:
            _cache_data = _fetch_all_from_postgres(producto_id)
            _cache_ts = time.time()
        rows = _cache_data

    if destino:
        destino_lower = destino.lower()
        rows = [r for r in rows if r.get("destino", "").lower().startswith(destino_lower)]

    return rows


def _parse_month(fecha: str) -> str:
    """'02/01/2025' → 'Ene'"""
    try:
        return MESES[fecha[3:5]]
    except Exception:
        return ""


def _parse_date(fecha: str):
    """Convierte la fecha SNIIM DD/MM/YYYY a date para ordenar correctamente."""
    try:
        return datetime.strptime(fecha, "%d/%m/%Y").date()
    except (TypeError, ValueError):
        return None


# ==================== ENDPOINTS ====================

@app.get("/health")
def health():
    """Health check para Render / balanceadores."""
    return {"status": "ok"}


@app.get("/api/kpis")
def get_kpis(destino: Optional[str] = Query(None)):
    """KPI cards del Dashboard."""
    rows = _all_records(destino)
    if not rows:
        raise HTTPException(status_code=404, detail="Sin datos")

    precios_frec = [r["precio_frec"] for r in rows if r["precio_frec"] is not None]
    precios_max  = [r["precio_max"]  for r in rows if r["precio_max"]  is not None]
    precios_min  = [r["precio_min"]  for r in rows if r["precio_min"]  is not None]

    max_val  = max(precios_max)
    min_val  = min(precios_min)
    max_row  = next(r for r in rows if r["precio_max"]  == max_val)
    min_row  = next(r for r in rows if r["precio_min"]  == min_val)
    destinos = {r["destino"] for r in rows if r["destino"]}

    # Conteo de mercados únicos (primera parte antes de ":")
    mercados = {d.split(":")[0].strip() for d in destinos}

    # Precio promedio del mes más reciente vs. el anterior
    por_mes: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        mes = _parse_month(r["fecha"])
        if mes:
            por_mes[mes].append(r["precio_frec"])

    meses_presentes = [m for m in MESES_ORDER if m in por_mes]
    cambio_pct = None
    if len(meses_presentes) >= 2:
        ultimo  = sum(por_mes[meses_presentes[-1]]) / len(por_mes[meses_presentes[-1]])
        penult  = sum(por_mes[meses_presentes[-2]]) / len(por_mes[meses_presentes[-2]])
        cambio_pct = round((ultimo - penult) / penult * 100, 1) if penult else None

    return {
        "precio_promedio": round(sum(precios_frec) / len(precios_frec), 2),
        "cambio_pct": cambio_pct,
        "precio_max": max_val,
        "precio_max_mercado": max_row["destino"].split(":")[0].strip(),
        "precio_max_fecha": max_row["fecha"],
        "precio_min": min_val,
        "precio_min_mercado": min_row["destino"].split(":")[0].strip(),
        "precio_min_fecha": min_row["fecha"],
        "total_mercados": len(mercados),
    }


@app.get("/api/precios/mensual")
def get_precios_mensual(destino: Optional[str] = Query(None)):
    """Serie de tiempo mensual para PriceTrendChart."""
    rows = _all_records(destino)

    por_mes: dict[str, dict[str, list]] = {
        m: {"frec": [], "min": [], "max": []} for m in MESES_ORDER
    }

    for r in rows:
        mes = _parse_month(r["fecha"])
        if mes not in por_mes:
            continue
        if r["precio_frec"] is not None:
            por_mes[mes]["frec"].append(r["precio_frec"])
        if r["precio_min"] is not None:
            por_mes[mes]["min"].append(r["precio_min"])
        if r["precio_max"] is not None:
            por_mes[mes]["max"].append(r["precio_max"])

    result = []
    for mes in MESES_ORDER:
        d = por_mes[mes]
        if not d["frec"]:
            continue
        result.append({
            "month": mes,
            "precio_frec": round(sum(d["frec"]) / len(d["frec"]), 2),
            "precio_min":  round(min(d["min"]),  2) if d["min"]  else None,
            "precio_max":  round(max(d["max"]),  2) if d["max"]  else None,
        })

    return result


@app.get("/api/precios/ohlc")
def get_precios_ohlc(
    destino: Optional[str] = Query(None),
    granularidad: str = Query("week", pattern="^(week|month)$"),
):
    """Velas OHLC derivadas exclusivamente de observaciones almacenadas en Neon.

    Como SNIIM publica una observación diaria por mercado, la apertura y el
    cierre corresponden al promedio del precio frecuente en la primera y
    última fecha disponible del periodo. Los extremos provienen directamente
    de precio_min y precio_max. `observaciones` sustituye al volumen bursátil.
    """
    rows = _all_records(destino)
    periods: dict[tuple, dict] = {}

    for row in rows:
        date = _parse_date(row.get("fecha"))
        if date is None or row.get("precio_frec") is None:
            continue

        if granularidad == "week":
            iso_year, iso_week, _ = date.isocalendar()
            key = (iso_year, iso_week)
        else:
            key = (date.year, date.month)

        period = periods.setdefault(
            key,
            {
                "dates": defaultdict(list),
                "highs": [],
                "lows": [],
                "observations": 0,
            },
        )
        period["dates"][date].append(row["precio_frec"])
        if row.get("precio_max") is not None:
            period["highs"].append(row["precio_max"])
        if row.get("precio_min") is not None:
            period["lows"].append(row["precio_min"])
        period["observations"] += 1

    result = []
    for key in sorted(periods):
        period = periods[key]
        dates = sorted(period["dates"])
        first_date, last_date = dates[0], dates[-1]
        open_value = sum(period["dates"][first_date]) / len(period["dates"][first_date])
        close_value = sum(period["dates"][last_date]) / len(period["dates"][last_date])
        high_value = max(period["highs"]) if period["highs"] else max(open_value, close_value)
        low_value = min(period["lows"]) if period["lows"] else min(open_value, close_value)

        # Conserva la coherencia OHLC aun cuando un registro incompleto no
        # incluya extremos que alcancen la apertura o el cierre agregados.
        high_value = max(high_value, open_value, close_value)
        low_value = min(low_value, open_value, close_value)

        if granularidad == "week":
            label = f"{first_date.day:02d} {MESES[f'{first_date.month:02d}']}"
        else:
            label = MESES[f"{key[1]:02d}"]

        result.append({
            "period": label,
            "start_date": first_date.isoformat(),
            "end_date": last_date.isoformat(),
            "open": round(open_value, 2),
            "high": round(high_value, 2),
            "low": round(low_value, 2),
            "close": round(close_value, 2),
            "observations": period["observations"],
        })

    return result


@app.get("/api/precios/heatmap")
def get_precios_heatmap(
    destino: Optional[str] = Query(None),
    limit: int = Query(default=0, ge=0, description="Máx. destinos a mostrar (0 = todos)"),
):
    """Matriz destino × mes para PriceHeatmap."""
    rows = _all_records(destino)

    # Contar registros por destino (nombre corto) y acumular precios
    conteo: dict[str, int] = defaultdict(int)
    acum:   dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))

    for r in rows:
        destino_corto = r["destino"].split(":")[0].strip() if r["destino"] else "Desconocido"
        mes = _parse_month(r["fecha"])
        if not mes:
            continue
        conteo[destino_corto] += 1
        if r["precio_frec"] is not None:
            acum[destino_corto][mes].append(r["precio_frec"])

    ordenados = sorted(conteo, key=lambda d: conteo[d], reverse=True)
    top_destinos = ordenados[:limit] if limit > 0 else ordenados

    heatmap = {}
    for dest in top_destinos:
        heatmap[dest] = {}
        for mes in MESES_ORDER:
            vals = acum[dest].get(mes, [])
            heatmap[dest][mes] = round(sum(vals) / len(vals), 1) if vals else None

    return {"destinos": top_destinos, "data": heatmap, "meses": MESES_ORDER}


@app.get("/api/mercados")
def get_mercados(destino: Optional[str] = Query(None)):
    """Lista de mercados con precio promedio, mín y máx para Mercados y Ranking."""
    rows = _all_records(destino)

    acum: dict[str, dict[str, list]] = defaultdict(lambda: {"frec": [], "min": [], "max": []})

    for r in rows:
        dest = r["destino"].split(":")[0].strip() if r["destino"] else "Desconocido"
        if r["precio_frec"] is not None:
            acum[dest]["frec"].append(r["precio_frec"])
        if r["precio_min"] is not None:
            acum[dest]["min"].append(r["precio_min"])
        if r["precio_max"] is not None:
            acum[dest]["max"].append(r["precio_max"])

    mercados = []
    for dest, vals in acum.items():
        if not vals["frec"]:
            continue
        avg = sum(vals["frec"]) / len(vals["frec"])
        mercados.append({
            "nombre": dest,
            "precio_promedio": round(avg, 2),
            "precio_min": round(min(vals["min"]), 2) if vals["min"] else None,
            "precio_max": round(max(vals["max"]), 2) if vals["max"] else None,
            "registros": len(vals["frec"]),
        })

    mercados.sort(key=lambda m: m["precio_promedio"], reverse=True)
    return mercados


class ChatRequest(BaseModel):
    pregunta: str


@app.post("/api/chat")
def post_chat(body: ChatRequest):
    """Llama al pipeline RAG y devuelve respuesta + documentos usados."""
    if not body.pregunta.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")

    try:
        from rag import rag_query
        result = rag_query(body.pregunta, verbose=False)
        return {
            "respuesta": result["respuesta"],
            "documentos": result["documentos"],
            "total_docs": len(result["documentos"]),
            "tokens": result.get("tokens"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
