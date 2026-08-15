# Product Requirements Document (PRD) - Backend Gestión de Inventario

> [!NOTE]
> Este documento detalla la visión, objetivos, alcance y especificaciones funcionales del sistema "Backend Gestión de Inventario". Sirve como fuente de verdad para el desarrollo actual y futuro del proyecto.

---

## 1. Introducción y Resumen del Proyecto
El proyecto es una **API REST (Backend)** construida en Java con Spring Boot, diseñada para ser el núcleo de un sistema integral de **Gestión Comercial y de Inventarios**. Su propósito es administrar todo el flujo de trabajo de un negocio minorista o mayorista: desde la recepción de mercadería (compras a proveedores), control de stock en tiempo real, hasta la salida de productos (ventas a clientes) y el control estricto de los flujos de dinero (sesiones de caja).

## 2. Problemas que Resuelve
En la operación manual o descentralizada de comercios, suelen surgir los siguientes problemas que este sistema viene a resolver:
- **Descontrol de Stock:** Pérdidas por falta de visibilidad del inventario real, venta de productos sin stock y dificultad para reponer a tiempo.
- **Falta de Trazabilidad Financiera:** Dificultad para rastrear exactamente cuánto dinero entró, cuánto salió y quién fue el responsable (solucionado mediante el control de Sesiones de Caja).
- **Procesos Lentos de Venta:** Tiempos elevados para calcular totales, aplicar descuentos, registrar métodos de pago y emitir tickets o comprobantes.
- **Inseguridad y Accesos Indebidos:** Empleados accediendo a reportes financieros confidenciales o modificando stock arbitrariamente.

## 3. Objetivos del Proyecto
- **Centralizar** la información de clientes, proveedores, productos y transacciones en una única base de datos robusta (PostgreSQL).
- **Automatizar** el cálculo de inventario: que cada venta descuente stock automáticamente y cada compra lo incremente.
- **Asegurar** la operación diaria mediante un control de "Caja" por operador (apertura, movimientos, cierre y registro de diferencias/faltantes).
- **Proveer APIs eficientes** para que múltiples clientes (por ejemplo, una aplicación web React/Angular, o una app móvil) puedan consumir los servicios de manera rápida y segura.
- **Generar Documentación y Reportes:** Creación de PDFs para tickets de venta y reportes de estado.

---

## 4. Arquitectura y Stack Tecnológico
> [!TIP]
> La arquitectura sigue un patrón de diseño monolítico basado en capas (Controlador -> Servicio -> Repositorio).

- **Lenguaje:** Java 21
- **Framework Core:** Spring Boot 3
- **Base de Datos:** PostgreSQL
- **ORM:** Hibernate / Spring Data JPA
- **Seguridad:** Spring Security con JWT (JSON Web Tokens). 
  - *Dato clave:* Los tokens se manejan mediante `Cookies HTTP-Only` para prevenir ataques XSS.
- **Generación de Reportes:** iText7 para creación de documentos PDF (Tickets y Reportes de Ventas).
- **Gestión de Migraciones / Data:** (Potencialmente manejado por la propiedad `spring.jpa.hibernate.ddl-auto` o scripts SQL).

---

## 5. Módulos del Sistema y Flujos de Trabajo (Cómo funciona)

### 5.1. Módulo de Autenticación y Seguridad (Usuarios y Roles)
- **Modelos:** `Usuario`, `Rol`.
- **Funcionamiento:** Todo el sistema está protegido. Un administrador debe crear a los empleados (`Usuarios`) y asignarles un `Rol` (ej. ADMIN, VENDEDOR). Para operar, el usuario realiza un POST a `/api/auth/login`. Si las credenciales (`email` y `contraseña`) son correctas, el backend inyecta una cookie segura con un JWT. A partir de ahí, todos los endpoints leen esta cookie para validar la identidad y los permisos del usuario.

### 5.2. Módulo de Catálogo (Productos, Categorías y Proveedores)
- **Modelos:** `Producto`, `Categoria`, `Proveedor`, `ProductoProveedor`.
- **Funcionamiento:** Permite mantener un directorio estructurado de todo lo que se comercializa. Los productos pertenecen a categorías para fácil filtrado y búsqueda. Además, existe una relación `ProductoProveedor` que permite rastrear a qué proveedores se les compra habitualmente un producto específico, facilitando el reabastecimiento.

### 5.3. Módulo de Gestión de Inventario (Stock)
- **Modelos:** `Stock` (relacionado íntimamente a `Producto`).
- **Funcionamiento:** Mantiene la cantidad física disponible. Posee mecanismos para actualizar inventarios por eventos directos (ajustes manuales por merma o rotura) y por eventos indirectos (ventas y compras). El stock no puede ser modificado sin dejar rastro de la transacción.

### 5.4. Módulo de Compras (Abastecimiento)
- **Modelos:** `Compra`, `DetalleCompra`, `Pago`.
- **Funcionamiento:** Cuando llega mercadería de un proveedor, se registra una `Compra`. Esta compra tiene múltiples `DetallesCompra` (ítems y cantidades).
  - Al confirmarse la compra, el sistema **incrementa automáticamente el stock** de los productos involucrados.
  - Genera un `Pago` asociado o registra una deuda con el proveedor si se acuerda pago diferido.

### 5.5. Módulo de Ventas (Punto de Venta)
- **Modelos:** `Venta`, `DetalleVenta`, `Cliente`, `MetodoPago`, `Cobro`.
- **Funcionamiento:** Es el núcleo transaccional. Un usuario inicia una transacción de venta.
  - Selecciona un `Cliente` (puede ser consumidor final genérico).
  - Agrega `Productos` a la venta, lo que genera registros de `DetalleVenta` (validando previamente si hay stock suficiente).
  - Selecciona uno o más `MetodoPago` (ej. Efectivo, Tarjeta de Débito, MercadoPago). Esto genera los registros de `Cobro`.
  - Al concretarse: el sistema **descuenta automáticamente el stock** y asocia el dinero cobrado a la sesión de caja activa del vendedor.
  - Permite generar un PDF descargable con el **Ticket de Venta**.

### 5.6. Módulo de Caja (Control Financiero Operativo)
- **Modelos:** `SesionCaja`.
- **Funcionamiento:** Impide el desorden financiero.
  - **Apertura:** Un cajero inicia su turno abriendo la caja e indicando el monto inicial (cambio).
  - **Operación:** Durante la `SesionCaja` activa, todas las ventas en efectivo (o tarjetas) se asocian a esta sesión.
  - **Cierre:** Al terminar el turno, el cajero cuenta el dinero físico y cierra la caja. El sistema compara el efectivo declarado contra el efectivo teórico (monto inicial + ventas en efectivo - retiros). Si hay diferencias, se registra un sobrante o faltante. Permite llevar un historial estricto de auditoría por cada empleado.

### 5.7. Módulo de Informes y Estadísticas
- **Modelos:** (No tiene modelos propios, agrega valor leyendo datos existentes).
- **Funcionamiento:** Expone endpoints con filtros complejos (por fechas, por vendedor, por método de pago) que permiten a la administración entender la salud del negocio. Utiliza servicios PDF (`VentaPdfService`) para entregar listados exportables.

---

## 6. Resumen de Modelos y Relaciones (Diagrama Lógico)
- Un `Usuario` tiene un `Rol` y abre muchas `SesionesCaja`.
- Una `SesionCaja` registra muchas `Ventas` realizadas en ese turno.
- Una `Venta` pertenece a un `Cliente`, tiene muchos `DetallesVenta` (líneas de factura) y tiene muchos `Cobros` (ej: mitad efectivo, mitad tarjeta).
- Un `DetalleVenta` apunta a un `Producto`.
- Un `Producto` tiene un control de `Stock` y pertenece a una `Categoría`.
- Un `Proveedor` protagoniza muchas `Compras`. Cada compra tiene `DetallesCompra` que aumentan el `Stock` de los `Productos`.

---

## 7. Roadmap y Futuras Mejoras Recomendadas
Si bien el sistema es robusto, para futuras versiones (v2) se pueden contemplar los siguientes desarrollos:
1. **Manejo de Devoluciones / Notas de Crédito:** Lógica explícita para cuando un cliente devuelve un producto, revirtiendo la venta, reintegrando el dinero a la caja y devolviendo el ítem al stock.
2. **Alertas de Stock Mínimo:** Notificaciones en tiempo real o por correo cuando un producto llega a su punto de reorden (stock crítico).
3. **Múltiples Sucursales:** Ampliar el esquema de bases de datos para soportar diferentes locaciones o tiendas bajo la misma base centralizada.
4. **Auditoría Avanzada (Log de Cambios):** Usar herramientas como Hibernate Envers para registrar quién, cuándo y qué campo exacto modificó en tablas sensibles (ej. ajustes manuales de stock o cambios de precios).
