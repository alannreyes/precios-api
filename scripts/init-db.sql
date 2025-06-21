-- =============================================================================
-- PRECIOS API - INICIALIZACIÓN DE BASE DE DATOS
-- =============================================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto similares

-- Configuraciones de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Crear índices para búsquedas optimizadas
-- (Se crearán automáticamente cuando TypeORM genere las tablas)

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Comentarios para documentación
COMMENT ON DATABASE precios_api IS 'Base de datos para API de búsqueda de precios industriales';

-- Configuraciones de timezone
SET timezone = 'UTC';

-- Mostrar información de inicialización
SELECT 
    'Base de datos inicializada correctamente' as status,
    version() as postgres_version,
    current_timestamp as initialized_at; 