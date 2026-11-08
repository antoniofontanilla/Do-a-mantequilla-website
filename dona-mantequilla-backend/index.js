const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { inicializarEsquemaYDatosCleverCloud } = require('./services/dbAutoInitService');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Detectar si requiere conexión SSL segura (Clever Cloud MySQL)
const dbHost = process.env.DB_HOST || 'bvatb8utjr2j7klctdq3-mysql.services.clever-cloud.com';
const usarSSL =
    process.env.DB_SSL === 'true' ||
    dbHost.includes('clever-cloud.com');

// Pool MySQL optimizado para Clever Cloud (connectionLimit: 1 para nunca exceder max_user_connections=5)
const dbConfig = {
    host: dbHost,
    user: process.env.DB_USER || 'u169ni8y08m8gq3k',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'x2uK0oGoilo3rqSGanEw',
    database: process.env.DB_NAME || 'bvatb8utjr2j7klctdq3',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 1,
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

// Probar conexión a la base de datos y auto-inicializar tablas si están vacías
db.getConnection(async (err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos MySQL:', err.message);
        return;
    }
    connection.release();
    console.log(`✅ Conectado exitosamente a la base de datos MySQL (${dbConfig.database})`);
    await inicializarEsquemaYDatosCleverCloud(db);
});

// ==========================================
// RUTA PARA OBTENER TODOS LOS CLIENTES
// ==========================================
app.get('/api/clientes', (req, res) => {
    const query = 'SELECT * FROM clientes ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los clientes:', err.message);
            return res.status(500).json({ error: 'Error al obtener los clientes de la base de datos' });
        }
        res.json(results);
    });
});

// ==========================================
// RUTA PARA REGISTRAR UN CLIENTE NUEVO
// ==========================================
app.post('/api/clientes', (req, res) => {
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
        email || '',
        rut,
        telefono || '',
        direccion,
        region || 'Región Metropolitana de Santiago',
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
            console.error('Error al guardar el cliente:', err.message);
            return res.status(500).json({ error: 'Error al registrar el cliente en la base de datos' });
        }
        res.status(201).json({
            mensaje: 'Cliente registrado con éxito en MySQL 🚀',
            clienteId: result.insertId
        });
    });
});

// ==========================================
// RUTAS ADICIONALES DE TABLAS EN CLEVER CLOUD
// ==========================================
app.get('/api/servicios', (req, res) => {
    db.query('SELECT * FROM servicios ORDER BY id ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/operarios', (req, res) => {
    db.query('SELECT * FROM operarios ORDER BY id ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/citas', (req, res) => {
    db.query('SELECT * FROM citas ORDER BY fecha ASC, hora_inicio ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/mantenciones', (req, res) => {
    db.query('SELECT * FROM mantenciones ORDER BY fecha_proxima_mantencion ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==========================================
// RUTA PARA ELIMINAR UN CLIENTE POR ID
// ==========================================
app.delete('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const promisePool = db.promise();

    try {
        await promisePool.query('DELETE FROM citas WHERE cliente_id = ?', [id]);
        await promisePool.query('DELETE FROM mantenciones WHERE cliente_id = ?', [id]);
        const [result] = await promisePool.query('DELETE FROM clientes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: 'Cliente eliminado correctamente'
        });
    } catch (err) {
        console.error('Error al eliminar el cliente:', err.message);
        res.status(500).json({ error: 'Error al eliminar el cliente de la base de datos' });
    }
});

// ==========================================
// RUTA PARA ACTUALIZAR UN CLIENTE POR ID
// ==========================================
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        email,
        rut,
        telefono,
        direccion,
        region,
        comuna,
        fecha_cita,
        fechaCita,
        hora_cita,
        horaCita,
        servicio
    } = req.body;

    const fechaCitaFinal = fecha_cita !== undefined ? fecha_cita : fechaCita;
    const horaCitaFinal = hora_cita !== undefined ? hora_cita : horaCita;

    const query = `
        UPDATE clientes 
        SET nombre = ?, email = ?, rut = ?, telefono = ?, direccion = ?, region = ?, comuna = ?, fecha_cita = ?, hora_cita = ?, servicio = ?
        WHERE id = ?
    `;

    const values = [
        nombre,
        email || '',
        rut,
        telefono || '',
        direccion,
        region || 'Región Metropolitana de Santiago',
        comuna,
        fechaCitaFinal || null,
        horaCitaFinal || null,
        servicio || null,
        id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al actualizar el cliente:', err.message);
            return res.status(500).json({ error: 'Error al actualizar el cliente en la base de datos' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.status(200).json({
            success: true,
            message: 'Cliente actualizado correctamente'
        });
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
