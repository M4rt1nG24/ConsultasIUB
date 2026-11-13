-- Datos iniciales (los mismos que tenía el frontend en memoria). Idempotente.

INSERT INTO usuarios (id, nombre, email) VALUES
  (1, 'Ana García',   'ana@email.com'),
  (2, 'Carlos López', 'carlos@email.com'),
  (3, 'María Pérez',  'maria@email.com')
ON CONFLICT (id) DO NOTHING;
SELECT setval('usuarios_id_seq', GREATEST((SELECT MAX(id) FROM usuarios), 1));

INSERT INTO reportes (id, titulo, tipo, fecha, estado) VALUES
  (101, 'Reporte de Asistencias - Septiembre', 'Académico', '2026-09-28', 'Completado'),
  (102, 'Solicitudes PQRS Trimestrales',       'Atención',  '2026-09-30', 'Pendiente'),
  (103, 'Evaluación de Desempeño Docente',     'Auditoría', '2026-10-01', 'Completado')
ON CONFLICT (id) DO NOTHING;
SELECT setval('reportes_id_seq', GREATEST((SELECT MAX(id) FROM reportes), 1));

INSERT INTO consultas (id, usuario_id, asunto, descripcion, estado) VALUES
  (1, 1, 'Horario de tutorías', '¿Cuál es el horario de tutoría de Cálculo?', 'Abierta'),
  (2, 2, 'Revisión de nota',    'Solicito revisión del parcial 2.',           'En proceso')
ON CONFLICT (id) DO NOTHING;
SELECT setval('consultas_id_seq', GREATEST((SELECT MAX(id) FROM consultas), 1));
