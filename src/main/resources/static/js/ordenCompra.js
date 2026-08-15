// ===============================================
// ESTADO GLOBAL: ORDEN DE COMPRA
// ===============================================
let ocEstado = {
    proveedor: null, // {id, nombre, email}
    proveedoresTodos: [],
    productosDelProveedor: [],
    lineas: [] // Array de { idProducto, nombre, cantidad, costoUnitario }
};

let activeProvIndexOC = -1;
let activeProdIndexOC = -1;
const formatterOC = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// ===============================================
// INICIALIZACIÓN
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    initResumenOC();
    
    const btnGuardar = document.getElementById('btn-guardar-orden');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarYGenerarOrdenCompra);
    }

    const btnOpenOC = document.getElementById('btn-open-oc-panel');
    if (btnOpenOC) {
        btnOpenOC.addEventListener('click', () => {
            if (window.inicializarOrdenCompraDesdeStock) {
                window.inicializarOrdenCompraDesdeStock();
            }
        });
    }

    const btnCloseOC = document.getElementById('btn-close-oc-panel');
    if (btnCloseOC) {
        btnCloseOC.addEventListener('click', () => {
            if (window.cerrarOCPanel) {
                window.cerrarOCPanel();
            }
        });
    }

    const btnCancelarOC = document.getElementById('btn-cancelar-oc');
    if (btnCancelarOC) {
        btnCancelarOC.addEventListener('click', () => {
            if (window.cerrarOCPanel) {
                window.cerrarOCPanel();
            }
        });
    }
    
    // Cargar proveedores al iniciar
    cargarProveedoresOC();
    setFechaActualOC();

    // Limpiar errores de fechas al cambiar
    const ocFechaEmision = document.getElementById('oc-fecha-emision');
    const ocFechaEntrega = document.getElementById('oc-fecha-entrega');
    if (ocFechaEmision) {
        ocFechaEmision.addEventListener('change', () => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('oc-fecha-emision');
        });
    }
    if (ocFechaEntrega) {
        ocFechaEntrega.addEventListener('change', () => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('oc-fecha-entrega');
            if (window.limpiarErroresInline) window.limpiarErroresInline('oc-fecha-emision');
        });
    }

    // Cerrar modal al hacer clic en el overlay
    const overlay = document.getElementById('oc-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.cerrarOCPanel();
            }
        });
    }
});

function setFechaActualOC() {
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const fechaInput = document.getElementById('oc-fecha-emision');
    if(fechaInput) fechaInput.value = fecha;
}

async function cargarProveedoresOC() {
    try {
        const res = await fetch('/api/proveedores/select');
        if(!res.ok) throw new Error('Error al obtener proveedores');
        ocEstado.proveedoresTodos = await res.json();
    } catch (e) {
        console.error(e);
    }
}

// ===============================================
// LÓGICA DE APERTURA DESDE STOCK
// ===============================================
window.inicializarOrdenCompraDesdeStock = function() {
    // 1. Asegurar que tenemos los proveedores cargados
    if (ocEstado.proveedoresTodos.length === 0) {
        cargarProveedoresOC();
    }

    // 2. Buscar el proveedor por nombre
    const provNombre = window.activeProviderForOC;
    const proveedorObj = ocEstado.proveedoresTodos.find(p => p.nombre === provNombre) || { id: null, nombre: provNombre };
    ocEstado.proveedor = proveedorObj;

    // Prefilar en el HTML
    document.getElementById('oc-proveedor-name-display').value = provNombre;
    document.getElementById('oc-proveedor-id-hidden').value = proveedorObj.id || '';

    // 3. Copiar las líneas seleccionadas
    ocEstado.lineas = Object.values(window.selectedProductsDetailsForOC).map(p => ({
        idProducto: parseInt(p.idProducto),
        nombre: p.nombre,
        cantidad: 1,
        costoUnitario: p.costoUnitario || 0
    }));

    // 4. Renderizar la tabla y calcular totales
    renderTablaProductosOC();
    setFechaActualOC();

    // 5. Mostrar el modal
    const panel = document.getElementById('oc-modal-overlay');
    if (panel) {
        panel.style.display = 'flex';
        // Cerrar con tecla ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                window.cerrarOCPanel();
            }
        };
        document.addEventListener('keydown', escHandler);
        panel._escHandler = escHandler;
    }
};

window.cerrarOCPanel = function() {
    const panel = document.getElementById('oc-modal-overlay');
    if (panel) {
        panel.style.display = 'none';
        if (panel._escHandler) {
            document.removeEventListener('keydown', panel._escHandler);
            delete panel._escHandler;
        }
    }
    if (window.limpiarTodosErroresInline) {
        window.limpiarTodosErroresInline('oc-');
    }
};

// ===============================================
// TABLA Y RESUMEN
// ===============================================
function renderTablaProductosOC() {
    const tbody = document.querySelector('#oc-tabla-productos tbody');
    tbody.innerHTML = '';
    
    if (ocEstado.lineas.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Busque y seleccione un producto</td>
            </tr>
        `;
        actualizarTotalesOC();
        return;
    }
    
    ocEstado.lineas.forEach((linea, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td style="font-weight: 500; vertical-align: middle;">${linea.nombre}</td>
              <td class="col-num col-qty" style="vertical-align: middle;">
                  <div class="qty-stepper">
                      <button type="button" class="btn-qty btn-qty-minus" onclick="actualizarLineaOC(${index}, 'cantidad', ${linea.cantidad - 1})">-</button>
                      <input type="number" value="${linea.cantidad}" id="oc-cantidad-${index}" class="qty-input responsive-input" maxlength="7" oninput="window.checkMaxLength(this, 7)" onkeydown="return event.key !== '-' && event.key !== '.' && event.key !== ',' && event.key !== 'e' && event.key !== 'E'" onchange="actualizarLineaOC(${index}, 'cantidad', this.value)">
                      <button type="button" class="btn-qty btn-qty-plus" onclick="actualizarLineaOC(${index}, 'cantidad', ${linea.cantidad + 1})">+</button>
                  </div>
                  <div class="error-message" id="error-oc-cantidad-${index}"></div>
              </td>
              <td class="col-num" style="vertical-align: middle;">
                  <div class="input-money" style="position: relative;">
                      <span class="money-prefix">$</span>
                      <input type="number" step="0.01" min="0" value="${linea.costoUnitario}" id="oc-costo-${index}" class="inline-edit-input responsive-input" oninput="window.checkMaxLength(this, 10)" onkeydown="return event.key !== '-' && event.key !== '+' && event.key !== 'e' && event.key !== 'E'" onchange="actualizarLineaOC(${index}, 'costo', this.value)">
                  </div>
                  <div class="error-message" id="error-oc-costo-${index}"></div>
              </td>
            <td class="col-num" style="vertical-align: middle; font-weight: 600; text-align: right; color: #1e293b; font-size: 15px;">
                ${formatterOC.format(linea.cantidad * linea.costoUnitario)}
            </td>
            <td style="vertical-align: middle; text-align: center;">
                <button type="button" class="btn-icon btn-delete-detalle btn-quitar-item" onclick="eliminarLineaOC(${index})" title="Quitar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    actualizarTotalesOC();
}

window.actualizarLineaOC = function(index, campo, valor) {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0) return;
    
    if (campo === 'cantidad') {
        ocEstado.lineas[index].cantidad = parseInt(valor, 10) || 1;
    } else if (campo === 'costo') {
        ocEstado.lineas[index].costoUnitario = num;
    }
    renderTablaProductosOC();
}

window.eliminarLineaOC = function(index) {
    const line = ocEstado.lineas[index];
    if (line) {
        const idStr = line.idProducto.toString();
        if (window.selectedProductsForOC) window.selectedProductsForOC.delete(idStr);
        if (window.selectedProductsDetailsForOC) delete window.selectedProductsDetailsForOC[idStr];
        
        // If no products left, reset active provider
        if (window.selectedProductsForOC && window.selectedProductsForOC.size === 0) {
            window.activeProviderForOC = null;
        }
    }
    ocEstado.lineas.splice(index, 1);
    renderTablaProductosOC();
    
    // Update checkboxes state and action bar in case the stock table is still visible
    if (window.updateOCCheckboxesState) window.updateOCCheckboxesState();
    if (window.updateOCActionBar) window.updateOCActionBar();
    
    // If no lines left, close panel
    if (ocEstado.lineas.length === 0) {
        window.cerrarOCPanel();
    }
}

function initResumenOC() {
    document.getElementById('oc-iva').addEventListener('change', actualizarTotalesOC);
    document.getElementById('oc-descuento').addEventListener('input', actualizarTotalesOC);
}

function actualizarTotalesOC() {
    let subtotal = 0;
    ocEstado.lineas.forEach(l => {
        subtotal += (l.cantidad * l.costoUnitario);
    });
    
    const ivaPorcentaje = parseFloat(document.getElementById('oc-iva').value) || 0;
    const descPorcentaje = parseFloat(document.getElementById('oc-descuento').value) || 0;
    
    const montoDescuento = subtotal * (descPorcentaje / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const montoIva = subtotalConDescuento * (ivaPorcentaje / 100);
    const totalFinal = subtotalConDescuento + montoIva;
    
    document.getElementById('oc-resumen-subtotal').textContent = formatterOC.format(subtotal);
    document.getElementById('oc-resumen-descuento').textContent = `-${formatterOC.format(montoDescuento)}`;
    document.getElementById('oc-resumen-monto-iva').textContent = `+${formatterOC.format(montoIva)}`;
    document.getElementById('oc-resumen-total').textContent = formatterOC.format(totalFinal);
}

// ===============================================
// GUARDAR Y GENERAR PDF
// ===============================================

async function guardarYGenerarOrdenCompra() {
    // 1. Limpiar todos los errores inline previos
    if(window.limpiarTodosErroresInline) {
        window.limpiarTodosErroresInline('oc-');
    }
    
    let hasError = false;

    // Validaciones
    if (!ocEstado.proveedor) {
        if(window.mostrarErrorInline) window.mostrarErrorInline('oc-proveedor-search', 'Debe seleccionar un proveedor');
        hasError = true;
    }
    
    const fechaEmision = document.getElementById('oc-fecha-emision').value;
    if (!fechaEmision) {
        if(window.mostrarErrorInline) window.mostrarErrorInline('oc-fecha-emision', 'Debe seleccionar la Fecha de Emisión');
        hasError = true;
    }
    
    const fechaEntrega = document.getElementById('oc-fecha-entrega').value;
    if (!fechaEntrega) {
        if(window.mostrarErrorInline) window.mostrarErrorInline('oc-fecha-entrega', 'Debe seleccionar la Fecha de Entrega Esperada');
        hasError = true;
    }

    if (fechaEmision && fechaEntrega) {
        if (fechaEmision > fechaEntrega) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('oc-fecha-emision', 'La fecha de emisión no puede ser posterior a la de entrega');
            if (window.mostrarErrorInline) window.mostrarErrorInline('oc-fecha-entrega', 'La fecha de entrega debe ser posterior o igual a la de emisión');
            hasError = true;
        }
    }
    
    const condicionPago = document.getElementById('oc-condicion-pago').value;
    if (!condicionPago || condicionPago.trim() === '') {
        if(window.mostrarErrorInline) window.mostrarErrorInline('oc-condicion-pago', 'Debe ingresar la Condición de Pago');
        hasError = true;
    }
    
    const direccionEntrega = document.getElementById('oc-direccion-entrega').value;
    if (!direccionEntrega || direccionEntrega.trim() === '') {
        if(window.mostrarErrorInline) window.mostrarErrorInline('oc-direccion-entrega', 'Debe ingresar la Dirección de Entrega');
        hasError = true;
    }
    
    if (hasError) {
        return; // Detener ejecución si hay errores en los campos
    }
    
    if (ocEstado.lineas.length === 0) {
        alert("La orden debe contener al menos un producto.");
        return;
    }
    
    const observaciones = document.getElementById('oc-observaciones').value;
    const ivaPorcentaje = parseFloat(document.getElementById('oc-iva').value) || 0;
    const descPorcentaje = parseFloat(document.getElementById('oc-descuento').value) || 0;
    
    let subtotal = 0;
    ocEstado.lineas.forEach(l => {
        subtotal += (l.cantidad * l.costoUnitario);
    });
    const montoDescuento = subtotal * (descPorcentaje / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const montoIva = subtotalConDescuento * (ivaPorcentaje / 100);
    const totalFinal = subtotalConDescuento + montoIva;

    const dto = {
        idProveedor: ocEstado.proveedor.id,
        fechaEmision: fechaEmision,
        fechaEntregaEsperada: fechaEntrega || null,
        condicionPago: condicionPago,
        direccionEntrega: direccionEntrega,
        observaciones: observaciones,
        subtotal: subtotal,
        porcentajeIva: ivaPorcentaje,
        porcentajeDescuento: descPorcentaje,
        totalFinal: totalFinal,
        detalles: ocEstado.lineas.map(l => ({
            idProducto: l.idProducto,
            cantidad: l.cantidad,
            costoUnitario: l.costoUnitario,
            subtotal: l.cantidad * l.costoUnitario
        }))
    };

    const btn = document.getElementById('btn-guardar-orden');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/ordenes-compra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        
        if(!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        
        const guardada = await res.json();
        
        // Generar PDF
        generarPDFOrdenCompra(guardada);
        
        showUIToast('success', '¡Éxito!', 'Orden de Compra guardada y PDF generado correctamente.', 5000);
        window.limpiarFormularioOrdenCompra();
        
    } catch (e) {
        console.error(e);
        alert("Error al guardar la orden: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function generarPDFOrdenCompra(ordenData) {
    const doc = new window.jspdf.jsPDF();
    const proveedor = ocEstado.proveedor || {};
    
    // Obtener fecha
    const numeroOrden = `OC-${ordenData.idOrden.toString().padStart(6, '0')}`;
    const fechaEmisionFormat = ordenData.fechaEmision.split('-').reverse().join('/');
    
    // --- ESTILOS B&W MINIMALISTA ---
    // Colores base
    const colorNegro = [0, 0, 0];
    const colorGrisOscuro = [51, 51, 51];
    const colorGrisMedio = [153, 153, 153];
    const colorGrisClaro = [220, 220, 220];

    // 1. HEADER CORPORATIVO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(colorNegro[0], colorNegro[1], colorNegro[2]);
    doc.text("LIBRERÍA", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
    doc.text("CUIT: 30-12345678-9", 14, 31);
    doc.text("Dirección: Tu Dirección Aquí, Ciudad", 14, 36); 
    doc.text("Email: contacto@libreria.com | Tel: 011-1234-5678", 14, 41);

    // Titulo a la derecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(colorNegro[0], colorNegro[1], colorNegro[2]);
    doc.text("ORDEN DE COMPRA", 196, 25, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nº Orden: ${numeroOrden}`, 196, 33, { align: "right" });
    doc.text(`Fecha: ${fechaEmisionFormat}`, 196, 38, { align: "right" });
    
    if (ordenData.fechaEntregaEsperada) {
        const fechaEntFormat = ordenData.fechaEntregaEsperada.split('-').reverse().join('/');
        doc.text(`Entrega: ${fechaEntFormat}`, 196, 43, { align: "right" });
    }

    // Linea divisoria gruesa
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(14, 49, 196, 49);
    doc.setLineWidth(0.1);

    // 2. DATOS DEL PROVEEDOR
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DESTINATARIO / PROVEEDOR", 14, 57);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(proveedor.nombre || "Consumidor Final", 14, 63);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`CUIT: ${proveedor.cuit || "N/A"}`, 14, 69);
    doc.text(`Dirección: ${proveedor.direccion || "N/A"}`, 14, 74);
    doc.text(`Email: ${proveedor.email || "N/A"}`, 14, 79);
    doc.text(`Teléfono: ${proveedor.telefono || "N/A"}`, 14, 84);

    // Condiciones comerciales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DETALLES COMERCIALES", 115, 57);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Condición de Pago:", 115, 65);
    doc.setFont("helvetica", "normal");
    doc.text(ordenData.condicionPago || "A convenir", 152, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Dirección Entrega:", 115, 72);
    doc.setFont("helvetica", "normal");
    const dirTexto = ordenData.direccionEntrega || "En sucursal principal";
    const dirLines = doc.splitTextToSize(dirTexto, 45);
    doc.text(dirLines, 152, 72);

    // Linea divisoria fina
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.1);
    doc.line(14, 90, 196, 90);

    // 3. TABLA DE PRODUCTOS
    const tableCols = ["Ítem", "Descripción del Producto", "Cantidad", "Costo Unit.", "Subtotal"];
    const tableRows = ocEstado.lineas.map((l, index) => [
        (index + 1).toString(),
        l.nombre, 
        l.cantidad.toString(),
        formatterOC.format(l.costoUnitario),
        formatterOC.format(l.cantidad * l.costoUnitario)
    ]);
    
    doc.autoTable({
        startY: 96,
        head: [tableCols],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
            fillColor: [0, 0, 0], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold', 
            halign: 'center' 
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
        },
        styles: { 
            font: 'helvetica',
            fontSize: 9, 
            cellPadding: 5,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        }
    });
    
    let finalY = doc.lastAutoTable.finalY || 96;

    // 4. DESGLOSE FINANCIERO (ALINEADO A LA DERECHA)
    const rightMargin = 196;
    const valueCol = rightMargin;
    const labelCol = rightMargin - 35;
    
    doc.setFontSize(10);
    
    // Subtotal
    finalY += 10;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", labelCol, finalY, { align: "right" });
    doc.text(formatterOC.format(ordenData.subtotal), valueCol, finalY, { align: "right" });

    // Descuento
    if (ordenData.porcentajeDescuento > 0) {
        finalY += 6;
        const montoDesc = ordenData.subtotal * (ordenData.porcentajeDescuento / 100);
        doc.text(`Descuento (${ordenData.porcentajeDescuento}%):`, labelCol, finalY, { align: "right" });
        doc.text(`-${formatterOC.format(montoDesc)}`, valueCol, finalY, { align: "right" });
    }

    // IVA
    if (ordenData.porcentajeIva > 0) {
        finalY += 6;
        const baseIva = ordenData.subtotal * (1 - (ordenData.porcentajeDescuento / 100));
        const montoIva = baseIva * (ordenData.porcentajeIva / 100);
        doc.text(`IVA (${ordenData.porcentajeIva}%):`, labelCol, finalY, { align: "right" });
        doc.text(`+${formatterOC.format(montoIva)}`, valueCol, finalY, { align: "right" });
    }

    // Total Final (Bloque negro o gris fuerte)
    finalY += 8;
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(rightMargin - 80, finalY - 5, 82, 10, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL FINAL:", labelCol, finalY + 1.5, { align: "right" });
    doc.text(formatterOC.format(ordenData.totalFinal), valueCol - 2, finalY + 1.5, { align: "right" });

    // 5. OBSERVACIONES Y FIRMAS
    let obsY = doc.lastAutoTable.finalY + 10;
    
    if (ordenData.observaciones) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Observaciones:", 14, obsY);
        doc.setFont("helvetica", "normal");
        
        const obsLines = doc.splitTextToSize(ordenData.observaciones, 110);
        doc.text(obsLines, 14, obsY + 5);
        obsY += (obsLines.length * 4) + 5;
    }
    
    // Firma autorizada (abajo del todo)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("_________________________", 14, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text("Firma Autorizada", 25, finalY + 45);

    doc.setFont("helvetica", "normal");
    doc.text("_________________________", 80, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text("Aclaración", 98, finalY + 45);

    // Pie de página
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const notasText = "Este documento es una orden de compra oficial. Por favor confirmar recepción y disponibilidad de los artículos.";
    const notasLines = doc.splitTextToSize(notasText, 180);
    doc.text(notasLines, 105, 285, { align: "center" });
    
    // Descargar
    const safeProvName = (proveedor.nombre || "Proveedor").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`OrdenCompra_${safeProvName}_${numeroOrden}.pdf`);
}
window.limpiarFormularioOrdenCompra = function() {
    if(window.limpiarTodosErroresInline) {
        window.limpiarTodosErroresInline('oc-');
    }
    
    ocEstado.proveedor = null;
    ocEstado.productosDelProveedor = [];
    ocEstado.lineas = [];
    
    document.getElementById('orden-compra-form').reset();
    
    // Clear selection
    if (window.clearOCSelection) {
        window.clearOCSelection();
    }
    
    // Close modal
    const panel = document.getElementById('oc-modal-overlay');
    if (panel) {
        panel.style.display = 'none';
        if (panel._escHandler) {
            document.removeEventListener('keydown', panel._escHandler);
            delete panel._escHandler;
        }
    }
    
    renderTablaProductosOC();
    setFechaActualOC();
}
