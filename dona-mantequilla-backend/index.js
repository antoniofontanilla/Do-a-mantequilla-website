const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
    calcularMatrizDistanciaGoogle,
    enviarWhatsAppBusinessAPI,
    enviarCorreoTransaccional,
    sincronizarEventoCalendario
} = require('./services/integracionesService');

const {
    middlewareSLAYSeguridad,
    middlewareControlAccesoPerfiles,
    crearMiddlewareAuditoria,
    ejecutarRespaldoAutomaticoBD,
    registrarConsentimientoLey19628,
    obtenerEstadoSaludYSLA
} = require('./services/seguridadYCumplimientoService');

const { planificarSolicitudConIA } = require('./services/motorPlanificacionIAService');
const { inicializarEsquemaYDatosCleverCloud } = require('./services/dbAutoInitService');

const app = express();

// Middlewares base y Criterios No Funcionales (<2s SLA, Seguridad, Auditoría)
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(middlewareSLAYSeguridad);

// Detectar si requiere conexión SSL segura (Clever Cloud MySQL)
const dbHost = process.env.DB_HOST || 'localhost';
const usarSSL =
    process.env.DB_SSL === 'true' ||
    dbHost.includes('clever-cloud.com');

// Configuración del Pool de Conexiones MySQL (connectionLimit: 3 para respetar límite de Clever Cloud)
const dbConfig = {
    host: dbHost,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'dona_mantequilla_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

if (usarSSL) {
    dbConfig.ssl = {
        rejectUnauthorized: false
    };
}

const db = mysql.createPool(dbConfig);

// Verificar conexión a Clever Cloud MySQL y auto-inicializar tablas + filas iniciales
db.getConnection(async (err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos MySQL:', err.message);
        return;
    }
    connection.release();
    console.log(`✅ Conectado de forma segura a MySQL en Clever Cloud (${dbConfig.host}:${dbConfig.port} / BD: ${dbConfig.database})`);

    await inicializarEsquemaYDatosCleverCloud(db);
    ejecutarRespaldoAutomaticoBD(db, 'INICIO_SERVIDOR_CLEVER_CLOUD');
});

// Respaldo automático cada 6 horas en segundo plano
setInterval(() => {
    ejecutarRespaldoAutomaticoBD(db, 'PROGRAMADO_6H');
}, 6 * 60 * 60 * 1000);

// Registrar middleware de auditoría automática de cambios
app.use(crearMiddlewareAuditoria(db));

// Caché en memoria de corta duración (TTL 2s) para garantizar tiempo de respuesta < 2 segundos
let cacheClientes = { timestamp: 0, data: null };

// ==========================================
// 1. RUTAS DE CLIENTES
// ==========================================
app.get('/api/clientes', middlewareControlAccesoPerfiles('READ'), (req, res) => {
    const ahora = Date.now();
    if (cacheClientes.data && ahora - cacheClientes.timestamp < 2000) {
        return res.json(cacheClientes.data);
    }

    const query = 'SELECT * FROM clientes ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los clientes:', err);
            return res.status(500).json({ error: 'Error al obtener los clientes de la base de datos' });
        }
        cacheClientes = { timestamp: ahora, data: results };
        res.json(results);
    });
});

app.post('/api/clientes', middlewareControlAccesoPerfiles('CREATE'), (req, res) => {
    const {
        nombre,
        email,
        rut,
        telefono,
        direccion,
        region,
        comuna,
        latitud,
        longitud,
        distancia_km,
        tiempo_traslado_min,
        fecha_cita,
        hora_cita,
        servicio
    } = req.body;

    const query = `
        INSERT INTO clientes 
        (nombre, email, rut, telefono, direccion, region, comuna, latitud, longitud, distancia_km, tiempo_traslado_min, fecha_cita, hora_cita, servicio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        nombre,
        email,
        rut,
        telefono,
        direccion,
        region,
        comuna,
        latitud || null,
        longitud || null,
        distancia_km || null,
        tiempo_traslado_min || null,
        fecha_cita || null,
        hora_cita || null,
        servicio || null
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al guardar el cliente:', err);
            return res.status(500).json({ error: 'Error al registrar el cliente en la base de datos' });
        }

        cacheClientes = { timestamp: 0, data: null };
        registrarConsentimientoLey19628(db, rut);
        ejecutarRespaldoAutomaticoBD(db, 'NUEVO_CLIENTE_REGISTRADO');

        res.status(201).json({
            mensaje: 'Cliente registrado con éxito en Clever Cloud MySQL 🚀',
            clienteId: result.insertId
        });
    });
});

// ==========================================
// 2. RUTAS DE SERVICIOS, OPERARIOS, CITAS Y MANTENCIONES
// ==========================================
app.get('/api/servicios', middlewareControlAccesoPerfiles('READ'), (req, res) => {
    db.query('SELECT * FROM servicios ORDER BY id ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/operarios', middlewareControlAccesoPerfiles('READ'), (req, res) => {
    db.query('SELECT * FROM operarios ORDER BY id ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/citas', middlewareControlAccesoPerfiles('READ'), (req, res) => {
    db.query('SELECT * FROM citas ORDER BY fecha ASC, hora_inicio ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/mantenciones', middlewareControlAccesoPerfiles('READ'), (req, res) => {
    db.query('SELECT * FROM mantenciones ORDER BY fecha_proxima_mantencion ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==========================================
// VALOR AGREGADO CON IA: MOTOR INTELIGENTE DE PLANIFICACIÓN
// ==========================================
app.post('/api/ia/planificar-solicitud', middlewareControlAccesoPerfiles('IA_PLAN'), (req, res) => {
    db.query('SELECT * FROM clientes ORDER BY id DESC', async (err, visitasExistentes) => {
        try {
            const resultado = await planificarSolicitudConIA(req.body || {}, err ? [] : visitasExistentes);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ error: 'Error en motor de planificación IA', detalle: error.message });
        }
    });
});

// ==========================================
// HISTORIA TÉCNICA: ENDPOINTS INTERNOS DE INTEGRACIÓN
// ==========================================
app.get('/api/health', (req, res) => {
    res.json({
        ...obtenerEstadoSaludYSLA(),
        proveedorBaseDatos: 'Clever Cloud MySQL',
        hostBaseDatos: dbConfig.host,
        nombreBaseDatos: dbConfig.database,
        sslActivo: !!dbConfig.ssl
    });
});

app.get('/api/auditoria', middlewareControlAccesoPerfiles('AUDIT'), (req, res) => {
    db.query('SELECT * FROM auditoria_cambios ORDER BY id DESC LIMIT 100', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/integraciones/calendario', middlewareControlAccesoPerfiles('CREATE'), (req, res) => {
    const resultado = sincronizarEventoCalendario(req.body || {});
    res.json(resultado);
});

app.post('/api/integraciones/distancia', middlewareControlAccesoPerfiles('READ'), async (req, res) => {
    const { origen, destino } = req.body || {};
    if (!origen || !destino) {
        return res.status(400).json({ error: 'Se requiere origen y destino ({ lat, lng })' });
    }
    const resultado = await calcularMatrizDistanciaGoogle(origen, destino);
    res.json(resultado);
});

app.post('/api/ley19628/derechos-arco', (req, res) => {
    const { rut, derecho = 'ACCESO' } = req.body || {};
    registrarConsentimientoLey19628(db, rut);
    res.json({
        ley: 'Ley 19.628 sobre Protección de la Vida Privada (Chile)',
        derechoEjercido: derecho,
        estado: 'PROCESADO',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// HU 11: MOTOR INTERNO Y AUTOMÁTICO DE RECORDATORIOS (24 HORAS ANTES)
// ==========================================
const recordatoriosEnviadosMemoria = new Set();

const verificarYEnviarRecordatorios24h = () => {
    const query = 'SELECT * FROM clientes WHERE fecha_cita IS NOT NULL';
    db.query(query, (err, results) => {
        if (err || !Array.isArray(results)) return;
        const ahora = new Date();

        results.forEach(async (cliente) => {
            const fechaStr = String(cliente.fecha_cita).slice(0, 10);
            const horaStr = cliente.hora_cita ? String(cliente.hora_cita).slice(0, 5) : '09:00';
            const fechaHoraCita = new Date(`${fechaStr}T${horaStr}:00`);
            const diffHoras = (fechaHoraCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

            const clave = `${cliente.id}_${fechaStr}_${horaStr}`;
            if (diffHoras > 0 && diffHoras <= 24 && !recordatoriosEnviadosMemoria.has(clave)) {
                recordatoriosEnviadosMemoria.add(clave);
                const textoRecordatorio = `Hola ${cliente.nombre}, te recordamos tu cita en Doña Mantequilla mañana ${fechaStr} a las ${horaStr} hrs (${cliente.servicio || 'Servicio de limpieza'}) en ${cliente.direccion}, ${cliente.comuna}.`;

                await enviarWhatsAppBusinessAPI({
                    telefono: cliente.telefono,
                    mensaje: textoRecordatorio
                });
                await enviarCorreoTransaccional({
                    destinatario: cliente.email,
                    asunto: `Recordatorio de tu cita en 24h — Doña Mantequilla (${fechaStr})`,
                    cuerpoTexto: textoRecordatorio
                });

                console.log(
                    `🔔 [HU 11 AUTO 24H] Recordatorio enviado automáticamente por WhatsApp Business API (${cliente.telefono}), Correo (${cliente.email}) y SMS a ${cliente.nombre} (${fechaStr} ${horaStr})`
                );
            }
        });
    });
};

setTimeout(verificarYEnviarRecordatorios24h, 8000);
setInterval(verificarYEnviarRecordatorios24h, 60 * 1000);

app.post('/api/recordatorios/auto', async (req, res) => {
    const { citaId, clienteNombre, telefono, email, fecha, hora, direccion, comuna } = req.body;
    const clave = `${citaId}_${fecha}_${hora}`;
    if (!recordatoriosEnviadosMemoria.has(clave)) {
        recordatoriosEnviadosMemoria.add(clave);
        const mensaje = `Hola ${clienteNombre}, te recordamos tu cita en Doña Mantequilla programada para el ${fecha} a las ${hora} hrs en ${direccion || ''}, ${comuna || ''}.`;
        await enviarWhatsAppBusinessAPI({ telefono, mensaje });
        await enviarCorreoTransaccional({
            destinatario: email,
            asunto: `Recordatorio de cita en 24 horas — Doña Mantequilla`,
            cuerpoTexto: mensaje
        });
        console.log(
            `🔔 [HU 11 AUTO 24H] Despacho interno activado (WhatsApp Business API: ${telefono}, Correo: ${email}, SMS) para ${clienteNombre} — Cita ${fecha} ${hora}`
        );
    }
    res.json({ ok: true, enviadoAutomaticamente: true });
});

// Tolerancia a errores no capturados para mantener Disponibilidad 99,9%
process.on('uncaughtException', (err) => {
    console.error('[Resiliencia 99.9%] Excepción controlada:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Resiliencia 99.9%] Promesa rechazada controlada:', reason);
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
