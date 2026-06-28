-- Flujo auditable de importación de productores locales.
-- Las tablas de staging separan los archivos externos de los datos publicados.

CREATE TABLE IF NOT EXISTS local_producer (
    id             BIGSERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    municipality   TEXT,
    state          TEXT,
    external_id    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_local_producer_identity
    ON local_producer (LOWER(name), LOWER(COALESCE(municipality, '')));

CREATE TABLE IF NOT EXISTS import_batch (
    id                BIGSERIAL PRIMARY KEY,
    filename          TEXT NOT NULL,
    file_sha256       TEXT NOT NULL,
    source_sheet      TEXT,
    source_format     TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'analyzed'
        CHECK (status IN ('analyzed', 'needs_review', 'approved', 'imported', 'rejected')),
    producer_name     TEXT NOT NULL,
    municipality      TEXT,
    currency          TEXT NOT NULL DEFAULT 'MXN',
    package_weight_kg NUMERIC(12, 4),
    detected_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    agent_used        BOOLEAN NOT NULL DEFAULT FALSE,
    agent_output      JSONB,
    total_rows        INTEGER NOT NULL DEFAULT 0,
    valid_rows        INTEGER NOT NULL DEFAULT 0,
    warning_rows      INTEGER NOT NULL DEFAULT 0,
    error_rows        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at       TIMESTAMPTZ,
    imported_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_batch_status
    ON import_batch (status, created_at DESC);

CREATE TABLE IF NOT EXISTS import_row_staging (
    id                BIGSERIAL PRIMARY KEY,
    batch_id          BIGINT NOT NULL REFERENCES import_batch(id) ON DELETE CASCADE,
    source_row        INTEGER NOT NULL,
    source_year_block INTEGER,
    record_date       DATE,
    iso_week          INTEGER,
    month             INTEGER,
    product_name      TEXT,
    quality           TEXT,
    presentation      TEXT,
    price             NUMERIC(14, 4),
    currency          TEXT NOT NULL DEFAULT 'MXN',
    row_status        TEXT NOT NULL CHECK (row_status IN ('valid', 'warning', 'error')),
    included          BOOLEAN NOT NULL DEFAULT TRUE,
    issues            JSONB NOT NULL DEFAULT '[]'::JSONB,
    raw_data          JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_row_batch
    ON import_row_staging (batch_id, row_status, source_row);

CREATE TABLE IF NOT EXISTS producer_price (
    id                BIGSERIAL PRIMARY KEY,
    producer_id       BIGINT NOT NULL REFERENCES local_producer(id),
    record_date       DATE NOT NULL,
    product_name      TEXT NOT NULL,
    quality           TEXT,
    presentation      TEXT,
    package_weight_kg NUMERIC(12, 4),
    price             NUMERIC(14, 4) NOT NULL CHECK (price > 0),
    currency          TEXT NOT NULL DEFAULT 'MXN',
    source_batch_id   BIGINT NOT NULL REFERENCES import_batch(id),
    source_row        INTEGER NOT NULL,
    source_year_block INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_producer_price_source
    ON producer_price (
        source_batch_id,
        source_row,
        COALESCE(source_year_block, 0)
    );

CREATE INDEX IF NOT EXISTS idx_producer_price_lookup
    ON producer_price (producer_id, product_name, record_date);

CREATE TABLE IF NOT EXISTS import_column_mapping (
    id             BIGSERIAL PRIMARY KEY,
    source_key     TEXT NOT NULL,
    source_columns JSONB NOT NULL,
    mapping        JSONB NOT NULL,
    confidence     NUMERIC(5, 4),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_key)
);
