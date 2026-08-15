# 📚 Guía de Estudio e Implementación: Auditoría e Historial de Compras por Producto

---

## 🎯 1. Objetivo del Módulo

El módulo de **Auditoría e Historial de Compras por Producto** permite llevar un control exhaustivo de:
1. **Evolución de Costos:** Ver cuánto aumentó o bajó el costo de compra en **porcentaje (%)** y en **pesos ($)** entre compras consecutivas.
2. **Intervalo Temporal:** Medir la frecuencia de reposición (*"Primera compra"*, *"Mismo día"*, *"X días después"*, *"X meses después"*).
3. **Trazabilidad de Proveedores:** Auditar a qué proveedor se le compró cada lote y a qué precio unitario.

---

## 🏗️ 2. Arquitectura en Capas (Flujo de Datos)

```text
[Base de Datos (MySQL)] 
       ⬇️  (JPA Query ordenada por fecha DESC)
[DetalleCompraRepository.java]
       ⬇️  (ProductoService: cálculo de variación %, $ y días)
[ProductoService.java]
       ⬇️  (Empaqueta los datos procesados)
[ProductoAuditoriaCompraDTO.java]
       ⬇️  (Controlador REST expone el endpoint)
[ProductoController.java]  --> GET /api/productos/{id}/historial-compras
       ⬇️  (Fetch asíncrono desde el frontend)
[stock.js / productos.js]
       ⬇️  (Renderizado con badges dinámicos)
[admin.html (Modal #product-detail-modal)]
```

---

## 📋 3. Archivos y Cambios Paso a Paso

---

### 🔹 PASO 1: Crear el DTO
* **Ubicación:** `src/main/java/com/gestioninventariodemo2/cruddemo2/DTO/ProductoAuditoriaCompraDTO.java`
* **Acción:** Crear archivo nuevo.

```java
package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoAuditoriaCompraDTO {
    private Long idCompra;
    private LocalDateTime fechaCompra;
    private Long idProveedor;
    private String nombreProveedor;
    private int cantidad;
    private double costoUnitario;
    private Double variacionMonto;          // Diferencia en $ respecto a la compra anterior
    private Double variacionPorcentaje;     // Diferencia en % respecto a la compra anterior
    private Long diasDesdeCompraAnterior;   // Días transcurridos desde la compra previa
    private double subtotal;
}
```

---

### 🔹 PASO 2: Actualizar el Repositorio
* **Ubicación:** `src/main/java/com/gestioninventariodemo2/cruddemo2/Repository/DetalleCompraRepository.java`
* **Acción:** Agregar el método de consulta por ID de producto ordenado por fecha desc.

```java
package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface DetalleCompraRepository extends JpaRepository<DetalleCompra, Long> {
    boolean existsByProductoIdProducto(Long idProducto);

    List<DetalleCompra> findByProductoOrderByCompraFechaDesc(Producto producto);

    // AGREGAR ESTA LÍNEA:
    List<DetalleCompra> findByProducto_IdProductoOrderByCompra_FechaDesc(Long idProducto);
}
```

---

### 🔹 PASO 3: Implementar la Lógica en el Servicio
* **Ubicación:** `src/main/java/com/gestioninventariodemo2/cruddemo2/Services/ProductoService.java`
* **Acción:** 
  1. Agregar el import: `import com.gestioninventariodemo2.cruddemo2.DTO.ProductoAuditoriaCompraDTO;`
  2. Agregar el método `obtenerAuditoriaComprasProducto` al final de la clase.

```java
    /**
     * Obtiene el historial y auditoría de compras de un producto con cálculo de variación de costos y días.
     */
    @Transactional(readOnly = true)
    public List<ProductoAuditoriaCompraDTO> obtenerAuditoriaComprasProducto(Long idProducto) {
        if (!productoRepository.existsById(idProducto)) {
            throw new EntityNotFoundException("Producto no encontrado con id: " + idProducto);
        }

        List<DetalleCompra> compras = detalleCompraRepository.findByProducto_IdProductoOrderByCompra_FechaDesc(idProducto);
        List<ProductoAuditoriaCompraDTO> resultado = new java.util.ArrayList<>();

        for (int i = 0; i < compras.size(); i++) {
            DetalleCompra dc = compras.get(i);
            com.gestioninventariodemo2.cruddemo2.Model.Compra compra = dc.getCompra();

            Long idCompra = compra != null ? compra.getIdCompra() : null;
            java.time.LocalDateTime fecha = compra != null ? compra.getFecha() : null;
            Long idProv = (compra != null && compra.getProveedor() != null) ? compra.getProveedor().getIdProveedor() : null;
            String nombreProv = (compra != null && compra.getProveedor() != null) ? compra.getProveedor().getNombre() : "Sin proveedor";

            double costoActual = dc.getPrecioUnitario();
            Double variacionMonto = null;
            Double variacionPorcentaje = null;
            Long diasDesdeCompraAnterior = null;

            // Comparar con la compra anterior en el tiempo (índice i + 1 ya que la lista está ordenada DESC)
            if (i + 1 < compras.size()) {
                DetalleCompra compraAnterior = compras.get(i + 1);
                double costoAnterior = compraAnterior.getPrecioUnitario();
                if (costoAnterior > 0) {
                    variacionMonto = costoActual - costoAnterior;
                    variacionPorcentaje = ((costoActual - costoAnterior) / costoAnterior) * 100.0;
                }

                if (fecha != null && compraAnterior.getCompra() != null && compraAnterior.getCompra().getFecha() != null) {
                    diasDesdeCompraAnterior = java.time.temporal.ChronoUnit.DAYS.between(
                            compraAnterior.getCompra().getFecha().toLocalDate(),
                            fecha.toLocalDate()
                    );
                }
            }

            resultado.add(ProductoAuditoriaCompraDTO.builder()
                    .idCompra(idCompra)
                    .fechaCompra(fecha)
                    .idProveedor(idProv)
                    .nombreProveedor(nombreProv)
                    .cantidad(dc.getCantidad())
                    .costoUnitario(costoActual)
                    .variacionMonto(variacionMonto)
                    .variacionPorcentaje(variacionPorcentaje)
                    .diasDesdeCompraAnterior(diasDesdeCompraAnterior)
                    .subtotal(dc.getCantidad() * costoActual)
                    .build());
        }

        return resultado;
    }
```

---

### 🔹 PASO 4: Exponer el Endpoint REST
* **Ubicación:** `src/main/java/com/gestioninventariodemo2/cruddemo2/Controller/ProductoController.java`
* **Acción:**
  1. Agregar el import: `import com.gestioninventariodemo2.cruddemo2.DTO.ProductoAuditoriaCompraDTO;`
  2. Agregar el endpoint:

```java
    /**
     * Obtiene el historial y auditoría de compras de un producto con variaciones de costos.
     */
    @GetMapping("/{id}/historial-compras")
    public ResponseEntity<List<ProductoAuditoriaCompraDTO>> obtenerHistorialCompras(@PathVariable Long id) {
        List<ProductoAuditoriaCompraDTO> historial = productoService.obtenerAuditoriaComprasProducto(id);
        return ResponseEntity.ok(historial);
    }
```

---

### 🔹 PASO 5: Actualizar la Vista del Modal en HTML
* **Ubicación:** `src/main/resources/static/admin.html`
* **Acción:** En `#product-detail-modal`, agregar el botón de la 3ª pestaña y el contenedor de tabla:

#### 1. Botón de pestaña (en `.product-detail-tabs`):
```html
<button type="button" class="product-detail-tab" data-tab="product-detail-tab-historial">
    <i class="fas fa-history"></i> Historial de Compras
    <span id="product-detail-tab-compras-badge" class="product-detail-tab-badge">0</span>
</button>
```

#### 2. Contenedor de la pestaña (después de `product-detail-tab-proveedores`):
```html
<!-- Tab 3: Historial y Auditoría de Compras -->
<div id="product-detail-tab-historial" class="product-detail-tab-content" style="display: none;">
    <div style="padding: 24px 28px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div>
                    <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-history" style="color: #0d9488; font-size: 14px;"></i>
                        Auditoría de Compras y Costos
                    </h4>
                    <span style="font-size: 12px; color: #64748b;">
                        Registro cronológico de abastecimiento y evolución de precios
                    </span>
                </div>
            </div>
            <div style="max-height: 380px; overflow-y: auto;" id="detail-historial-compras-container">
                <table class="data-table" style="table-layout: fixed; width: 100%; margin: 0;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="width: 20%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Fecha & Período</th>
                            <th style="width: 12%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Compra N°</th>
                            <th style="width: 24%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Proveedor</th>
                            <th style="width: 10%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; border-bottom: 1px solid #e2e8f0;">Cantidad</th>
                            <th style="width: 16%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid #e2e8f0;">Costo Unit.</th>
                            <th style="width: 18%; padding: 12px 18px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; border-bottom: 1px solid #e2e8f0;">Variación vs Prev.</th>
                        </tr>
                    </thead>
                    <tbody id="detail-historial-compras-body">
                        <tr>
                            <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">
                                <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
```

---

### 🔹 PASO 6: Lógica en JavaScript
* **Ubicación:** `src/main/resources/static/js/stock.js` y `src/main/resources/static/js/productos.js`
* **Acción:** En la función `openDetailModal(productId)` agregar:

```javascript
// Cargar Historial y Auditoría de Compras
const comprasBody = document.getElementById('detail-historial-compras-body');
const comprasBadge = document.getElementById('product-detail-tab-compras-badge');
if (comprasBadge) comprasBadge.textContent = '0';

if (comprasBody) {
    comprasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando historial de compras...</td></tr>';
    try {
        const histResponse = await fetch(`/api/productos/${productId}/historial-compras`, { cache: 'no-store' });
        if (histResponse.ok) {
            const compras = await histResponse.json();
            if (comprasBadge) comprasBadge.textContent = compras.length;

            if (compras.length === 0) {
                comprasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 25px; font-style: italic;"><i class="fas fa-info-circle" style="margin-right: 6px;"></i>Este producto aún no registra compras en el sistema.</td></tr>';
            } else {
                comprasBody.innerHTML = compras.map(c => {
                    let fechaStr = '—';
                    if (c.fechaCompra) {
                        const d = new Date(c.fechaCompra);
                        if (!isNaN(d.getTime())) {
                            fechaStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        }
                    }

                    // Período de tiempo respecto a la compra anterior
                    let periodoHtml = '';
                    if (c.diasDesdeCompraAnterior === null || c.diasDesdeCompraAnterior === undefined) {
                        periodoHtml = '<span style="display: block; font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px;">Primera compra</span>';
                    } else if (c.diasDesdeCompraAnterior === 0) {
                        periodoHtml = '<span style="display: block; font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;"><i class="far fa-clock" style="font-size: 10px; margin-right: 2px;"></i> Mismo día</span>';
                    } else if (c.diasDesdeCompraAnterior < 30) {
                        periodoHtml = `<span style="display: block; font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 2px;"><i class="far fa-clock" style="font-size: 10px; margin-right: 2px;"></i> ${c.diasDesdeCompraAnterior} días después</span>`;
                    } else {
                        const meses = Math.floor(c.diasDesdeCompraAnterior / 30);
                        const diasRestantes = c.diasDesdeCompraAnterior % 30;
                        let textoMeses = meses === 1 ? '1 mes' : `${meses} meses`;
                        if (diasRestantes > 0) textoMeses += ` y ${diasRestantes}d`;
                        periodoHtml = `<span style="display: block; font-size: 11px; color: #6366f1; font-weight: 600; margin-top: 2px;"><i class="far fa-calendar-alt" style="font-size: 10px; margin-right: 2px;"></i> ${textoMeses} después</span>`;
                    }

                    // Badge de Variación (% y $)
                    let variacionHtml = '<span style="color: #64748b; font-size: 12px; font-weight: 500;">➖</span>';
                    if (c.variacionPorcentaje !== null && c.variacionPorcentaje !== undefined) {
                        const pct = c.variacionPorcentaje;
                        const monto = c.variacionMonto || 0;
                        const pctStr = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
                        const montoStr = (monto >= 0 ? '+$' : '-$') + Math.abs(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                        if (pct > 0.05) {
                            variacionHtml = `<span style="display: inline-flex; flex-direction: column; align-items: center; gap: 1px; background: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 8px; border: 1px solid #fecaca; min-width: 90px;">
                                <span style="font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;">
                                    <i class="fas fa-arrow-up" style="font-size: 9px;"></i> ${pctStr}
                                </span>
                                <span style="font-size: 11px; font-weight: 600; opacity: 0.9;">(${montoStr})</span>
                            </span>`;
                        } else if (pct < -0.05) {
                            variacionHtml = `<span style="display: inline-flex; flex-direction: column; align-items: center; gap: 1px; background: #f0fdf4; color: #16a34a; padding: 4px 10px; border-radius: 8px; border: 1px solid #bbf7d0; min-width: 90px;">
                                <span style="font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;">
                                    <i class="fas fa-arrow-down" style="font-size: 9px;"></i> ${pctStr}
                                </span>
                                <span style="font-size: 11px; font-weight: 600; opacity: 0.9;">(${montoStr})</span>
                            </span>`;
                        } else {
                            variacionHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; color: #64748b; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0;">
                                ➖ 0.0% ($0,00)
                            </span>`;
                        }
                    }

                    const costoUnitFormatted = '$' + (c.costoUnitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const numCompra = c.idCompra ? `#${String(c.idCompra).padStart(5, '0')}` : '—';

                    return `
                        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;">
                            <td style="padding: 12px 18px; font-size: 13px; color: #334155;">
                                <span style="font-weight: 600; color: #1e293b;">${fechaStr}</span>
                                ${periodoHtml}
                            </td>
                            <td style="padding: 12px 18px; font-size: 13px; color: #0d9488; font-weight: 700;">${numCompra}</td>
                            <td style="padding: 12px 18px; font-size: 13px; color: #1e293b; font-weight: 600;">${c.nombreProveedor || 'N/A'}</td>
                            <td style="padding: 12px 18px; font-size: 13px; color: #334155; text-align: center; font-weight: 600;">${c.cantidad}</td>
                            <td style="padding: 12px 18px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 700;">${costoUnitFormatted}</td>
                            <td style="padding: 12px 18px; text-align: center;">${variacionHtml}</td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            comprasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar historial de compras</td></tr>';
        }
    } catch (histErr) {
        console.error('Error al cargar historial de compras:', histErr);
        comprasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar historial de compras</td></tr>';
    }
}
```

---

## ⚡ 4. Comando de Validación y Compilación

Para probar que todo compila en la computadora destino:

```bash
./mvnw test-compile
```

Debe finalizar con **`BUILD SUCCESS`**.
