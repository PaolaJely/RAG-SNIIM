import sys
from pathlib import Path

# Permite importar desde rag/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "rag"))

from collections import defaultdict
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import config
from supabase import create_client

app = FastAPI(title="SNIIM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

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


def _all_records(destino: Optional[str] = None) -> list[dict]:
    """
    Descarga todos los registros de Supabase en páginas de 1000,
    normaliza precios a MXN/kg y filtra por destino si se indica.
    """
    rows = []
    page_size = 1000
    offset = 0
    while True:
        query = (
            supabase.table("producto")
            .select("fecha, origen, destino, presentacion, precio_min, precio_max, precio_frec")
        )
        if destino:
            query = query.ilike("destino", f"{destino}%")
        result = query.range(offset, offset + page_size - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

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


def _parse_month(fecha: str) -> str:
    """'02/01/2025' → 'Ene'"""
    try:
        return MESES[fecha[3:5]]
    except Exception:
        return ""


# ==================== ENDPOINTS ====================

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


@app.get("/api/precios/heatmap")
def get_precios_heatmap(destino: Optional[str] = Query(None)):
    """Matriz destino × mes para PriceHeatmap (top 10 destinos por volumen)."""
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

    top_destinos = sorted(conteo, key=lambda d: conteo[d], reverse=True)[:10]

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
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
