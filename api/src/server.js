import express from 'express';
import cors from 'cors';
import { pool, query } from './db.js';
import { crudRouter } from './crud.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await query('SELECT current_database() AS db, version() AS version');
    res.json({ status: 'ok', ...rows[0] });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

app.use('/api/usuarios', crudRouter('usuarios', ['nombre', 'email'], ['nombre', 'email']));
app.use('/api/reportes', crudRouter('reportes', ['titulo', 'tipo', 'fecha', 'estado'], ['titulo', 'tipo']));
app.use(
  '/api/consultas',
  crudRouter('consultas', ['usuario_id', 'asunto', 'descripcion', 'estado'], ['usuario_id', 'asunto']),
);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo de errores (Express 5 captura los errores async automáticamente)
const PG_ERRORS = {
  '23505': [409, 'Registro duplicado'],
  '23503': [400, 'Referencia inválida (clave foránea)'],
  '23514': [400, 'Valor no permitido'],
  '22P02': [400, 'Formato de dato inválido'],
  '22007': [400, 'Fecha inválida'],
  '22001': [400, 'Texto demasiado largo'],
};
app.use((err, _req, res, _next) => {
  const known = PG_ERRORS[err.code];
  if (known) return res.status(known[0]).json({ error: known[1], detalle: err.detail ?? err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}/api`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
