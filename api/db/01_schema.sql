-- Esquema de la base de datos consultas_iub (idempotente)

CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL UNIQUE,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reportes (
  id         SERIAL PRIMARY KEY,
  titulo     VARCHAR(200) NOT NULL,
  tipo       VARCHAR(60)  NOT NULL,
  fecha      DATE         NOT NULL DEFAULT CURRENT_DATE,
  estado     VARCHAR(20)  NOT NULL DEFAULT 'Pendiente'
             CHECK (estado IN ('Completado', 'Pendiente')),
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultas (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  asunto       VARCHAR(200) NOT NULL,
  descripcion  TEXT,
  estado       VARCHAR(20)  NOT NULL DEFAULT 'Abierta'
               CHECK (estado IN ('Abierta', 'En proceso', 'Cerrada')),
  creado_en    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultas_usuario ON consultas(usuario_id);
