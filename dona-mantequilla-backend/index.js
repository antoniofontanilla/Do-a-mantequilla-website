const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MySQL (XAMPP) con respaldos por defecto
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'dona_mantequilla_db'
});

// Probar conexión a la base de datos
db.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos de XAMPP:', err);
        return;
    }
    console.log('✅ Conectado exitosamente a la base de datos MySQL (dona_mantequilla_db)');
});

// ==========================================
// RUTA PARA OBTENER TODOS LOS CLIENTES
// ==========================================
app.get('/api/clientes', (req, res) => {
    const query = 'SELECT * FROM clientes ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los clientes:', err);
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
        tiempo_traslado_min
    } = req.body;

    const query = `
        INSERT INTO clientes 
        (nombre, email, rut, telefono, direccion, region, comuna, latitud, longitud, distancia_km, tiempo_traslado_min) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        tiempo_traslado_min || null
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al guardar el cliente:', err);
            return res.status(500).json({ error: 'Error al registrar el cliente en la base de datos' });
        }
        res.status(201).json({
            mensaje: 'Cliente registrado con éxito en MySQL 🚀',
            clienteId: result.insertId
        });
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});