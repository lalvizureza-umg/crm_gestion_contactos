USE crm_ing_software;
GO

/* =========================================================
   Catálogo de cargos
   ========================================================= */
IF OBJECT_ID('dbo.cargos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.cargos (
        id_cargo INT IDENTITY(1,1) PRIMARY KEY,
        nombre_cargo VARCHAR(100) NOT NULL UNIQUE,
        nivel_cargo VARCHAR(30) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'Activo',
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE()
    );

    INSERT INTO dbo.cargos (nombre_cargo, nivel_cargo, estado)
    VALUES
        ('Manager', 'MANAGER', 'Activo'),
        ('Supervisor', 'SUPERVISOR', 'Activo'),
        ('Vendedor', 'OPERATIVO', 'Activo'),
        ('Analista', 'OPERATIVO', 'Activo'),
        ('Coordinador', 'OPERATIVO', 'Activo'),
        ('Asistente', 'OPERATIVO', 'Activo');
END
GO

/* =========================================================
   Nuevas columnas para jerarquía de empleados
   ========================================================= */
IF COL_LENGTH('dbo.empleados', 'id_cargo') IS NULL
BEGIN
    ALTER TABLE dbo.empleados ADD id_cargo INT NULL;
END
GO

IF COL_LENGTH('dbo.empleados', 'id_supervisor') IS NULL
BEGIN
    ALTER TABLE dbo.empleados ADD id_supervisor INT NULL;
END
GO

IF COL_LENGTH('dbo.empleados', 'id_manager') IS NULL
BEGIN
    ALTER TABLE dbo.empleados ADD id_manager INT NULL;
END
GO

/* =========================================================
   Llaves foráneas
   ========================================================= */
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_empleados_cargos'
)
BEGIN
    ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_cargos
    FOREIGN KEY (id_cargo) REFERENCES dbo.cargos(id_cargo);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_empleados_supervisor'
)
BEGIN
    ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_supervisor
    FOREIGN KEY (id_supervisor) REFERENCES dbo.empleados(id_empleado);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_empleados_manager'
)
BEGIN
    ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_manager
    FOREIGN KEY (id_manager) REFERENCES dbo.empleados(id_empleado);
END
GO

/* =========================================================
   Migración opcional desde cargo texto a catálogo
   ========================================================= */
UPDATE e
SET e.id_cargo = c.id_cargo
FROM dbo.empleados e
INNER JOIN dbo.cargos c
    ON UPPER(LTRIM(RTRIM(e.cargo))) = UPPER(LTRIM(RTRIM(c.nombre_cargo)))
WHERE e.id_cargo IS NULL
  AND e.cargo IS NOT NULL;
GO

PRINT 'Migración empleados jerarquía aplicada correctamente.';
GO