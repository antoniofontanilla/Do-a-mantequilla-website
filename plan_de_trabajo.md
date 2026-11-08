# Cruce de Historias de Usuario, Avances de Hoy y Plan de Trabajo — Doña Mantequilla

**Última actualización:** 08 de noviembre de 2026  
**Documento base:** `Historias_usuario.docx` (Épica I, Épica II, Historia Técnica, Criterios No Funcionales y Valor Agregado con IA)  
**Base de Datos Activa:** **Clever Cloud MySQL** (`bvatb8utjr2j7klctdq3-mysql.services.clever-cloud.com:3306` con SSL activo)

---

## 1. Resumen de Procesos Realizados Hoy (08-11-2026)

1. **Migración y Auto-Inicialización en Clever Cloud MySQL (`dona-mantequilla-backend`)**:
   - Configuración de `.env` y pool de conexiones con soporte **SSL** (`rejectUnauthorized: false`) y control de concurrencia (`connectionLimit: 3`) en `index.js`.
   - Creación de `services/dbAutoInitService.js` que verifica y crea automáticamente al arrancar el servidor las 7 tablas del sistema (`clientes`, `servicios`, `operarios`, `citas`, `mantenciones`, `auditoria_cambios` y `consentimientos_ley19628`) e inserta sus filas iniciales (9 clientes incluyendo a `antonio diaz`, 9 servicios, 3 operarios, 9 citas y 4 mantenciones).
2. **Cierre de Épica I en Frontend y Backend (HU 1 a HU 12)**:
   - Sincronización de todas las vistas con los 9 clientes reales de la base de datos y paginación ampliada (`pageSize: 15`) para visualizar toda la nómina sin recortes.
   - Implementación completa de **HU 5** (Programación Inteligente con Top 3 mejores fechas/bloques), **HU 6** (Asignación Automática de Operarios por 6 criterios), **HU 7** (Optimización de Ruta en Tiempo Real partiendo desde la ubicación GPS actual del operario en terreno), **HU 9** (Agenda Visual por Lista, Día, Semana y Mes con filtros por Cliente, Operario, Estado y Fecha), **HU 10** (Los 9 Estados del Servicio con flujo interactivo y reprogramación), **HU 11** (Recordatorios Automáticos 24h antes 100% internos y automatizados por WhatsApp, Correo y SMS) y **HU 12** (Dashboard General con los 9 KPIs operativos).
3. **Implementación de Historia Técnica, Criterios No Funcionales y Valor Agregado con IA**:
   - Creación de `services/integracionesService.js` y `src/services/integracionesTecnicasService.ts` (Google Maps API, Google Distance Matrix API, WhatsApp Business Cloud API, OpenAI API, Correo Electrónico y Google Calendar / Microsoft Outlook con formato estándar `.ics` RFC 5545).
   - Creación de `services/seguridadYCumplimientoService.js` e `index.css` (Responsive PC/Tablet/Celular, SLA `< 2 segundos`, Disponibilidad `99,9%`, Base de datos segura con `AES-256-CBC`, Respaldo automático en `/backups`, Control de acceso por perfiles RBAC, Auditoría automática de cambios en MySQL y Cumplimiento de la **Ley 19.628** en Chile).
   - Creación de `services/motorPlanificacionIAService.js` (`POST /api/ia/planificar-solicitud`) como motor unificado de planificación inteligente con IA.

---

## 2. Estado Actual de Todas las Historias de Usuario (`Historias_usuario.docx`)

### Épica I: Gestión Inteligente de Programación de Servicios

| HU | Nombre | Estado Actual | Archivos Principales | Detalle de lo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **HU 1** | **Registro de Clientes** | ✅ **LISTA (100%)** | `ClientesPage.tsx`, `validators.ts`, `index.js`, `dbAutoInitService.js` | Registro completo (Nombre, RUT, Teléfono, Correo, Dirección, Comuna, Región, Servicio, Fecha/Hora), validación chilena de RUT (Módulo 11), prevención de duplicados y persistencia en **Clever Cloud MySQL** con los 9 clientes activos visibles en una sola página. |
| **HU 2** | **Validación Inteligente de Dirección** | ✅ **LISTA (100%)** | `ClientesPage.tsx`, `mapsService.ts`, `integracionesService.js` | Validación de calle + numeración, autocompletado de direcciones, alerta cuando una dirección no es válida, visor Google Maps y adaptador backend para Google Maps Geocoding API. |
| **HU 3** | **Georreferenciación del Cliente** | ✅ **LISTA (100%)** | `ClientesPage.tsx`, `mapsService.ts` | Coordenadas exactas (`latitud`, `longitud`), marcador en mapa, validación de comuna/región, cálculo de distancia en km y tiempo estimado de traslado desde la instalación base en Lo Barnechea. |
| **HU 4** | **Catálogo de Servicios** | ✅ **LISTA (100%)** | `ServiciosPage.tsx`, `serviciosData.ts`, `dbAutoInitService.js` | Los 9 servicios oficiales (*Sofás, Sillones, Sillas, Colchones, Alfombras, Ventanas, Ventanales, Aseo profundo, Servicio combinado*) con tiempos estimados configurables, soporte de cantidad/observaciones y tabla `servicios` creada y sembrada en **Clever Cloud MySQL** (`GET /api/servicios`). |
| **HU 5** | **Programación Inteligente** | ✅ **LISTA (100%)** | `ModalProgramacionInteligente.tsx`, `GestionCitas.tsx`, `App.tsx` | Evalúa los 5 criterios (*Agenda disponible, Duración del servicio, Horario del cliente, Tiempo de traslado, Capacidad diaria*) y propone/preselecciona automáticamente las 3 mejores fechas y bloques horarios al agendar. |
| **HU 6** | **Asignación Automática de Operarios** | ✅ **LISTA (100%)** | `ModalProgramacionInteligente.tsx`, `mockOperarios.ts`, `operario.ts`, `dbAutoInitService.js` | Algoritmo `evaluarOperariosParaCita` que evalúa los 6 criterios (*Cercanía, Disponibilidad, Especialidad, Carga laboral, Jornada, Zona de cobertura*), preselecciona al mejor operario, muestra columna `"Operario Asignado (HU 6)"` en la agenda y persiste la tabla `operarios` en **Clever Cloud MySQL**. |
| **HU 7** | **Optimización de Ruta (En Tiempo Real)** | ✅ **LISTA (100%)** | `RutasPage.tsx`, `mapsService.ts`, `App.tsx` | Conectada en `/rutas`. Calcula la mejor ruta diaria partiendo **en tiempo real desde la ubicación GPS actual donde se encuentra el operario** (`navigator.geolocation` + telemetría en terreno por operario), encadenando tramo a tramo cada visita desde el cliente anterior, con cálculo de tráfico, distancia, tiempo, ahorro de combustible y mapa en vivo. |
| **HU 8** | **IA para Optimización** | 🟡 **AVANZADA (85%)** | `iaOptimizationService.ts`, `PanelSugerenciasIA.tsx`, `motorPlanificacionIAService.js` | **Implementado**: Motor que detecta y sugiere reordenar visitas, eliminar tiempos muertos/traslados extensos, agrupar clientes cercanos por comuna, asignar/cambiar operarios y prevenir sobrecarga.<br>**Por revisar con el usuario**: Confirmar si se desea algún ajuste adicional en la pestaña `/sugerencias` al aplicar sugerencias sobre las citas de Clever Cloud. |
| **HU 9** | **Agenda Visual** | ✅ **LISTA (100%)** | `GestionCitas.tsx` | Vistas interactivas por **Lista**, **Día**, **Semana** (tablero Lunes a Domingo) y **Mes** (`<Calendar />`), con navegación de fechas y filtros combinados por **Cliente**, **Operario**, **Estado** y **Fecha**. |
| **HU 10** | **Estados del Servicio** | ✅ **LISTA (100%)** | `GestionCitas.tsx`, `cita.ts` | Los 9 estados oficiales (*Cotización, Pendiente, Confirmado, Programado, En Ruta, En Servicio, Finalizado, Reprogramado, Cancelado*) con tablero superior de conteo y filtro rápido, barra de progreso del ciclo de vida, avance rápido de etapa y modal de reprogramación de fecha/hora. |
| **HU 11** | **Recordatorios Automáticos (24h antes)** | ✅ **LISTA (100%)** | `recordatoriosService.ts`, `index.js`, `integracionesService.js` | Implementación **100% interna y automatizada en segundo plano** (sin botones manuales en la UI): al estar un servicio `Programado` dentro de las 24 horas previas, despacha automáticamente el recordatorio por **WhatsApp Business API**, **Correo** y **SMS**. |
| **HU 12** | **Dashboard General** | ✅ **LISTA (100%)** | `DashboardPage.tsx`, `App.tsx` | Conectado en `/`. Muestra en tiempo real los 9 indicadores requeridos: *Servicios por día, Servicios por comuna, Facturación, Operarios disponibles, Kilómetros recorridos, Tiempo promedio, Cancelaciones, Clientes nuevos y Clientes frecuentes*. |
| **HU 13** | **IA Predictiva** | 🟡 **AVANZADA (85%)** | `PanelSugerenciasIA.tsx` | **Implementado**: Pestaña *"IA Predictiva & Demanda (HU 13)"* que analiza clientes frecuentes, estacionalidad, servicios más vendidos, sectores con mayor demanda y horarios más solicitados, recomendando mejor horario, mejor operario, mejor ruta y promociones.<br>**Por revisar con el usuario**: Validar visualización final en `/sugerencias` conectada a los datos de Clever Cloud. |

---

### Historia Técnica, Criterios No Funcionales y Valor Agregado con IA

| Bloque | Requerimiento | Estado Actual | Archivos Principales | Detalle de Implementación Interna |
| :--- | :--- | :--- | :--- | :--- |
| **Historia Técnica** | **Integraciones Externas** (Google Maps, Distance Matrix, WhatsApp Business API, OpenAI, Correo, Google Calendar / Outlook) | ✅ **LISTA (100%)** | `integracionesService.js`, `integracionesTecnicasService.ts`, `index.js` | Clientes HTTPS nativos con timeout `< 1800ms`, generador `.ics` RFC 5545 para Google Calendar y Microsoft Outlook, y motores locales de respaldo automático. |
| **Criterios No Funcionales** | **Responsive, SLA < 2s, Disponibilidad 99,9%, BD Segura, Respaldo Automático, RBAC, Auditoría y Ley 19.628** | ✅ **LISTA (100%)** | `seguridadYCumplimientoService.js`, `index.js`, `index.css` | Pool MySQL SSL en Clever Cloud, medición `X-Response-Time-Ms < 2000ms`, caché en memoria, snapshots automáticos verificados con `SHA-256` en `/backups`, RBAC (`ADMIN`, `COORDINADOR`, `OPERARIO`, `CLIENTE`), tabla `auditoria_cambios` y protección de datos personales según **Ley 19.628 (Chile)**. |
| **Valor Agregado con IA** | **Motor Inteligente de Planificación** | ✅ **LISTA (100%)** | `motorPlanificacionIAService.js`, `ModalProgramacionInteligente.tsx` | Endpoint `POST /api/ia/planificar-solicitud` que cruza disponibilidad, ubicación del cliente, tráfico estimado, duración del trabajo, carga de cada operario y visitas programadas, permitiendo al coordinador aceptar o ajustar manualmente la propuesta. |

---

### Épica II: Gestión de Mantenciones Programadas (Lo que Falta por Implementar)

> **Nota**: La tabla `mantenciones` en **Clever Cloud MySQL** (`GET /api/mantenciones`) y los tipos base en `src/types/mantencion.ts` ya están creados y sembrados. Falta implementar e integrar la experiencia completa de las **HU 14 a HU 19** en el frontend (`GestionCitas.tsx` y `MantencionesPage.tsx` en la ruta `/mantenciones` de `App.tsx`).

| HU | Nombre | Estado Actual | Qué Falta Implementar Paso a Paso |
| :--- | :--- | :--- | :--- |
| **Regla Post-Finalizado + HU 14** | **Programación de Mantenciones** | ⏳ **PENDIENTE** | 1. En `GestionCitas.tsx`, cuando un servicio cambie a estado **`Finalizado`**, desplegar automáticamente la consulta: ***"¿Desea programar una próxima mantención?"*** con las 3 opciones:<br>   - **Sí** → Abrir selector de fecha en calendario y frecuencia (*Semanal, Quincenal, Mensual, Cada 2 meses, Trimestral, Semestral, Anual, Personalizada*).<br>   - **No** → Cerrar y registrar como servicio único.<br>   - **Recordar más adelante** → Programar recordatorio automático en **30 días**.<br>2. Guardar la mantención en **Clever Cloud MySQL** (`POST /api/mantenciones`). |
| **HU 15** | **Agenda Automática de Mantenciones** | ⏳ **PENDIENTE** | 1. Generar automáticamente en la agenda las mantenciones futuras según la frecuencia elegida por el cliente.<br>2. Verificar disponibilidad antes de confirmar cada ocurrencia; si existe choque horario, marcar conflicto y notificar al administrador.<br>3. Permitir modificar una mantención individual sin alterar las siguientes de la serie. |
| **HU 16** | **Recordatorio Automático de Mantención** | ⏳ **PENDIENTE** | 1. Envío automático de recordatorio de mantención por **WhatsApp** y **Correo electrónico** incluyendo: *Fecha, Hora, Tipo de servicio y Nombre del técnico*.<br>2. Permitir registrar la respuesta del cliente con las 3 acciones: **Confirmar**, **Reagendar** o **Cancelar**. |
| **HU 17** | **IA para Mantenciones + "Cliente Inteligente" (Índice de Mantención del Hogar)** | ⏳ **PENDIENTE** | 1. Implementar el motor de IA para Mantenciones que analiza: *Fecha de última limpieza, Tipo de servicio, Cantidad de integrantes del hogar, Presencia de mascotas, Presencia de niños, Tipo de tapiz o alfombra, Historial del cliente, Frecuencia anterior y Temporada del año*.<br>2. Calcular el **Índice de Mantención del Hogar** y generar alertas inteligentes automáticas (ej.: *"Han transcurrido 6 meses desde la última limpieza del colchón..."* o *"Cliente con tres mascotas. Se recomienda limpieza de sofá cada tres meses"*). |
| **HU 18** | **Historial de Mantenciones** | ⏳ **PENDIENTE** | Construir el módulo/tabla de **Historial de Mantenciones** por cliente mostrando los 9 datos exigidos:<br>1. Fecha<br>2. Servicio realizado<br>3. Operario<br>4. Fotografías antes y después<br>5. Observaciones<br>6. Productos utilizados<br>7. Tiempo empleado<br>8. Valor cobrado<br>9. Próxima mantención |
| **HU 19** | **Dashboard de Mantenciones** | ⏳ **PENDIENTE** | Construir el **Dashboard de Mantenciones** en la vista `/mantenciones` mostrando los 7 indicadores requeridos:<br>1. Mantenciones de hoy<br>2. Esta semana<br>3. Este mes<br>4. Próximas a vencer<br>5. Pendientes de confirmar<br>6. Reagendadas<br>7. Canceladas |

---

## 3. Próximos Pasos (Orden HU por HU)

1. **Revisar / cerrar HU 8 y HU 13** (si deseas algún ajuste en la vista `IA Sugerencias` `/sugerencias`, o darlas por aprobadas).
2. **Implementar HU 14 (+ Regla Post-Finalizado)**: Flujo automático al marcar un servicio como `Finalizado` (*Sí / No / Recordar en 30 días*) + programación por frecuencias conectada a Clever Cloud MySQL.
3. **Implementar HU 15**: Generación automática de mantenciones recurrentes, detección de conflictos con notificación al administrador y edición unitaria.
4. **Implementar HU 16**: Recordatorios automáticos de mantención (WhatsApp y Correo con Fecha, Hora, Servicio y Técnico) + acciones de *Confirmar, Reagendar y Cancelar*.
5. **Implementar HU 17**: IA para Mantenciones + **Índice de Mantención del Hogar ("Cliente Inteligente")**.
6. **Implementar HU 18**: Historial de Mantenciones (con fotografías antes/después, productos utilizados, tiempo, valor cobrado y próxima mantención).
7. **Implementar HU 19**: Dashboard de Mantenciones completo en la ruta `/mantenciones`.
