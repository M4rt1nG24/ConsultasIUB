import { Router } from 'express';
import { query } from './db.js';

/**
 * Genera un router CRUD genérico para una tabla.
 * @param {string} table   Nombre de la tabla
 * @param {string[]} fields Columnas editables
 * @param {string[]} required Columnas obligatorias al crear
 */
export function crudRouter(table, fields, required = []) {
  const router = Router();

  const pick = (body) =>
    Object.fromEntries(fields.filter((f) => body?.[f] !== undefined).map((f) => [f, body[f]]));

  const parseId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'id inválido' });
      return null;
    }
    return id;
  };

  router.get('/', async (_req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} ORDER BY id`);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const data = pick(req.body);
    const missing = required.filter((f) => data[f] === undefined || data[f] === '');
    if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
    const cols = Object.keys(data);
    const { rows } = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      Object.values(data),
    );
    res.status(201).json(rows[0]);
  });

  router.put('/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const data = pick(req.body);
    const cols = Object.keys(data);
    if (!cols.length) return res.status(400).json({ error: 'Nada que actualizar' });
    const { rows } = await query(
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1} RETURNING *`,
      [...Object.values(data), id],
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
  });

  return router;
}
