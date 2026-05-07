import json
#import os
from pathlib import Path
#from dotenv import load_dotenv
from supabase import create_client
from embeddings_factory import embeddings  
import config  

#load_dotenv()

# Credenciales
supabase = create_client(
    config.SUPABASE_URL,  
    config.SUPABASE_KEY
)


# Leer JSON
data_dir = Path(__file__).parent
with open(data_dir / "platano_tabasco.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def build_contenido(record):
    return (
        f"Fecha: {record['Fecha']} | "
        f"Presentación: {record['Presentación']} | "
        f"Origen: {record['Origen']} | "
        f"Destino: {record['Destino']} | "
        f"Precio mínimo: {record['Precio Mín']} | "
        f"Precio máximo: {record['Precio Max']} | "
        f"Precio frecuente: {record['Precio Frec']}"
    )

total = len(data)
BATCH_SIZE = 30

print(f"Total registros: {total}")


for i in range(0, total, BATCH_SIZE):
    batch = data[i:i + BATCH_SIZE]
    contenidos = [build_contenido(r) for r in batch]

    try:
        vectors = embeddings.embed_documents(contenidos)
        rows = []
        for record, contenido, vector in zip(batch, contenidos, vectors):
            rows.append({
                "fecha":        record["Fecha"],
                "presentacion": record["Presentación"],
                "origen":       record["Origen"],
                "destino":      record["Destino"],
                "precio_min":   float(record["Precio Mín"]),
                "precio_max":   float(record["Precio Max"]),
                "precio_frec":  float(record["Precio Frec"]),
                "obs":          record.get("Obs.", ""),
                "contenido":    contenido,
                "embedding":    vector,
            })

        supabase.table("producto").insert(rows).execute()
        progreso = min(i + BATCH_SIZE, total)
        print(f"Procesados {progreso} / {total} ({(progreso/total)*100:.1f}%)")
        
    except Exception as e:
        print(f"Error en lote {i}: {e}")

print(f"Completado: {total} registros insertados en Supabase")