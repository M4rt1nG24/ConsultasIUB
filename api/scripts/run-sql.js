// Ejecuta archivos .sql contra la base de datos configurada en .env
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

for (const file of process.argv.slice(2)) {
  const sql = await readFile(file, 'utf8');
  await pool.query(sql);
  console.log(`✔ ${file}`);
}
await pool.end();
