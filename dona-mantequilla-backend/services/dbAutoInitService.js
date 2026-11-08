/**
 * SERVICIO DE AUTO-INICIALIZACIÓN Y SEEDING DE BASE DE DATOS EN LA NUBE (CLEVER CLOUD MYSQL)
 * Crea automáticamente las tablas:
 * 1. clientes
 * 2. servicios
 * 3. operarios
 * 4. citas
 * 5. mantenciones
 * (Además de auditoria_cambios y consentimientos_ley19628)
 * e inserta las filas iniciales si las tablas están vacías, ejecutando todo de manera
 * secuencial para respetar el límite de conexiones concurrentes de Clever Cloud.
 */

async function inicializarEsquemaYDatosCleverCloud(dbPool) {
    const promisePool = dbPool.promise();

    try {
        // Verificación rápida en 1 sola consulta: si ya existen los clientes en Clever Cloud, no saturar conexiones
        try {
            const [checkRows] = await promisePool.query('SELECT COUNT(*) AS total FROM clientes');
            if (checkRows && checkRows[0] && checkRows[0].total > 0) {
                console.log(`✅ Clever Cloud MySQL listo (${checkRows[0].total} clientes activos en la base de datos)`);
                return;
            }
        } catch {
            // Si la tabla aún no existe, continúa con la creación completa
        }

        // 1. TABLA CLIENTES
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(120) NOT NULL,
                email VARCHAR(120) DEFAULT NULL,
                rut VARCHAR(25) NOT NULL,
                telefono VARCHAR(30) DEFAULT NULL,
                direccion VARCHAR(200) NOT NULL,
                region VARCHAR(100) DEFAULT 'Región Metropolitana de Santiago',
                comuna VARCHAR(80) NOT NULL,
                latitud DECIMAL(10, 6) DEFAULT NULL,
                longitud DECIMAL(10, 6) DEFAULT NULL,
                distancia_km DECIMAL(8, 2) DEFAULT 5.00,
                tiempo_traslado_min INT DEFAULT 15,
                fecha_cita VARCHAR(20) DEFAULT NULL,
                hora_cita VARCHAR(10) DEFAULT NULL,
                servicio VARCHAR(100) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. TABLA SERVICIOS
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS servicios (
                id VARCHAR(30) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                categoria VARCHAR(60) DEFAULT 'Limpieza y Tapicería',
                tiempo_estimado_minutos INT NOT NULL DEFAULT 60,
                precio_referencial INT DEFAULT 45000,
                activo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. TABLA OPERARIOS
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS operarios (
                id VARCHAR(30) PRIMARY KEY,
                rut VARCHAR(25) NOT NULL,
                nombre VARCHAR(120) NOT NULL,
                telefono VARCHAR(30) DEFAULT NULL,
                email VARCHAR(120) DEFAULT NULL,
                comuna_base VARCHAR(80) NOT NULL,
                especialidades_json TEXT,
                zona_cobertura_json TEXT,
                jornada_inicio VARCHAR(10) DEFAULT '08:00',
                jornada_fin VARCHAR(10) DEFAULT '19:00',
                capacidad_diaria_min INT DEFAULT 480,
                activo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. TABLA CITAS
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS citas (
                id VARCHAR(30) PRIMARY KEY,
                cliente_id INT NOT NULL,
                cliente_nombre VARCHAR(120) NOT NULL,
                direccion_cliente VARCHAR(200) NOT NULL,
                comuna_cliente VARCHAR(80) NOT NULL,
                servicio VARCHAR(120) NOT NULL,
                duracion_servicios_min INT NOT NULL DEFAULT 60,
                tiempo_traslado_min INT NOT NULL DEFAULT 15,
                tiempo_total_min INT NOT NULL DEFAULT 75,
                fecha VARCHAR(20) NOT NULL,
                hora_inicio VARCHAR(10) NOT NULL,
                hora_fin_estimada VARCHAR(10) NOT NULL,
                estado VARCHAR(40) NOT NULL DEFAULT 'Programado',
                operario_id VARCHAR(30) DEFAULT 'OP-001',
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. TABLA MANTENCIONES
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS mantenciones (
                id VARCHAR(30) PRIMARY KEY,
                cliente_id INT NOT NULL,
                cliente_nombre VARCHAR(120) NOT NULL,
                comuna VARCHAR(80) NOT NULL,
                direccion VARCHAR(200) NOT NULL,
                servicio VARCHAR(120) NOT NULL,
                frecuencia VARCHAR(40) NOT NULL DEFAULT 'Trimestral',
                fecha_ultima_mantencion VARCHAR(20) DEFAULT NULL,
                fecha_proxima_mantencion VARCHAR(20) NOT NULL,
                hora_sugerida VARCHAR(10) DEFAULT '10:00',
                operario_id VARCHAR(30) DEFAULT 'OP-001',
                estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente de confirmar',
                valor_cobrado INT DEFAULT 45000,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. TABLAS DE AUDITORÍA Y LEY 19.628
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS auditoria_cambios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                perfil_usuario VARCHAR(40) NOT NULL DEFAULT 'ADMIN',
                usuario_id VARCHAR(80) NOT NULL DEFAULT 'sistema',
                metodo VARCHAR(10) NOT NULL,
                ruta VARCHAR(160) NOT NULL,
                accion VARCHAR(120) NOT NULL,
                detalle_json TEXT,
                ip_origen VARCHAR(60),
                tiempo_respuesta_ms INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS consentimientos_ley19628 (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cliente_rut_hash VARCHAR(64) NOT NULL,
                finalidad VARCHAR(180) NOT NULL DEFAULT 'Agendamiento, georreferenciación y recordatorios de servicio',
                consentimiento_otorgado TINYINT(1) NOT NULL DEFAULT 1,
                derecho_arco_estado VARCHAR(40) DEFAULT 'ACTIVO',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('✅ Tablas verificadas en Clever Cloud MySQL (clientes, servicios, operarios, citas, mantenciones, auditoria_cambios, consentimientos_ley19628)');

        // ====================================================================
        // SEEDING AUTOMÁTICO DE FILAS INICIALES SI LAS TABLAS ESTÁN VACÍAS
        // ====================================================================

        // A. Seed Clientes (9 clientes iniciales)
        const [rowsClientes] = await promisePool.query('SELECT COUNT(*) AS total FROM clientes');
        if (rowsClientes[0].total === 0) {
            await promisePool.query(`
                INSERT INTO clientes
                (nombre, email, rut, telefono, direccion, region, comuna, latitud, longitud, distancia_km, tiempo_traslado_min, fecha_cita, hora_cita, servicio)
                VALUES
                ('antonio diaz', 'antonio@gmail.com', '20.415.729-1', '+56 9 4512 8890', 'Av. La Dehesa 1450', 'Región Metropolitana de Santiago', 'Lo Barnechea', -33.354200, -70.517500, 3.20, 12, '2026-11-08', '09:00', 'Sofás'),
                ('María José Urrejola', 'mjurrejola@email.com', '15.834.912-4', '+56 9 8123 4567', 'Av. El Rodeo 12850', 'Región Metropolitana de Santiago', 'Lo Barnechea', -33.349100, -70.508200, 2.80, 11, '2026-11-08', '11:30', 'Aseo profundo'),
                ('Cristián Matte', 'cmatte@email.com', '12.456.789-K', '+56 9 9876 1122', 'Av. Alonso de Córdova 4355', 'Región Metropolitana de Santiago', 'Vitacura', -33.394500, -70.581200, 7.80, 24, '2026-11-08', '15:00', 'Alfombras'),
                ('Valentina Errázuriz', 'verrazuriz@email.com', '18.221.334-7', '+56 9 7654 3344', 'Av. Apoquindo 6410', 'Región Metropolitana de Santiago', 'Las Condes', -33.408800, -70.567100, 8.40, 26, '2026-11-09', '09:30', 'Colchones'),
                ('Sebastián Larraín', 'slarrain@email.com', '16.908.112-3', '+56 9 6543 2211', 'Av. Príncipe de Gales 7120', 'Región Metropolitana de Santiago', 'La Reina', -33.439200, -70.542100, 11.50, 32, '2026-11-09', '12:00', 'Ventanales'),
                ('Patricia Chadwick', 'pchadwick@email.com', '14.555.666-0', '+56 9 5432 8899', 'Av. Pedro de Valdivia 1500', 'Región Metropolitana de Santiago', 'Providencia', -33.433100, -70.609800, 13.20, 36, '2026-11-10', '10:00', 'Sofás'),
                ('Gonzalo Tapia', 'gtapia@email.com', '14.555.666-0', '+56 9 2222 6666', 'Av. Irarrázaval 3500', 'Región Metropolitana de Santiago', 'Ñuñoa', -33.454500, -70.592100, 15.00, 41, '2026-11-10', '14:00', 'Sillones'),
                ('Ignacio Valenzuela', 'ivalenzuela@email.com', '13.999.888-8', '+56 9 9999 1111', 'Alameda 2100', 'Región Metropolitana de Santiago', 'Santiago', -33.446200, -70.665400, 18.50, 49, '2026-11-11', '10:00', 'Servicio combinado'),
                ('Fernanda Rojas', 'frojas@email.com', '17.111.222-7', '+56 9 7777 3333', 'Av. Pajaritos 3400', 'Región Metropolitana de Santiago', 'Maipú', -33.509500, -70.756200, 26.00, 65, '2026-11-12', '11:00', 'Sillas')
            `);
            console.log('🌱 Filas iniciales insertadas en tabla: clientes (9 registros)');
        }

        // B. Seed Servicios (Catálogo de 9 servicios base)
        const [rowsServicios] = await promisePool.query('SELECT COUNT(*) AS total FROM servicios');
        if (rowsServicios[0].total === 0) {
            await promisePool.query(`
                INSERT INTO servicios (id, nombre, categoria, tiempo_estimado_minutos, precio_referencial, activo)
                VALUES
                ('SERV-001', 'Sofás', 'Tapicería', 90, 45000, 1),
                ('SERV-002', 'Sillones', 'Tapicería', 45, 28000, 1),
                ('SERV-003', 'Sillas', 'Tapicería', 20, 8000, 1),
                ('SERV-004', 'Colchones', 'Dormitorio', 60, 38000, 1),
                ('SERV-005', 'Alfombras', 'Pisos y Alfombras', 75, 42000, 1),
                ('SERV-006', 'Ventanas', 'Vidrios', 30, 35000, 1),
                ('SERV-007', 'Ventanales', 'Vidrios', 45, 50000, 1),
                ('SERV-008', 'Aseo profundo', 'Integral', 180, 95000, 1),
                ('SERV-009', 'Servicio combinado', 'Integral', 120, 78000, 1)
            `);
            console.log('🌱 Filas iniciales insertadas en tabla: servicios (9 registros)');
        }

        // C. Seed Operarios (Equipo de 3 operarios)
        const [rowsOperarios] = await promisePool.query('SELECT COUNT(*) AS total FROM operarios');
        if (rowsOperarios[0].total === 0) {
            await promisePool.query(`
                INSERT INTO operarios
                (id, rut, nombre, telefono, email, comuna_base, especialidades_json, zona_cobertura_json, jornada_inicio, jornada_fin, capacidad_diaria_min, activo)
                VALUES
                ('OP-001', '18.765.432-1', 'Juan Pérez', '+56 9 1234 5678', 'juan.perez@empresa.cl', 'Lo Barnechea', '["Aseo profundo","Sofás","Alfombras","Colchones","Servicio combinado"]', '["Lo Barnechea","Vitacura","Las Condes","Colina"]', '08:00', '19:00', 480, 1),
                ('OP-002', '16.543.210-K', 'Carlos Gómez', '+56 9 8765 4321', 'carlos.gomez@empresa.cl', 'Las Condes', '["Sofás","Sillones","Sillas","Ventanas","Ventanales"]', '["Las Condes","Providencia","Vitacura","Ñuñoa","La Reina"]', '08:30', '18:30', 480, 1),
                ('OP-003', '19.234.567-8', 'Andrés Muñoz', '+56 9 7654 3210', 'andres.munoz@empresa.cl', 'Providencia', '["Colchones","Alfombras","Sillas","Sillones","Servicio combinado","Aseo profundo"]', '["Providencia","Santiago","Ñuñoa","Maipú","La Florida","Puente Alto"]', '08:00', '19:00', 480, 1)
            `);
            console.log('🌱 Filas iniciales insertadas en tabla: operarios (3 registros)');
        }

        // D. Seed Citas (9 citas iniciales vinculadas a los clientes)
        const [rowsCitas] = await promisePool.query('SELECT COUNT(*) AS total FROM citas');
        if (rowsCitas[0].total === 0) {
            await promisePool.query(`
                INSERT INTO citas
                (id, cliente_id, cliente_nombre, direccion_cliente, comuna_cliente, servicio, duracion_servicios_min, tiempo_traslado_min, tiempo_total_min, fecha, hora_inicio, hora_fin_estimada, estado, operario_id, observaciones)
                VALUES
                ('CITA-001', 1, 'antonio diaz', 'Av. La Dehesa 1450', 'Lo Barnechea', 'Sofás', 90, 12, 102, '2026-11-08', '09:00', '10:42', 'Programado', 'OP-001', 'Limpieza de sofá seccional'),
                ('CITA-002', 2, 'María José Urrejola', 'Av. El Rodeo 12850', 'Lo Barnechea', 'Aseo profundo', 180, 11, 191, '2026-11-08', '11:30', '14:41', 'Confirmado', 'OP-001', 'Casa de 2 pisos'),
                ('CITA-003', 3, 'Cristián Matte', 'Av. Alonso de Córdova 4355', 'Vitacura', 'Alfombras', 75, 24, 99, '2026-11-08', '15:00', '16:39', 'En Ruta', 'OP-001', 'Alfombra sala principal'),
                ('CITA-004', 4, 'Valentina Errázuriz', 'Av. Apoquindo 6410', 'Las Condes', 'Colchones', 60, 26, 86, '2026-11-09', '09:30', '10:56', 'Programado', 'OP-002', 'Colchón King + 2 plazas'),
                ('CITA-005', 5, 'Sebastián Larraín', 'Av. Príncipe de Gales 7120', 'La Reina', 'Ventanales', 45, 32, 77, '2026-11-09', '12:00', '13:17', 'Confirmado', 'OP-002', 'Ventanales terraza'),
                ('CITA-006', 6, 'Patricia Chadwick', 'Av. Pedro de Valdivia 1500', 'Providencia', 'Sofás', 90, 36, 126, '2026-11-10', '10:00', '12:06', 'Pendiente', 'OP-002', 'Sofá 3 cuerpos lino'),
                ('CITA-007', 7, 'Gonzalo Tapia', 'Av. Irarrázaval 3500', 'Ñuñoa', 'Sillones', 45, 41, 86, '2026-11-10', '14:00', '15:26', 'Programado', 'OP-003', '2 sillones bergere'),
                ('CITA-008', 8, 'Ignacio Valenzuela', 'Alameda 2100', 'Santiago', 'Servicio combinado', 120, 49, 169, '2026-11-11', '10:00', '12:49', 'Confirmado', 'OP-003', 'Sofá + Alfombra + Colchón'),
                ('CITA-009', 9, 'Fernanda Rojas', 'Av. Pajaritos 3400', 'Maipú', 'Sillas', 20, 65, 85, '2026-11-12', '11:00', '12:25', 'Programado', 'OP-003', 'Comedor 8 sillas tapizadas')
            `);
            console.log('🌱 Filas iniciales insertadas en tabla: citas (9 registros)');
        }

        // E. Seed Mantenciones (Mantenciones programadas iniciales)
        const [rowsMantenciones] = await promisePool.query('SELECT COUNT(*) AS total FROM mantenciones');
        if (rowsMantenciones[0].total === 0) {
            await promisePool.query(`
                INSERT INTO mantenciones
                (id, cliente_id, cliente_nombre, comuna, direccion, servicio, frecuencia, fecha_ultima_mantencion, fecha_proxima_mantencion, hora_sugerida, operario_id, estado, valor_cobrado, observaciones)
                VALUES
                ('MANT-001', 1, 'antonio diaz', 'Lo Barnechea', 'Av. La Dehesa 1450', 'Sofás', 'Trimestral', '2026-08-08', '2026-11-08', '09:00', 'OP-001', 'Confirmada', 45000, 'Mantención preventiva de tapiz cada 3 meses'),
                ('MANT-002', 2, 'María José Urrejola', 'Lo Barnechea', 'Av. El Rodeo 12850', 'Aseo profundo', 'Mensual', '2026-10-09', '2026-11-09', '11:00', 'OP-001', 'Pendiente de confirmar', 95000, 'Hogar con mascotas y niños'),
                ('MANT-003', 3, 'Cristián Matte', 'Vitacura', 'Av. Alonso de Córdova 4355', 'Alfombras', 'Semestral', '2026-05-12', '2026-11-12', '15:00', 'OP-002', 'Próxima a vencer', 42000, 'Limpieza semestral de alfombras de alto tráfico'),
                ('MANT-004', 4, 'Valentina Errázuriz', 'Las Condes', 'Av. Apoquindo 6410', 'Colchones', 'Cada 2 meses', '2026-09-15', '2026-11-15', '10:00', 'OP-002', 'Programada', 38000, 'Sanitización antiácaros bimestral')
            `);
            console.log('🌱 Filas iniciales insertadas en tabla: mantenciones (4 registros)');
        }
    } catch (error) {
        console.error('❌ Error durante la auto-inicialización en Clever Cloud:', error.message);
    }
}

module.exports = {
    inicializarEsquemaYDatosCleverCloud
};
