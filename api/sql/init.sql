-- api/sql/init.sql
-- Se ejecuta automáticamente al primer arranque del contenedor Postgres.

CREATE TABLE IF NOT EXISTS producto (
    id            BIGSERIAL PRIMARY KEY,
    producto_id   TEXT NOT NULL DEFAULT '732',
    fecha         TEXT NOT NULL,
    presentacion  TEXT,
    origen        TEXT,
    destino       TEXT,
    precio_min    FLOAT,
    precio_max    FLOAT,
    precio_frec   FLOAT,
    obs           TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producto_destino    ON producto (destino);
CREATE INDEX IF NOT EXISTS idx_producto_fecha      ON producto (fecha);
CREATE INDEX IF NOT EXISTS idx_producto_id_sniim   ON producto (producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_dest_fecha ON producto (destino, fecha);
