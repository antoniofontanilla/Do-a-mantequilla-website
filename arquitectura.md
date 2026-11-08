# Análisis Exhaustivo de Arquitectura y Estado del Proyecto — Doña Mantequilla

Este documento contiene el análisis completo de la arquitectura, stack tecnológico, estructura de datos, estado de desarrollo y reglas de codificación del proyecto **Doña Mantequilla**, diseñado para servir como contexto de referencia en futuras sesiones de desarrollo.

---

## 1. Estructura General y Stack Tecnológico

El proyecto está organizado en un esquema **monorepo ligero** con tres carpetas principales en la raíz (`d:\Fonta Analista\Dona_mantequilla`):
- **`dona-mantequilla-backend/`**: Servidor API REST en Node.js.
- **`dona-mantequilla-front/`**: Aplicación SPA en React + TypeScript construida con Vite.
- **`avances/`**: Documentación funcional del proyecto en formato Word (`.docx`) con historias de usuario (`UH listas.docx`, `Estructura del proyecto.docx`, `Software Gestión de Clientes.docx`, `puntos extra.docx`).

### Tecnologías y Librerías Clave
- **Backend (`dona-mantequilla-backend/package.json`)**:
  - **Runtime & Framework**: Node.js (CommonJS) con **Express `^5.3.0`**.
  - **Base de Datos**: **MySQL** (orientado a XAMPP local) mediante el driver **`mysql2` (`^3.24.6`)**.
  - **Utilidades**: **`cors` (`^2.8.6`)** para peticiones cross-origin y **`dotenv` (`^18.0.9`)** para variables de entorno.
  - *Nota*: No cuenta con scripts definidos en `package.json` (`start` o `dev` con nodemon).

- **Frontend (`dona-mantequilla-front/package.json`)**:
  - **Core**: **React `^18.3.1`**, **TypeScript `~5.7.2`**, **Vite `^6.2.0`**.
  - **UI Framework**: **Ant Design (`antd` `^5.24.2`)** y **`@ant-design/icons` (`^5.6.1`)** (incluye `dayjs` como dependencia transitiva de Ant Design para manejo de fechas).
  - **Despliegue**: Incluye archivo `public/_redirects` pensado para hosting estático (ej. Netlify/Render).

### Comunicación Cliente-Servidor
- La comunicación se realiza mediante llamadas HTTP directas con la API nativa `fetch` desde el frontend hacia `http://localhost:4000/api/...` (URL *hardcodeada* en `src/pages/clientes/ClientesPage.tsx`).
- El formato de intercambio es **JSON** habilitado por `express.json()` y `cors()` abierto a cualquier origen.

---

## 2. Backend

Toda la lógica del servidor reside actualmente en un único archivo monolítico: `dona-mantequilla-backend/index.js`.

### Configuración y Base de Datos
- **Conexión**: Usa `mysql.createConnection()` (conexión única, no pool) configurada mediante `dona-mantequilla-backend/.env` (`PORT=4000`, `DB_HOST=localhost`, `DB_USER=root`, `DB_PASSWORD=`, `DB_NAME=dona_mantequilla_db`).
- **Esquema inferido (`clientes`)**: No hay migraciones ni archivo `.sql` en el repositorio, pero por las consultas SQL en `index.js` y el mapeo en `ClientesPage.tsx`, la tabla `clientes` en MySQL tiene las columnas:
  - `id` (PK, Auto Increment)
  - `nombre`, `email`, `rut`, `telefono`, `direccion`, `region`, `comuna` (VARCHAR/TEXT)
  - `latitud`, `longitud`, `distancia_km` (DECIMAL/FLOAT, anulables)
  - `tiempo_traslado_min` (INT, anulable)
  - *(En el frontend también se leen `fecha_cita`, `hora_cita` y `servicio` al hacer `GET`, pero no están incluidos en el `INSERT` del `POST`)*.

### Middlewares y Endpoints Activos
- **Middlewares**: `cors()` global y `express.json()`. No hay middlewares de autenticación, validación de esquemas ni manejo centralizado de errores.
- **Rutas activas**:
  1. `GET /api/clientes` (`index.js` L32-L41): Ejecuta `SELECT * FROM clientes ORDER BY id DESC` y retorna el arreglo completo.
  2. `POST /api/clientes` (`index.js` L46-L91): Inserta un nuevo cliente usando consultas parametrizadas (`?`) y retorna `{ mensaje, clienteId: result.insertId }`.

---

## 3. Frontend

### Flujo de Navegación y Layout
- **Enrutamiento manual por estado**: No se utiliza `react-router-dom`. En `src/App.tsx` se maneja el estado `currentRoute` (iniciado por defecto en `"/sugerencias"`) con un `switch` que renderiza la vista activa dentro de `MainLayout`.
- **Layout Principal (`src/components/layout/MainLayout.tsx`)**: Menú lateral colapsable (`Sider` de Ant Design) con 7 secciones:
  1. `/` — Dashboard *(placeholder)*
  2. `/clientes` — `ClientesPage` (`src/pages/clientes/ClientesPage.tsx`)
  3. `/servicios` — `ServiciosPage` (`src/pages/servicios/ServiciosPage.tsx`)
  4. `/agenda` — `GestionCitas` (`src/components/GestionCitas.tsx`)
  5. `/rutas` — Rutas e IA *(placeholder)*
  6. `/mantenciones` — Mantenciones *(placeholder)*
  7. `/sugerencias` — `PanelSugerenciasIA` (`src/components/PanelSugerenciasIA.tsx`)

### Vistas Principales y Componentes
1. **Gestión de Clientes (`src/pages/clientes/ClientesPage.tsx`)**:
   - Única vista conectada al backend MySQL (`GET` y `POST /api/clientes`).
   - Incluye tabla con datos del cliente, cita asociada, distancia/tiempo y modal con `iframe` de Google Maps (`getMapUrl`).
   - Modal de creación con `Form.useForm()`, selector en cascada Región -> Comuna, autocompletado simulado de dirección y selectores de fecha/hora con restricción de jornada laboral (`09:00` a `18:00` en `disabledDateTime`).
2. **Catálogo de Servicios (`src/pages/servicios/ServiciosPage.tsx`)**:
   - Gestiona en memoria local los 9 servicios base definidos en `SERVICIOS_BASE` (`src/utils/serviciosData.ts`: Sofás, Sillones, Sillas, Colchones, Alfombras, Ventanas, Ventanales, Aseo profundo, Servicio combinado).
   - Permite editar descripción, tiempo estimado en minutos y estado activo/inactivo (el nombre está bloqueado por requerimiento).
3. **Agenda y Gestión de Citas (`src/components/GestionCitas.tsx` y `src/components/ModalProgramacionInteligente.tsx`)**:
   - Dashboard de métricas por estado de cita, filtros por texto/estado/fecha, cambio rápido de estado en tabla y eliminación en memoria.
   - Abre el modal de programación inteligente (cálculo automático de duración de servicios + traslado desde base + hora estimada de término) y un `Drawer` lateral con `PanelSugerenciasIA`.
4. **Motor y Panel de Sugerencias IA (`src/components/PanelSugerenciasIA.tsx` y `src/services/iaOptimizationService.ts`)**:
   - Motor heurístico basado en reglas (`IaOptimizacionService.analizarCitas`) que evalúa 8 criterios:
     - Citas fuera de horario hábil (`esHorarioValido` en `src/utils/horariosConfig.ts`).
     - Retención de clientes registrados sin cita activa.
     - Citas sin operario asignado (sugiere operario por `comunaBase`).
     - Balanceo de carga entre operarios (alerta si hay diferencia >= 3 citas).
     - Agrupación de rutas por comuna y fecha (>= 2 citas el mismo día en la misma comuna).
     - Tiempos de traslado extensos (>= 15 min).
     - Bloques de servicio sobrecargados (>= 180 min totales).
     - Ventanas estrechas / colisiones de horario entre citas consecutivas del mismo día.

---

## 4. Estado del Desarrollo e Inconsistencias Detectadas

### Módulos Completados (a nivel funcional / prototipo)
- **Catálogo de Servicios (HU 4)**: Interfaz y edición local completas en `ServiciosPage.tsx`.
- **Motor de Reglas IA**: Lógica de negocio bien estructurada en `iaOptimizationService.ts` y visualización en `PanelSugerenciasIA.tsx`.
- **Cálculo Haversine de Distancia/Tiempo**: Implementado en `src/services/mapsService.ts`.
- **Integración Inicial Backend-Frontend en Clientes**: Lectura (`GET`) e inserción (`POST`) de clientes funcionando contra MySQL.

### Funcionalidades a Medio Implementar (Pendientes)
1. **Persistencia en Base de Datos incompleta**:
   - En `ClientesPage.tsx` (L234-L246), el formulario solicita `fechaCita`, `horaCita`, `servicio` y `observaciones`, pero **no se envían en el `POST`** a `/api/clientes` ni están en el `INSERT` de `index.js`. Al recargar la página, esos datos se pierden o quedan con valores por defecto (`S/F`, `S/H`).
   - Los módulos de **Servicios**, **Citas/Agenda** y **Operarios** aún funcionan 100% con datos mock en memoria (no tienen tablas ni endpoints en el backend).
2. **Acciones y Buscador sin conectar en `ClientesPage.tsx`**:
   - El `Input` de búsqueda (L422-L427) no tiene estado ni evento `onChange` asociado; no filtra la tabla.
   - Los botones **"Editar"** y **"Eliminar"** en la tabla de clientes (L381-L386) son visuales (sin `onClick` ni endpoints `PUT`/`DELETE`).
3. **Georreferenciación simulada al crear cliente**:
   - En `handleCreate` (`ClientesPage.tsx` L223-L224), las coordenadas están fijas en `const coords = { lat: -33.36, lng: -70.52 };`, por lo que todos los clientes nuevos se guardan con la misma distancia y tiempo de traslado (`1.1 km` / `8 min`).
4. **Validador de RUT creado pero no utilizado**:
   - El archivo `src/utils/validators.ts` implementa `validarRutChileno` (Módulo 11) y `formatearRut`, pero **no se importa en ningún componente** (el campo RUT en `ClientesPage.tsx` solo valida `required: true`).
5. **Props vacías en la ruta `/agenda`**:
   - En `src/App.tsx` (L31) se invoca `<GestionCitas clientes={[]} serviciosDisponibles={[]} />`. Al pasar arreglos vacíos, cuando el usuario abre el `ModalProgramacionInteligente`, los selectores de Clientes y Servicios aparecen vacíos.
6. **Vistas Placeholder**:
   - `/`, `/rutas` y `/mantenciones` en `src/App.tsx` (L16-L47) solo muestran un `<h2>` y `<p>`.

### Inconsistencias y Duplicidades Detectadas
- **Duplicación de interfaces `Cliente`**:
  - `src/types/cliente.ts` define `nombreCompleto`, `latitud`, `longitud`.
  - `ClientesPage.tsx` (L36-L52) redefine su propia interfaz local `Cliente` usando `nombre`, `lat`, `lng`.
- **Duplicación de tipos IA y Operarios Mock**:
  - `src/types/ia.ts` no se usa; `iaOptimizationService.ts` declara sus propios tipos `TipoSugerencia` y `SugerenciaIA`.
  - `MOCK_OPERARIOS` está definido tanto en `src/data/mockClientes.ts` como en `src/data/mockOperarios.ts` con datos distintos.
- **Discrepancia en Horarios Laborales**:
  - `ClientesPage.tsx` (L122-L123) define jornada de `09:00` a `18:00`.
  - `horariosConfig.ts` (L7-L15) define jornada de Lunes a Viernes de `08:00` a `19:00` y Sábados de `08:00` a `14:00`.

---

## 5. Árbol de Directorios y Reglas de Codificación (Agent Rules)

### Estructura de Directorios
```text
Dona_mantequilla/
├── arquitectura.md              # Este documento de contexto y arquitectura
├── avances/                        # Documentación funcional (.docx)
├── dona-mantequilla-backend/
│   ├── index.js                 # Punto de entrada API REST y conexión MySQL
│   ├── .env                     # Variables de entorno (no versionado)
│   └── package.json
└── dona-mantequilla-front/
    └── src/
        ├── components/          # Componentes de vistas y modales (GestionCitas, PanelSugerenciasIA, etc.)
        │   └── layout/          # MainLayout (Sider + Header + Content)
        ├── pages/               # Vistas principales (clientes/, servicios/)
        ├── services/            # Lógica de negocio (iaOptimizationService, mapsService)
        ├── types/               # Contratos TypeScript (cliente, cita, servicio, operario, ia)
        ├── utils/               # Validadores (RUT Módulo 11), horarios y catálogo base
        └── data/                # Datos mock de respaldo y pruebas
```

### Reglas de Codificación y Convenciones
1. **Tipado y Modelos de Datos (TypeScript)**:
   - **Fuente única de verdad**: Utilizar siempre las interfaces de `src/types/` (`Cliente`, `Cita`, `ServicioCatalogo`, `Operario`). Evitar redeclarar interfaces locales dentro de las páginas o componentes.
   - **Mapeo Backend ↔ Frontend**:
     - El backend en MySQL utiliza `snake_case` para columnas (`distancia_km`, `tiempo_traslado_min`, `fecha_cita`, `hora_cita`).
     - El frontend utiliza `camelCase` (`distanciaKm`, `tiempoTrasladoMinutos`, `fechaCita`, `horaCita`). Realizar la transformación en la capa de servicio/fetch.
2. **Reglas de Negocio**:
   - **Validación de RUT**: Todo formulario que solicite RUT chileno debe validar con `validarRutChileno` y formatear con `formatearRut` desde `src/utils/validators.ts`.
   - **Horarios de Atención**: Respetar la configuración centralizada en `src/utils/horariosConfig.ts` (Lunes a Viernes 08:00–19:00, Sábados 08:00–14:00, Domingos cerrado).
   - **Georreferenciación y Traslados**: La base operativa se ubica en Lo Barnechea (`COORDENADAS_BASE` en `src/services/mapsService.ts`). Todo cálculo de bloque horario de una cita debe sumar `duracionServiciosMinutos + tiempoTrasladoMinutos`.
3. **Buenas Prácticas de UI y Backend**:
   - **UI Consistente**: Usar componentes de Ant Design v5 (`Form`, `Table`, `Modal`, `Card`, `Tag`, `Alert`, `message`). Evitar librerías de estilos adicionales.
   - **Consultas SQL Seguras**: En el backend, usar exclusivamente consultas parametrizadas (`?`) con `mysql2` para prevenir inyección SQL y retornar códigos HTTP semánticos (`200`, `201`, `400`, `404`, `500`).
   - **Idioma**: Mantener nombres de variables de dominio, comentarios, mensajes de error y respuestas de la interfaz en **español**.
