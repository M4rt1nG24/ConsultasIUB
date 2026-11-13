import pg from 'pg';

// Devolver columnas DATE como 'YYYY-MM-DD' en vez de objetos Date
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const query = (text, params) => pool.query(text, params);
