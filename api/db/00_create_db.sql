-- Ejecutar UNA sola vez como superusuario (postgres):
--   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -f api/db/00_create_db.sql
-- Crea el rol y la base de datos de la aplicación.
-- La contraseña debe coincidir con DB_PASSWORD en api/.env

CREATE ROLE consultas_app WITH LOGIN PASSWORD 'k5MnHgzbodVcTnyk3qt8HGm4';
CREATE DATABASE consultas_iub OWNER consultas_app ENCODING 'UTF8';
