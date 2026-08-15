# Documento de Requisitos del Producto (PRD)

## Declaración del Problema

En la operación manual o descentralizada de negocios minoristas o mayoristas, surgen problemas críticos:
- **Descontrol de Stock:** Hay pérdidas continuas por falta de visibilidad del inventario real, intentando vender productos que ya no tienen stock físico y dificultades para reponer a tiempo.
- **Falta de Trazabilidad Financiera:** Es extremadamente difícil rastrear con precisión cuánto dinero ingresó, cuánto salió y quién fue el responsable de cada operación (faltantes en la caja).
- **Procesos Ineficientes en Ventas:** Los tiempos de atención al cliente son altos debido al cálculo manual de totales, aplicación de descuentos, gestión de métodos de pago y emisión de comprobantes.
- **Inseguridad:** Empleados que acceden a reportes financieros confidenciales o modifican el stock de manera arbitraria sin dejar un rastro de auditoría.

## Solución

Un sistema integral de **Gestión Comercial y de Inventarios** compuesto por una **Aplicación Frontend** moderna e intuitiva y un **Backend (API REST)** centralizado. 
- **Frontend:** Proporcionará una interfaz gráfica (SPA) enfocada en la experiencia del usuario. Incluirá un módulo de Punto de Venta (POS) rápido para cajeros, paneles de administración visuales para gestionar el catálogo y visualización de reportes para los gerentes.
- **Backend:** Actuará como el motor de reglas de negocio, construido en Java con Spring Boot. Automatizará el cálculo de inventario (cada venta descuenta stock y cada compra lo incrementa automáticamente), asegurará la operación financiera mediante un control estricto de "Sesiones de Caja" por operador, y centralizará toda la información en una base de datos PostgreSQL. Todo protegido bajo un esquema robusto de seguridad basado en roles y JWT mediante cookies HTTP-Only.

## Historias de Usuario

1. Como **Administrador**, quiero crear cuentas de usuario para empleados, para poder controlar quién tiene acceso al sistema.
2. Como **Administrador**, quiero asignar roles específicos (ej., ADMIN, VENDEDOR), para restringir el acceso a reportes financieros sensibles y funciones administrativas en el Frontend.
3. Como **Vendedor**, quiero iniciar sesión ingresando mi email y contraseña en una pantalla de login, para que el sistema me autentique de forma segura y me permita comenzar mi turno.
4. Como **Encargado de Inventario**, quiero tener una pantalla para crear y administrar categorías de productos, para poder organizar lógicamente el catálogo.
5. Como **Encargado de Inventario**, quiero registrar nuevos productos mediante un formulario (con nombre, código de barras y precio), para que estén disponibles para la venta.
6. Como **Encargado de Inventario**, quiero registrar proveedores, para mantener un directorio de quién provee la mercadería del negocio.
7. Como **Encargado de Inventario**, quiero poder vincular productos específicos a sus respectivos proveedores en la interfaz, para saber exactamente a quién pedir cuando el stock sea bajo.
8. Como **Encargado de Inventario**, quiero ajustar manualmente los niveles de stock (indicando el motivo: daño, merma), para que el inventario digital coincida con la realidad física.
9. Como **Comprador**, quiero registrar una orden de compra agregando múltiples ítems en una tabla dinámica, para que el sistema incremente automáticamente el stock al confirmar la llegada de la mercadería.
10. Como **Comprador**, quiero registrar pagos asociados a una compra, para que el negocio pueda hacer un seguimiento preciso de las deudas y egresos hacia los proveedores.
11. Como **Vendedor**, quiero abrir una sesión de caja (`SesionCaja`) desde el Frontend indicando un monto inicial (cambio), para empezar a registrar todas mis transacciones financieras durante el turno.
12. Como **Vendedor**, quiero poder buscar y seleccionar a un cliente registrado (o consumidor final genérico) durante una venta, para que la transacción quede correctamente asociada.
13. Como **Vendedor**, quiero agregar productos a la venta actual escaneando un código de barras o buscando por nombre en el Punto de Venta (POS), para que el sistema calcule el subtotal y total automáticamente en pantalla.
14. Como **Vendedor**, quiero que la interfaz me alerte visualmente y bloquee la acción si intento agregar un producto sin stock suficiente, para evitar vender artículos que no podemos entregar.
15. Como **Vendedor**, quiero poder dividir el pago de una venta en múltiples métodos de pago (ej., efectivo y tarjeta de débito), para ofrecer mayor flexibilidad a los clientes.
16. Como **Vendedor**, quiero que al confirmar el pago de la venta, el sistema descuente el stock instantáneamente en la base de datos, para que el inventario se actualice en tiempo real.
17. Como **Vendedor**, quiero generar e imprimir un ticket PDF al finalizar la venta, para poder entregarle un comprobante formal al cliente.
18. Como **Vendedor**, quiero cerrar mi sesión de caja al terminar mi turno declarando el efectivo físico contado en un formulario, para que el sistema calcule automáticamente cualquier sobrante o faltante.
19. Como **Administrador**, quiero visualizar un panel de control (Dashboard) con gráficos y reportes filtrables por fecha, vendedor y método de pago, para analizar la salud financiera y el rendimiento del negocio.

## Decisiones de Implementación

### Frontend (Interfaz de Usuario)
- **Framework Principal:** Aplicación de Página Única (SPA) construida con React.js (o framework moderno similar como Next.js/Vue).
- **Diseño y UI:** Uso de TailwindCSS o Material UI para lograr componentes responsivos, accesibles y de carga rápida.
- **Interacciones Específicas:**
  - El Punto de Venta (POS) será optimizado para uso rápido con teclado y lectores de códigos de barras.
  - El manejo de estado global (ej., carrito de ventas actual, sesión del usuario) se manejará mediante Context API o Redux/Zustand.
- **Comunicación con Backend:** Cliente HTTP (Axios o Fetch) configurado para enviar credenciales (`withCredentials: true`), permitiendo el envío seguro de la cookie HTTP-Only que contiene el JWT.

### Backend (API REST)
- **Arquitectura:** Monolítica basada en diseño por capas (Controller -> Service -> Repository).
- **Tecnología Core:** Java 21 y Spring Boot 3.
- **Base de Datos:** PostgreSQL para persistencia de datos relacionales.
- **ORM:** Spring Data JPA / Hibernate.
- **Seguridad y Autenticación:** Spring Security con JWT (JSON Web Tokens). Para prevenir vulnerabilidades XSS en el cliente frontend, los tokens se envían y manejan estrictamente a través de `Cookies HTTP-Only`.
- **Generación de Reportes:** Integración con `iText7` para generar documentos PDF dinámicamente.
- **Modelos de Datos Principales:**
  - **Usuarios/Roles:** `Usuario`, `Rol`
  - **Catálogo:** `Producto`, `Categoria`, `Proveedor`, `ProductoProveedor`
  - **Inventario:** `Stock` (fuertemente acoplado a `Producto`)
  - **Compras:** `Compra`, `DetalleCompra`, `Pago`
  - **Ventas y Caja:** `Venta`, `DetalleVenta`, `Cliente`, `MetodoPago`, `Cobro`, `SesionCaja`

## Decisiones de Testing

- **Filosofía de Testing:** Las pruebas deben verificar comportamientos externos y reglas de negocio reales.
- **Frontend:**
  - **Componentes:** Uso de Jest y React Testing Library para probar que los componentes clave (como el carrito del POS o los modales de cierre de caja) se rendericen y respondan correctamente a eventos del usuario.
  - **E2E (End-to-End):** Uso de Cypress o Playwright para simular el flujo crítico completo (Login -> Abrir Caja -> Hacer Venta -> Cerrar Caja).
- **Backend:**
  - **Seguridad:** Asegurar que los endpoints rechacen peticiones no autorizadas y que las credenciales válidas retornen la cookie HTTP-Only correctamente.
  - **Flujo de Ventas:** Verificar mediante `MockMvc` que confirmar una venta crea los registros en la base de datos, descuenta el stock y la asocia a la `SesionCaja` correcta.
  - **Flujo de Caja:** Probar la precisión matemática de los cierres de caja (efectivo declarado vs. teórico) y el registro de descuadres.
  - Herramientas: `Spring Boot Starter Test`, `JUnit 5`, `Mockito`.

## Fuera de Alcance (Out of Scope)

- **Devoluciones y Notas de Crédito:** Lógica explícita para devoluciones de clientes, reversión de ventas, devolución de dinero a la caja y reingreso de ítems al stock.
- **Alertas de Stock Mínimo:** Notificaciones automatizadas (emails o alertas en tiempo real en la UI) cuando un producto llega a su punto de reorden.
- **Soporte Multisesión/Sucursales:** El esquema actual está diseñado para una única entidad comercial matriz y no segrega datos lógicamente por ubicaciones físicas o tiendas distintas.
- **Auditoría Avanzada de Campos:** Rastreo granular de qué usuario específico cambió qué campo exacto y en qué momento (ej. usando Hibernate Envers para un historial detallado de cambios de precios).

## Notas Adicionales

Este documento representa la versión base y fundacional del sistema completo (Frontend y Backend). Cualquier iteración futura o adición de funcionalidades (como las listadas en Fuera de Alcance) deberá ser planificada actualizando este documento o creando especificaciones suplementarias. Las decisiones de seguridad tomadas, específicamente la separación del token JWT del LocalStorage del Frontend y su uso mediante Cookies HTTP-Only, son directrices imperativas y no deben ser revertidas sin una justificación de seguridad exhaustiva.
