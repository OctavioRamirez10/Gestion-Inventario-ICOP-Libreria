document.addEventListener('DOMContentLoaded', function () {

    // ---- Aplicar mínimo de hoy a los inputs de fechas futuras ----
    const hoyParaVencimientos = new Date().toISOString().split('T')[0];
    const inputFechaProg = document.getElementById('compra-fecha-programada-pago');
    const inputProxFecha = document.getElementById('pago-compra-proxima-fecha');
    if (inputFechaProg) {
        inputFechaProg.setAttribute('min', hoyParaVencimientos);
        inputFechaProg.addEventListener('change', () => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('compra-fecha-programada-pago');
        });
    }
    if (inputProxFecha) inputProxFecha.setAttribute('min', hoyParaVencimientos);

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PRODUCTOS_URL_SELECT_ALL = '/api/productos/select';
    const API_COMPRAS_URL = '/api/compras';
    const API_PROVEEDORES_URL = '/api/proveedores/select';
    const API_PRODUCTOS_URL_BASE = '/api/productos';

    // ===============================
    // VALIDACIÓN DE EFECTIVO EN CAJA
    // ===============================
    let saldoCajaActual = 0;
    const styleAlerta = document.createElement('style');
    styleAlerta.textContent = `
        .inline-alert-efectivo {
            display: none;
            background-color: rgba(220, 38, 38, 0.1);
            color: #dc2626;
            border-left: 4px solid #dc2626;
            padding: 10px 14px;
            margin-top: 8px;
            border-radius: 6px;
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 500;
            font-size: 0.9rem;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.05);
            animation: slideDownFade 0.3s ease-out;
        }
        .inline-alert-efectivo.show {
            display: flex;
        }
        @keyframes slideDownFade {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleAlerta);

    async function fetchSaldoCajaActual() {
        try {
            const response = await fetch('/api/caja/sesion-activa/me');
            if (response.ok) {
                const data = await response.json();
                saldoCajaActual = data.saldoEsperado || 0;
            } else {
                saldoCajaActual = 0;
            }
        } catch (error) {
            console.error('Error obteniendo saldo de caja:', error);
            saldoCajaActual = 0;
        }
    }

    function validarEfectivoEnTiempoReal() {
        const metodoPagoSelect = document.getElementById('compra-metodo-pago');
        const inputMonto = document.getElementById('compra-pago-monto');
        const btnAgregarPago = document.getElementById('compra-btn-agregar-pago') || document.querySelector('.btn-add-pago'); 
        const btnRegistrarCompra = document.querySelector('#compra-form button[type="submit"]');

        if (!metodoPagoSelect || !inputMonto) return;
        
        let alertaDiv = document.getElementById('alerta-efectivo-compra');
        if (!alertaDiv) {
            alertaDiv = document.createElement('div');
            alertaDiv.id = 'alerta-efectivo-compra';
            alertaDiv.className = 'inline-alert-efectivo';
            alertaDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span></span>`;
            const paymentRow = document.getElementById('compra-payment-row');
            if (paymentRow) {
                paymentRow.parentNode.insertBefore(alertaDiv, paymentRow.nextSibling);
            } else {
                inputMonto.parentNode.insertBefore(alertaDiv, inputMonto.nextSibling);
            }
        }

        const spanMensaje = alertaDiv.querySelector('span');
        const metodoSeleccionado = metodoPagoSelect.options[metodoPagoSelect.selectedIndex];
        const esEfectivoCaja = metodoSeleccionado && 
                             metodoSeleccionado.text.toLowerCase().includes('efectivo') && 
                             !metodoSeleccionado.text.toLowerCase().includes('aporte externo');

        if (esEfectivoCaja) {
            const montoIngresadoStr = inputMonto.value ? inputMonto.value.replace(/\./g, '').replace(',', '.') : '0';
            const montoIngresado = parseFloat(montoIngresadoStr) || 0;
            
            let totalEfectivoPrevio = 0;
            if (typeof pagosMixtos !== 'undefined' && pagosMixtos) {
                pagosMixtos.forEach(p => {
                    if (p.nombreMetodo && p.nombreMetodo.toLowerCase().includes('efectivo') && !p.nombreMetodo.toLowerCase().includes('aporte externo')) {
                        totalEfectivoPrevio += parseFloat(p.importe) || 0;
                    }
                });
            }

            if ((montoIngresado + totalEfectivoPrevio) > saldoCajaActual) {
                spanMensaje.textContent = `El monto total en efectivo supera el disponible en caja ($${typeof formatoMoneda !== 'undefined' ? formatoMoneda.format(saldoCajaActual) : saldoCajaActual}).`;
                alertaDiv.classList.add('show');
                if (btnAgregarPago) btnAgregarPago.disabled = true;
                if (btnRegistrarCompra) btnRegistrarCompra.disabled = true;
            } else {
                alertaDiv.classList.remove('show');
                if (btnAgregarPago) btnAgregarPago.disabled = false;
                if (btnRegistrarCompra) btnRegistrarCompra.disabled = false;
            }
        } else {
            alertaDiv.classList.remove('show');
            if (btnAgregarPago) btnAgregarPago.disabled = false;
            if (btnRegistrarCompra) btnRegistrarCompra.disabled = false;
        }
    }

    // ===============================
    // CONFIGURACIÓN DE FORMATO
    // ===============================    // Utilidad: Formatear a moneda sin decimales
    // Utilidad: Formateador manual estricto para evitar fallos de locale en navegadores
    const formatoMoneda = {
        format: function (num) {
            if (num === null || num === undefined || isNaN(num)) return '0';
            let partes = Number(num).toFixed(2).split('.');
            let enteros = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            let decimales = partes[1];
            if (decimales === '00') return enteros;
            return enteros + ',' + decimales;
        }
    };

    function mostrarVueltoToast(vuelto) {
        let toast = document.getElementById('vuelto-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'vuelto-toast';
            toast.className = 'vuelto-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-check-circle"></i> Vuelto: $${formatoMoneda.format(vuelto)}`;
        toast.classList.add('show');

        if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    function parsearMoneda(valor) {
        if (!valor) return NaN;
        const limpio = valor.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(limpio);
    }

    // Utilidad: Máscara decimal inteligente para pagos
    function formatearInputMonedaDecimales(valueStr) {
        // 1. Solo dígitos y comas
        let val = valueStr.replace(/[^0-9,]/g, '');

        // 2. Solo la primera coma
        let parts = val.split(',');
        if (parts.length > 2) {
            parts = [parts[0], parts.slice(1).join('')];
        }

        // 3. Limite parte entera a 10 digitos
        let enteros = parts[0];
        if (enteros.length > 10) enteros = enteros.substring(0, 10);

        // 4. Limite parte decimal a 2 digitos
        let decimales = parts[1];
        if (decimales !== undefined && decimales.length > 2) {
            decimales = decimales.substring(0, 2);
        }

        // 5. Formatear la parte entera con puntos de mil
        let enterosFormateados = '';
        if (enteros !== '') {
            enterosFormateados = parseInt(enteros, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }

        // 6. Reconstruir
        if (decimales !== undefined) {
            return enterosFormateados + ',' + decimales;
        } else if (val.endsWith(',')) {
            return enterosFormateados + ',';
        } else {
            return enterosFormateados;
        }
    }

    // Función para manejar fechas consistentemente
    function formatearFechaHora(fechaString) {
        if (!fechaString) return 'N/A';
        try {
            // Manejar formato "YYYY-MM-DDTHH:mm:ss" o "YYYY-MM-DD HH:mm:ss.S"
            let fechaParsed;

            // Si es un array [year, month, day, hour, minute] generado por backend (sucede a veces con Jackson)
            if (Array.isArray(fechaString)) {
                const year = fechaString[0];
                const month = String(fechaString[1]).padStart(2, '0');
                const day = String(fechaString[2]).padStart(2, '0');
                const hour = fechaString.length > 3 ? String(fechaString[3]).padStart(2, '0') : '00';
                const minute = fechaString.length > 4 ? String(fechaString[4]).padStart(2, '0') : '00';
                return `${day}/${month}/${year} ${hour}:${minute}`;
            }

            // Si es string normal
            let normalizedStr = fechaString.toString();
            // Evitar problemas de timezone cortando todo después de los segundos o antes del offset
            if (normalizedStr.includes('T')) {
                // Eliminar posibles milisegundos y Z para que JS lo tome como local en lugar de UTC
                normalizedStr = normalizedStr.split('.')[0].replace('Z', '');
            } else if (normalizedStr.includes(' ')) {
                normalizedStr = normalizedStr.replace(' ', 'T'); // Forzar formato ISO compatible
            }

            // Para parseo manual seguro (100% libre de timezones):
            const partesT = normalizedStr.split('T');
            if (partesT.length === 2) {
                const [fecha, hora] = partesT;
                const [yyyy, mm, dd] = fecha.split('-');
                let hm = '00:00';
                if (hora) {
                    const horaPartes = hora.split(':');
                    if (horaPartes.length >= 2) {
                        hm = `${horaPartes[0].padStart(2, '0')}:${horaPartes[1].padStart(2, '0')}`;
                    }
                }
                return `${dd}/${mm}/${yyyy} ${hm}`;
            }

            // Fallback al objeto Date si el parseo manual falla
            fechaParsed = new Date(normalizedStr);
            if (isNaN(fechaParsed.getTime())) {
                console.warn("Fecha inválida en ventas:", fechaString);
                return fechaString; // Devolver original si es inválido
            }

            return fechaParsed.toLocaleString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            console.error("Error parseando fecha:", fechaString, e);
            return fechaString;
        }
    }

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let detalleItems = [];
    let pagosMixtos = []; // Nueva lista para pagos mixtos
    let todosLosProveedores = [];
    let todosLosProductos = [];
    let editIndex = -1; // Index of item being edited inline
    let originalItemData = null; // Backup of original data for cancel

    function calcularTotalGenerico(items) {
        let t = 0;
        if (!items || items.length === 0) return 0;
        items.forEach(item => {
            t += (item.cantidad * item.precioUnitario);
        });
        return t;
    }

    // ===============================
    // SELECTORES
    // ===============================
    const compraForm = document.getElementById('compra-form');
    const generalMessageCompra = document.getElementById('form-general-message-compra');

    const proveedorSearchInput = document.getElementById('compra-proveedor-search');
    const proveedorHiddenInput = document.getElementById('compra-proveedor-id-hidden');
    const proveedorResultsContainer = document.getElementById('compra-proveedor-results');
    const proveedorError = document.getElementById('errorCompraProveedor');

    const productoSearchInput = document.getElementById('compra-producto-search');
    const productoHiddenInput = document.getElementById('compra-producto-id-hidden');
    const productoResultsContainer = document.getElementById('compra-producto-results');
    const productoError = document.getElementById('errorCompraProducto');

    const detalleTemporalTabla = document.getElementById('compra-detalle-temporal');
    const totalDisplay = document.getElementById('compra-total-display');
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    const historialTabla = document.getElementById('compras-historial-tabla-body');
    const historialPrevPageBtn = document.getElementById('compras-prev-page');
    const historialNextPageBtn = document.getElementById('compras-next-page');
    const historialPageInfo = document.getElementById('compras-page-info');
    const historialTableHeaders = document.querySelectorAll('#compras-section .data-table th[data-sort-by]');
    const mainContent = document.querySelector('.main-content');
    const comprasSearchInput = document.getElementById('compras-search-input');
    const filtroEstado = document.getElementById('compras-filtro-estado');
    const filtroProveedor = document.getElementById('compras-filtro-proveedor');
    const btnSortFecha = document.getElementById('compras-sort-fecha');
    const btnSortTotal = document.getElementById('compras-sort-total');
    const sortButtons = [btnSortFecha, btnSortTotal].filter(Boolean);

    let historialCurrentPage = 0;
    let historialTotalPages = 1;
    const historialItemsPerPage = 10;
    let historialSortField = 'fecha';
    let historialSortDirection = 'desc';

    // Variable para rastrear el proveedor anterior
    let previousProveedorId = null;
    let previousProveedorNombre = '';

    // ==========================================================
    // FUNCIONES AUXILIARES
    // ==========================================================

    // Función para establecer la fecha actual en el campo de fecha
    function establecerFechaActual() {
        const fechaInput = document.getElementById('compra-fecha');
        if (fechaInput) {
            fechaInput.addEventListener('change', () => {
                if (window.limpiarErroresInline) window.limpiarErroresInline('compra-fecha');
            });
            if (!fechaInput.value) {
                const hoy = new Date();
                const year = hoy.getFullYear();
                const month = String(hoy.getMonth() + 1).padStart(2, '0');
                const day = String(hoy.getDate()).padStart(2, '0');
                fechaInput.value = `${year}-${month}-${day}`;
            }
        }
    }

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS
    // ==========================================================

    async function loadProveedoresParaCompra() {
        if (!proveedorSearchInput) return;
        try {
            const response = await fetch(API_PROVEEDORES_URL);
            if (!response.ok) throw new Error('Error al cargar proveedores');
            todosLosProveedores = await response.json();
            console.log("Proveedores actualizados en Compras:", todosLosProveedores.length);
            poblarDropdownFiltroProveedor();
        } catch (error) {
            console.error(error);
            proveedorSearchInput.placeholder = "Error al cargar proveedores";
        }
    }

    function poblarDropdownFiltroProveedor() {
        if (!filtroProveedor || !todosLosProveedores) return;
        const seleccionado = filtroProveedor.value;
        filtroProveedor.innerHTML = '<option value="">🚚 Proveedor: Todos</option>';

        const proveedoresOrdenados = [...todosLosProveedores].sort((a, b) => {
            return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        });

        proveedoresOrdenados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre;
            filtroProveedor.appendChild(opt);
        });
        if (seleccionado) filtroProveedor.value = seleccionado;
    }

    async function fetchAllProductosParaCompra() {
        if (!productoSearchInput) return;
        todosLosProductos = [];

        const idProveedorStr = proveedorHiddenInput ? proveedorHiddenInput.value : '';
        const urlReq = idProveedorStr ? `${API_PRODUCTOS_URL_SELECT_ALL}?idProveedor=${idProveedorStr}` : API_PRODUCTOS_URL_SELECT_ALL;

        try {
            const response = await fetch(urlReq);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');
            todosLosProductos = await response.json();

            if (todosLosProductos.length > 0) {
                productoSearchInput.placeholder = "Buscar producto...";
                productoSearchInput.disabled = false;
            } else {
                productoSearchInput.placeholder = "No hay productos registrados";
            }
        } catch (error) {
            console.error(error);
            productoSearchInput.placeholder = "Error al cargar productos";
        }
    }

    // ==========================================================
    // NAVEGACIÓN POR TECLADO PARA SEARCHES
    // ==========================================================
    let proveedorSelectedIndex = -1;
    let productoSelectedIndex = -1;

    function getResultItems(container) {
        const items = container.querySelectorAll('.product-result-item');
        return Array.from(items).filter(item => !item.textContent.includes('No se encontraron'));
    }

    function updateSelection(items, selectedIndex) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === selectedIndex);
        });
        if (selectedIndex >= 0 && items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function handleSearchKeyboard(e, searchInput, resultsContainer, selectedIndexRef, onSelect) {
        const items = getResultItems(resultsContainer);
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            if (resultsContainer.style.display === 'none') {
                resultsContainer.style.display = 'block';
            }
            selectedIndexRef.current = Math.min(selectedIndexRef.current + 1, items.length - 1);
            updateSelection(items, selectedIndexRef.current);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0);
            updateSelection(items, selectedIndexRef.current);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (selectedIndexRef.current >= 0 && items[selectedIndexRef.current]) {
                const selectedItem = items[selectedIndexRef.current];
                const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                selectedItem.dispatchEvent(clickEvent);
                onSelect();
            }
        }
    }

    // ==========================================================
    // BUSCADOR PROVEEDORES
    // ==========================================================

    // Función helper para capitalizar nombres (Title Case)
    function capitalizarNombre(nombre) {
        if (!nombre) return '';
        return nombre
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function renderResultadosProveedores(proveedores) {
        proveedorSelectedIndex = -1;
        if (proveedores.length === 0) {
            proveedorResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron proveedores</div>';
        } else {
            proveedorResultsContainer.innerHTML = proveedores.map(p => {
                return `<div class="product-result-item" data-id="${p.id}">${capitalizarNombre(p.nombre)}</div>`;
            }).join('');
        }
        proveedorResultsContainer.style.display = 'block';
    }

    function filtrarProveedores() {
        const query = proveedorSearchInput.value.toLowerCase();
        const proveedoresFiltrados = todosLosProveedores
            .filter(p => p.nombre.toLowerCase().includes(query))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenar alfabéticamente
        renderResultadosProveedores(proveedoresFiltrados);
    }

    function seleccionarProveedor(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const proveedorIdNum = parseInt(target.dataset.id, 10);
        if (isNaN(proveedorIdNum)) return;

        const proveedor = todosLosProveedores.find(p => p.id === proveedorIdNum);

        if (proveedor) {
            const newProveedorId = proveedor.id.toString();
            const newProveedorNombre = capitalizarNombre(proveedor.nombre);

            // Verificar si hay productos en el detalle y si el proveedor es diferente
            if (detalleItems.length > 0 && previousProveedorId && newProveedorId !== previousProveedorId) {
                showConfirmationModal(
                    `Ya tienes ${detalleItems.length} producto${detalleItems.length > 1 ? 's' : ''} agregado${detalleItems.length > 1 ? 's' : ''}.\nCambiar de proveedor borrará el detalle actual.\n¿Deseas continuar?`,
                    () => {
                        // Usuario confirmó: limpiar detalle y cambiar proveedor
                        detalleItems = [];
                        renderDetalleTemporal();
                        proveedorSearchInput.value = newProveedorNombre;
                        proveedorHiddenInput.value = newProveedorId;
                        previousProveedorId = newProveedorId;
                        previousProveedorNombre = newProveedorNombre;
                        fetchAllProductosParaCompra();
                        proveedorResultsContainer.style.display = 'none';
                        if (window.limpiarErroresInline) window.limpiarErroresInline('compra-proveedor-search');
                        productoSearchInput.value = '';
                        productoHiddenInput.value = '';
                    },
                    () => {
                        // Usuario canceló: revertir al proveedor anterior
                        proveedorSearchInput.value = previousProveedorNombre;
                        proveedorHiddenInput.value = previousProveedorId;
                        proveedorResultsContainer.style.display = 'none';
                    }
                );
            } else {
                // No hay productos o es el mismo proveedor: cambiar sin confirmación
                proveedorSearchInput.value = newProveedorNombre;
                proveedorHiddenInput.value = newProveedorId;
                previousProveedorId = newProveedorId;
                previousProveedorNombre = newProveedorNombre;
                fetchAllProductosParaCompra();
                proveedorResultsContainer.style.display = 'none';
                if (window.limpiarErroresInline) window.limpiarErroresInline('compra-proveedor-search');
                productoSearchInput.value = '';
                productoHiddenInput.value = '';
            }
        }
    }

    if (proveedorSearchInput) {
        proveedorSearchInput.addEventListener('input', () => {
            proveedorHiddenInput.value = '';
            if (window.checkMaxLength) window.checkMaxLength(proveedorSearchInput, 150);
            else if (window.limpiarErroresInline) window.limpiarErroresInline('compra-proveedor-search');
            filtrarProveedores();
            if (proveedorSearchInput.value.trim() === '') {
                todosLosProductos = [];
                productoSearchInput.value = '';
                productoHiddenInput.value = '';
                productoSearchInput.placeholder = "Seleccione un proveedor primero";
                productoSearchInput.disabled = true;
            }
        });
        proveedorSearchInput.addEventListener('focus', filtrarProveedores);
        proveedorSearchInput.addEventListener('click', function () {
            if (this.value) {
                this.select();
            }
            filtrarProveedores();
        });
        proveedorSearchInput.addEventListener('keydown', (e) => {
            const indexRef = { current: proveedorSelectedIndex };
            handleSearchKeyboard(e, proveedorSearchInput, proveedorResultsContainer, indexRef, () => {
                proveedorSelectedIndex = -1;
                productoSearchInput.focus();
            });
            proveedorSelectedIndex = indexRef.current;
        });
    }
    if (proveedorResultsContainer) proveedorResultsContainer.addEventListener('click', seleccionarProveedor);

    // ==========================================================
    // BUSCADOR PRODUCTOS
    // ==========================================================

    function renderResultadosProductos(productos) {
        productoSelectedIndex = -1;
        if (productos.length === 0) {
            productoResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
        } else {
            productoResultsContainer.innerHTML = productos.map(p => {
                const stock = p.stockActual ?? 0;
                const stockColor = stock > 10 ? '#28a745' : stock > 0 ? '#e67e22' : '#dc3545';
                return `<div class="product-result-item prod-result-rich" data-id="${p.idProducto}">
                    <div class="prod-info-left">
                        <div class="prod-nombre">${capitalizarNombre(p.nombreProducto)}</div>
                        <div class="prod-stock" style="color:${stockColor}">Stock: ${stock}</div>
                    </div>
                    <div class="prod-info-right">
                        <div class="prod-costo">Costo: $${formatoMoneda.format(p.ultimoCosto ?? 0)}</div>
                        <div class="prod-venta">Venta: $${formatoMoneda.format(p.precioVenta ?? 0)}</div>
                    </div>
                </div>`;
            }).join('');
        }
        productoResultsContainer.style.display = 'block';
    }

    function filtrarProductos() {
        const query = productoSearchInput.value.toLowerCase();
        const productosFiltrados = todosLosProductos
            .filter(p => p.nombreProducto.toLowerCase().includes(query))
            .sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto)); // Ordenar alfabéticamente
        renderResultadosProductos(productosFiltrados);
    }

    function seleccionarProducto(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const productoIdNum = parseInt(target.dataset.id, 10);
        if (isNaN(productoIdNum)) return;

        const producto = todosLosProductos.find(p => p.idProducto === productoIdNum);

        if (producto) {
            if (detalleItems.some(item => item.idProducto === productoIdNum)) {
                if (productoError) productoError.textContent = 'Este producto ya está en el detalle.';
                productoResultsContainer.style.display = 'none';
                return;
            }
            if (window.limpiarErroresInline) window.limpiarErroresInline('compra-producto-search');
            if (errorDetalleGeneral) errorDetalleGeneral.textContent = '';

            detalleItems.push({
                idProducto: productoIdNum,
                nombreProducto: capitalizarNombre(producto.nombreProducto),
                cantidad: 1,
                precioUnitario: producto.ultimoCosto ?? 0,
                nuevoPrecioVenta: producto.precioVenta ?? 0
            });

            renderDetalleTemporal();
            productoSearchInput.value = '';
            productoHiddenInput.value = '';
            productoResultsContainer.style.display = 'none';
            productoSearchInput.focus();
        }
    }

    if (productoSearchInput) {
        productoSearchInput.addEventListener('input', () => {
            productoHiddenInput.value = '';
            if (window.checkMaxLength) window.checkMaxLength(productoSearchInput, 70);
            else if (window.limpiarErroresInline) window.limpiarErroresInline('compra-producto-search');
            filtrarProductos();
        });
        productoSearchInput.addEventListener('focus', filtrarProductos);
        productoSearchInput.addEventListener('click', function () {
            if (this.value) {
                this.select();
            }
            filtrarProductos();
        });
        productoSearchInput.addEventListener('keydown', (e) => {
            const indexRef = { current: productoSelectedIndex };
            handleSearchKeyboard(e, productoSearchInput, productoResultsContainer, indexRef, () => {
                productoSelectedIndex = -1;
            });
            productoSelectedIndex = indexRef.current;
        });
    }
    if (productoResultsContainer) productoResultsContainer.addEventListener('click', seleccionarProducto);

    document.addEventListener('click', function (event) {
        if (proveedorSearchInput && !proveedorSearchInput.contains(event.target) && proveedorResultsContainer && !proveedorResultsContainer.contains(event.target)) {
            proveedorResultsContainer.style.display = 'none';
        }
        if (productoSearchInput && !productoSearchInput.contains(event.target) && productoResultsContainer && !productoResultsContainer.contains(event.target)) {
            productoResultsContainer.style.display = 'none';
        }
    });

    // ===============================================
    // CARRITO COMPRAS
    // ===============================================

    // Función para auto-ocultar errores fue removida - los errores ahora persisten

    function renderDetalleTemporal() {
        if (!detalleTemporalTabla || !totalDisplay) return;
        detalleTemporalTabla.innerHTML = '';
        let totalCompra = 0;
        if (detalleItems.length === 0) {
            detalleTemporalTabla.innerHTML = '<tr><td colspan="6">Aún no has agregado productos.</td></tr>';
            totalDisplay.textContent = `$${formatoMoneda.format(0)}`;
            if (typeof renderPagosMixtos === 'function') renderPagosMixtos();
            return;
        }

        detalleItems.forEach((item, index) => {
            const subtotal = item.cantidad * item.precioUnitario;
            totalCompra += subtotal;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombreProducto}</td>
                <td class="col-num col-qty">
                    <div class="qty-stepper">
                        <button type="button" class="btn-qty btn-qty-minus" data-index="${index}">−</button>
                        <input type="number" id="compra-detalle-qty-${index}" class="qty-input" data-index="${index}" value="${item.cantidad}" min="1" max="999999" step="1" inputmode="numeric" oninput="window.checkMaxLength(this, 6)" onkeypress="return event.charCode >= 48 && event.charCode <= 57">
                        <button type="button" class="btn-qty btn-qty-plus" data-index="${index}">+</button>
                    </div>
                    <div class="error-message" id="error-compra-detalle-qty-${index}" style="margin-top: 4px; font-size: 0.75rem; text-align: center;"></div>
                </td>
                <td class="col-num">
                    <div class="input-money" style="position: relative;">
                        <span class="money-prefix">$</span>
                        <input type="text" id="compra-detalle-costo-${index}" class="inline-edit-input" data-index="${index}" data-field="precioUnitario" value="${formatoMoneda.format(item.precioUnitario)}" oninput="window.checkMaxLength(this, 10)" onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode === 46 || event.charCode === 44">
                    </div>
                    <div class="error-message" id="error-compra-detalle-costo-${index}" style="margin-top: 4px; font-size: 0.75rem; text-align: right;"></div>
                </td>
                <td class="col-num">
                    <div class="input-money" style="position: relative;">
                        <span class="money-prefix">$</span>
                        <input type="text" id="compra-detalle-venta-${index}" class="inline-edit-input" data-index="${index}" data-field="nuevoPrecioVenta" value="${formatoMoneda.format(item.nuevoPrecioVenta)}" oninput="window.checkMaxLength(this, 10)" onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode === 46 || event.charCode === 44">
                    </div>
                    <div class="error-message" id="error-compra-detalle-venta-${index}" style="margin-top: 4px; font-size: 0.75rem; text-align: right;"></div>
                </td>
                <td class="col-num" id="subtotal-cell-${index}">$${formatoMoneda.format(subtotal)}</td>
                <td>
                    <button type="button" class="btn-icon btn-delete-detalle btn-quitar-item" data-index="${index}" title="Quitar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            detalleTemporalTabla.appendChild(row);
        });
        totalDisplay.textContent = `$${formatoMoneda.format(totalCompra)}`;
        if (typeof renderPagosMixtos === 'function') renderPagosMixtos();

        function actualizarTotales(idx) {
            const subtotal = detalleItems[idx].cantidad * detalleItems[idx].precioUnitario;
            const subtotalCell = document.getElementById(`subtotal-cell-${idx}`);
            if (subtotalCell) subtotalCell.textContent = `$${formatoMoneda.format(subtotal)}`;
            let newTotal = 0;
            detalleItems.forEach(item => newTotal += item.cantidad * item.precioUnitario);
            totalDisplay.textContent = `$${formatoMoneda.format(newTotal)}`;
            if (typeof renderPagosMixtos === 'function') renderPagosMixtos();
        }

        document.querySelectorAll('.btn-quitar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.currentTarget.dataset.index);
                detalleItems.splice(indexToRemove, 1);
                renderDetalleTemporal();
            });
        });

        document.querySelectorAll('.btn-qty-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                if (detalleItems[idx].cantidad <= 1) return;
                detalleItems[idx].cantidad--;
                const qtyInput = detalleTemporalTabla.querySelector(`.qty-input[data-index="${idx}"]`);
                if (qtyInput) qtyInput.value = detalleItems[idx].cantidad;
                actualizarTotales(idx);
            });
        });

        document.querySelectorAll('.btn-qty-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                if (detalleItems[idx].cantidad >= 999999) return;
                detalleItems[idx].cantidad++;
                const qtyInput = detalleTemporalTabla.querySelector(`.qty-input[data-index="${idx}"]`);
                if (qtyInput) qtyInput.value = detalleItems[idx].cantidad;
                actualizarTotales(idx);
            });
        });

        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.dataset.lastValid = e.target.value;
            });
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseInt(e.target.value);
                if (val > 999999) {
                    e.target.value = e.target.dataset.lastValid || '';
                    return;
                }
                if (!isNaN(val) && val >= 1) {
                    e.target.dataset.lastValid = e.target.value;
                    detalleItems[idx].cantidad = val;
                    actualizarTotales(idx);
                }
            });
            input.addEventListener('blur', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (isNaN(parseInt(e.target.value)) || parseInt(e.target.value) < 1) {
                    e.target.value = detalleItems[idx].cantidad;
                }
            });
        });

        document.querySelectorAll('.inline-edit-input').forEach(input => {
            input.addEventListener('focus', (e) => {
                const rawVal = parsearMoneda(e.target.value);
                e.target.value = isNaN(rawVal) ? '' : rawVal;
                e.target.dataset.lastValid = e.target.value;
                e.target.select();
            });
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                let val = parsearMoneda(e.target.value);
                if (!isNaN(val) && val >= 0) {
                    if (val > 9999999999) {
                        e.target.value = e.target.dataset.lastValid || '';
                        return;
                    }
                    e.target.dataset.lastValid = e.target.value;
                    detalleItems[idx][field] = val;
                    actualizarTotales(idx);
                }
            });
            input.addEventListener('blur', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                const val = parsearMoneda(e.target.value);
                if (!isNaN(val) && val >= 0) {
                    detalleItems[idx][field] = val;
                    e.target.value = formatoMoneda.format(val);
                } else {
                    e.target.value = formatoMoneda.format(detalleItems[idx][field]);
                }
                actualizarTotales(idx);
            });
        });
    }

    if (compraForm) {
        compraForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('compra-');
            if (generalMessageCompra) { generalMessageCompra.textContent = ''; generalMessageCompra.classList.remove('error', 'success'); }

            let isValid = true;
            const fecha = document.getElementById('compra-fecha').value;
            const idProveedor = proveedorHiddenInput.value;

            if (!fecha) { if(window.mostrarErrorInline) window.mostrarErrorInline('compra-fecha', 'La fecha es obligatoria.'); isValid = false; }
            if (!idProveedor) { if(window.mostrarErrorInline) window.mostrarErrorInline('compra-proveedor-search', 'El proveedor es obligatorio.'); isValid = false; }
            if (detalleItems.length === 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('compra-producto-search', 'Debe agregar al menos un producto al detalle.'); isValid = false; }

            // Auto-absorber cuotas sueltas si el usuario tipeó el pago pero no tocó el botón +
            const selectMetodoSuelto = document.getElementById('compra-metodo-pago');
            const inputMontoSuelto = document.getElementById('compra-pago-monto');
            const montoSueltoValue = inputMontoSuelto && inputMontoSuelto.value ? parseFloat(inputMontoSuelto.value.replace(/\./g, '').replace(',', '.')) : 0;
            if (selectMetodoSuelto && inputMontoSuelto && selectMetodoSuelto.value && montoSueltoValue > 0) {
                let montoAingresar = montoSueltoValue;
                let montoFisicoEntregado = montoSueltoValue;
                let vueltoCalculado = 0;

                const totalC = calcularTotalGenerico(detalleItems);
                let currentPagos = 0;
                pagosMixtos.forEach(p => currentPagos += parseFloat(p.importe));
                let saldoPendiente = totalC - currentPagos;

                if (montoAingresar > saldoPendiente + 0.05) {
                    vueltoCalculado = montoAingresar - saldoPendiente;
                    mostrarVueltoToast(vueltoCalculado);
                    montoAingresar = saldoPendiente;
                }

                if (montoAingresar > 0) {
                    pagosMixtos.push({
                        idMetodoPago: parseInt(selectMetodoSuelto.value),
                        nombreMetodo: selectMetodoSuelto.options[selectMetodoSuelto.selectedIndex]?.text,
                        importe: montoAingresar,
                        montoEntregado: montoFisicoEntregado,
                        vuelto: vueltoCalculado,
                        estadoPago: 'PAGADO',
                        fechaVencimientoPago: null
                    });
                }
                selectMetodoSuelto.value = '';
                inputMontoSuelto.value = '';
                renderPagosMixtos();
            }

            // Validar pagos mixtos (auto-ajuste si exceden por quita de productos)
            const totalCompraActual = calcularTotalGenerico(detalleItems);
            let totalPagosIngresados = 0;
            pagosMixtos.forEach(p => totalPagosIngresados += parseFloat(p.importe));

            if (totalPagosIngresados > totalCompraActual + 0.05) {
                let exceso = totalPagosIngresados - totalCompraActual;
                for (let i = pagosMixtos.length - 1; i >= 0; i--) {
                    if (exceso <= 0.05) break;
                    let p = pagosMixtos[i];
                    if (p.importe > exceso) {
                        p.importe -= exceso;
                        exceso = 0;
                    } else {
                        exceso -= p.importe;
                        pagosMixtos.splice(i, 1);
                    }
                }
                renderPagosMixtos();
                totalPagosIngresados = totalCompraActual;

                const errorEl = document.getElementById('errorCompraPagoMonto');
                if (errorEl) errorEl.textContent = '';
            }

            // Validar saldo pendiente (Vencimiento)
            const diff = totalCompraActual - totalPagosIngresados;
            const scheduledDateInput = document.getElementById('compra-fecha-programada-pago');
            let fechaVencimientoGlobal = null;
            if (diff > 0.05 && isValid) {
                if (!scheduledDateInput || !scheduledDateInput.value) {
                    if (window.mostrarErrorInline) window.mostrarErrorInline('compra-fecha-programada-pago', 'Debe seleccionar una fecha de pago para el saldo pendiente.');
                    return;
                } else {
                    const hoyStr = new Date().toISOString().split('T')[0];
                    if (scheduledDateInput.value < hoyStr) {
                        if (window.mostrarErrorInline) window.mostrarErrorInline('compra-fecha-programada-pago', 'La fecha de pago programada no puede ser en el pasado.');
                        return;
                    }
                }

                // Extraer la fecha para la compra entera
                fechaVencimientoGlobal = scheduledDateInput.value;
            }

            if (!isValid) {
                return;
            }

            showConfirmationModal("¿Estás seguro de que deseas registrar esta compra?", async () => {
                const compraRequestDTO = {
                    fecha: fecha,
                    idProveedor: parseInt(idProveedor),
                    detalleCompras: detalleItems,
                    pagos: pagosMixtos, // Ahora enviamos la lista de pagos
                    fechaVencimientoPago: fechaVencimientoGlobal // GUARDAR A NIVEL COMPRA
                };
                try {
                    const response = await fetch(API_COMPRAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(compraRequestDTO)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
                    }



                    // Mostrar mensaje de éxito estándar
                    if (generalMessageCompra) {
                        generalMessageCompra.textContent = '¡Compra registrada exitosamente!';
                        generalMessageCompra.classList.remove('error');
                        generalMessageCompra.classList.add('success');
                        // Auto-ocultar después de 4 segundos
                        setTimeout(() => {
                            generalMessageCompra.textContent = '';
                            generalMessageCompra.className = 'form-message';
                        }, 4000);
                    }

                    compraForm.reset();
                    detalleItems = [];
                    pagosMixtos = []; // IMPORTANTE: vaciar el array local de pagos
                    renderDetalleTemporal(); // Esto autodispara renderPagosMixtos
                    proveedorSearchInput.value = '';
                    proveedorHiddenInput.value = '';
                    previousProveedorId = null;
                    previousProveedorNombre = '';
                    productoSearchInput.value = '';
                    productoHiddenInput.value = '';
                    todosLosProductos = [];
                    if (productoSearchInput) { productoSearchInput.placeholder = "Seleccione un proveedor primero"; productoSearchInput.disabled = true; }

                    const scheduledInputReset = document.getElementById('compra-fecha-programada-pago');
                    if (scheduledInputReset) {
                        scheduledInputReset.value = '';
                        scheduledInputReset.style.border = '1px solid #ced4da';
                    }

                    await new Promise(resolve => setTimeout(resolve, 250));
                    historialCurrentPage = 0;
                    loadComprasHistorial();
                    // Permanece en la sección de registro para facilitar múltiples registros

                    document.dispatchEvent(new Event('productosActualizados'));
                    document.dispatchEvent(new Event('comprasActualizadas'));

                } catch (error) {
                    console.error('Error al registrar la compra:', error);
                    if (generalMessageCompra) { generalMessageCompra.textContent = `Error al registrar: ${error.message}`; generalMessageCompra.classList.add('error'); }
                }
            });
        });
    }

    // ===============================================
    // HISTORIAL
    // ===============================================

    async function loadComprasHistorial() {
        if (!historialTabla || !mainContent) return;
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        historialTabla.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = historialSortField ? `&sort=${historialSortField},${historialSortDirection}` : '';

            // Incluir búsqueda si hay texto
            const searchText = comprasSearchInput ? comprasSearchInput.value.trim() : '';
            const searchParam = searchText ? `&search=${encodeURIComponent(searchText)}` : '';

            // Incluir filtro de fechas si están seleccionadas
            const fechaInicioEl = document.getElementById('compras-fecha-inicio');
            const fechaFinEl = document.getElementById('compras-fecha-fin');
            const inicioVal = fechaInicioEl ? fechaInicioEl.value : '';
            const finVal = fechaFinEl ? fechaFinEl.value : '';
            const fechaParam = (inicioVal && finVal) ? `&inicio=${inicioVal}&fin=${finVal}` : '';

            // Filtro por estado de pago
            const estadoVal = filtroEstado ? filtroEstado.value : '';
            const estadoParam = estadoVal ? `&estadoPago=${estadoVal}` : '';

            // Filtro por proveedor
            const proveedorVal = filtroProveedor ? filtroProveedor.value : '';
            const proveedorParam = proveedorVal ? `&proveedorId=${proveedorVal}` : '';

            const url = `${API_COMPRAS_URL}?page=${historialCurrentPage}&size=${historialItemsPerPage}${sortParam}${searchParam}${fechaParam}${estadoParam}${proveedorParam}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const pageData = await response.json();
            historialTotalPages = pageData.totalPages;

            renderComprasTabla(pageData.content);
            updateHistorialPaginationControls();
            updateHistorialSortIndicators();
            requestAnimationFrame(() => { window.scrollTo(0, scrollPosition); historialTabla.classList.remove('loading'); });
        } catch (error) {
            console.error('Error al cargar el historial de compras:', error);
            historialTabla.innerHTML = `<tr><td colspan="6">Error al cargar historial.</td></tr>`;
            historialTabla.classList.remove('loading');
        }
    }

    function renderComprasTabla(compras) {
        if (!historialTabla) return;
        historialTabla.innerHTML = '';
        if (compras.length === 0) { historialTabla.innerHTML = '<tr><td colspan="6">No hay compras registradas.</td></tr>'; return; }

        compras.forEach(compra => {
            // Mostrar máximo 2 productos, si hay más agregar "+X más..."
            let productosTexto = 'Sin productos';
            let costosTexto = 'N/A';

            if (compra.productosComprados && compra.productosComprados.length > 0) {
                const productos = compra.productosComprados;
                const maxProductos = 3;

                if (productos.length <= maxProductos) {
                    // Mostrar todos los productos en una línea separados por coma
                    productosTexto = productos.map(p => `${p.nombreProducto} (x${p.cantidad})`).join(' · ');
                    costosTexto = productos.map(p => `$${formatoMoneda.format(p.precioUnitario || 0)}`).join(' · ');
                } else {
                    // Mostrar solo los primeros + contador, en una línea
                    const productosAMostrar = productos.slice(0, maxProductos);
                    const productosRestantes = productos.length - maxProductos;
                    productosTexto = productosAMostrar.map(p => `${p.nombreProducto} (x${p.cantidad})`).join(' · ') +
                        ` <span style="color: #666; font-style: italic;">(+${productosRestantes} más...)</span>`;
                    costosTexto = productosAMostrar.map(p => `$${formatoMoneda.format(p.precioUnitario || 0)}`).join(' · ') +
                        ' <span style="color: #666;">...</span>';
                }
            }
            const totalFormateado = `$${formatoMoneda.format(compra.total || 0)}`;
            let fechaFormateada = formatearFechaHora(compra.fecha);

            let estadoBadge = '';
            if (compra.estadoPago === 'PENDIENTE') {
                // Formatear fecha de vencimiento
                let fechaPagoTexto = 'No definida';
                if (compra.fechaVencimientoPago) {
                    const parts = compra.fechaVencimientoPago.split('-');
                    fechaPagoTexto = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                const montoPendienteTexto = `$${formatoMoneda.format(compra.montoPendiente || 0)}`;

                estadoBadge = `<div class="pendiente-popover-wrapper">` +
                    `<span class="status-badge pending" style="background-color: #ffebee; color: #d32f2f; cursor: pointer;">Pendiente</span>` +
                    `<div class="pendiente-popover">` +
                    `<div class="popover-line"><strong>Fecha de pago:</strong> ${fechaPagoTexto}</div>` +
                    `<div class="popover-line"><strong>Monto:</strong> ${montoPendienteTexto}</div>` +
                    `</div></div>`;
            } else {
                estadoBadge = '<span class="status-badge success" style="background-color: #e8f5e9; color: #2e7d32;">Pagado</span>';
            }

            const row = `
                <tr style="vertical-align: middle;">
                    <td style="white-space: nowrap;">${fechaFormateada}</td>
                    <td>${compra.nombreProveedor || 'N/A'}</td>
                    <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${productosTexto}</td>
                    <td class="col-num" style="white-space: nowrap; text-align: right; padding-right: 20px;">${totalFormateado}</td>
                    <td style="white-space: nowrap; text-align: center;">${estadoBadge}</td>
                    <td style="white-space: nowrap; text-align: center;">
                        ${compra.estadoPago === 'PENDIENTE' ? `
                        <button type="button" class="btn-icon btn-pay-compra" onclick="abrirModalPagarCompra(${compra.id})" title="Pasar a Pagado" style="color: #4CAF50; margin-right: 5px;">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        <button type="button" class="btn-icon btn-view-compra" onclick="mostrarDetalleCompra(${compra.id})" title="Ver Detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>`;
            historialTabla.innerHTML += row;
        });
    }

    function updateHistorialPaginationControls() {
        if (!historialPageInfo) return;
        historialPageInfo.textContent = `Página ${historialCurrentPage + 1} de ${historialTotalPages || 1}`;
        historialPrevPageBtn.disabled = (historialCurrentPage === 0);
        historialNextPageBtn.disabled = (historialCurrentPage + 1 >= historialTotalPages);
    }

    if (historialPrevPageBtn) historialPrevPageBtn.addEventListener('click', (e) => { e.preventDefault(); if (historialCurrentPage > 0) { historialCurrentPage--; loadComprasHistorial(); } });
    if (historialNextPageBtn) historialNextPageBtn.addEventListener('click', (e) => { e.preventDefault(); if (historialCurrentPage + 1 < historialTotalPages) { historialCurrentPage++; loadComprasHistorial(); } });

    function handleHistorialSortClick(event) {
        event.preventDefault();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');
        if (!newSortField) return;
        if (historialSortField === newSortField) { historialSortDirection = historialSortDirection === 'asc' ? 'desc' : 'asc'; } else { historialSortField = newSortField; historialSortDirection = 'asc'; }
        historialCurrentPage = 0;
        loadComprasHistorial();
    }

    function updateHistorialSortIndicators() {
        historialTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';
            if (th.getAttribute('data-sort-by') === historialSortField) {
                th.classList.add(`sort-${historialSortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${historialSortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
        updateSortButtonsState();
    }

    function updateSortButtonsState() {
        sortButtons.forEach(btn => {
            const field = btn.getAttribute('data-sort-field');
            const arrow = btn.querySelector('.sort-arrow');
            if (field === historialSortField) {
                btn.classList.add('active');
                if (arrow) {
                    arrow.className = `fas fa-sort-${historialSortDirection === 'asc' ? 'up' : 'down'} sort-arrow`;
                }
            } else {
                btn.classList.remove('active');
                if (arrow) arrow.className = 'fas fa-sort sort-arrow';
            }
        });
    }

    function handleSortBtnClick(field) {
        if (historialSortField === field) {
            historialSortDirection = historialSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            historialSortField = field;
            historialSortDirection = 'desc';
        }
        historialCurrentPage = 0;
        loadComprasHistorial();
    }

    historialTableHeaders.forEach(header => { header.addEventListener('click', handleHistorialSortClick); });
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => handleSortBtnClick(btn.getAttribute('data-sort-field')));
    });

    // ==========================================================
    // FUNCIÓN LIMPIAR FORMULARIO
    // ==========================================================
    function limpiarFormularioCompra() {
        // Limpiar campos del formulario
        if (compraForm) compraForm.reset();

        // Limpiar errores
        if (window.limpiarTodosErroresInline) {
            window.limpiarTodosErroresInline('compra-');
        } else {
            document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
        }
        if (generalMessageCompra) {
            generalMessageCompra.textContent = '';
            generalMessageCompra.classList.remove('error', 'success');
        }

        // Limpiar inputs ocultos y búsquedas
        proveedorSearchInput.value = '';
        proveedorHiddenInput.value = '';
        productoSearchInput.value = '';
        productoHiddenInput.value = '';

        // Limpiar detalle de compra
        detalleItems = [];
        renderDetalleTemporal();

        // Resetear proveedor anterior
        previousProveedorId = null;
        previousProveedorNombre = '';

        // Deshabilitar búsqueda de productos
        productoSearchInput.disabled = true;
        productoSearchInput.placeholder = "Seleccione un proveedor primero";
        todosLosProductos = [];

        // Resetear método de pago e input
        const metodoPagoSelect = document.getElementById('compra-metodo-pago');
        if (metodoPagoSelect) metodoPagoSelect.selectedIndex = 0;

        const inputMonto = document.getElementById('compra-pago-monto');
        if (inputMonto) inputMonto.value = '';

        pagosMixtos = [];
        renderPagosMixtos();

        // Establecer fecha actual nuevamente
        establecerFechaActual();
    }

    // Event listener para el botón limpiar
    const btnLimpiarForm = document.getElementById('limpiar-form-compra');
    if (btnLimpiarForm) {
        btnLimpiarForm.addEventListener('click', limpiarFormularioCompra);
    }

    // ==========================================================
    // LÓGICA DE MÉTODO DE PAGO (Campos condicionales)
    // ==========================================================
    const metodoPagoSelect = document.getElementById('compra-metodo-pago');
    const tipoTarjetaContainer = document.getElementById('compra-tipo-tarjeta-container');
    const inputMontoRealTime = document.getElementById('compra-pago-monto');

    if (inputMontoRealTime) {
        inputMontoRealTime.addEventListener('input', () => {
            // Se quitó limpiarErroresInline porque checkMaxLength ya lo maneja,
            // si no, el error de límite de caracteres se borra instantáneamente.
            validarEfectivoEnTiempoReal();
        });
    }
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', () => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('compra-metodo-pago');
            validarEfectivoEnTiempoReal();
        });
    }

    /**
     * Cargar métodos de pago activos desde la API
     */
    async function cargarMetodosPagoCompra() {
        try {
            const response = await fetch('/api/metodos-pago/activos');
            if (!response.ok) throw new Error('Error al cargar métodos de pago');

            const metodos = await response.json();

            if (metodoPagoSelect) {
                metodoPagoSelect.innerHTML = '<option value="">Seleccionar método</option>';
                metodos.forEach(metodo => {
                    // Compras: mostrar todos EXCEPTO "Efectivo" simple
                    if (metodo.nombre.trim().toLowerCase() !== 'efectivo') {
                        const option = document.createElement('option');
                        option.value = metodo.idMetodoPago;
                        option.textContent = metodo.nombre;
                        option.dataset.requiereExtra = metodo.requiereDatosExtra;
                        option.dataset.nombre = metodo.nombre;
                        metodoPagoSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error cargando métodos de pago:', error);
        }
    }

    // Cargar métodos de pago al iniciar
    cargarMetodosPagoCompra();

    const estadoPagoSelect = document.getElementById('compra-estado-pago');
    const vencimientoContainer = document.getElementById('compra-vencimiento-container');

    if (estadoPagoSelect && vencimientoContainer) {
        estadoPagoSelect.addEventListener('change', function () {
            if (this.value === 'PENDIENTE') {
                vencimientoContainer.style.display = 'block';
            } else {
                vencimientoContainer.style.display = 'none';
                const vencimientoInput = document.getElementById('compra-fecha-vencimiento');
                if (vencimientoInput) vencimientoInput.value = '';
            }
        });
    }

    // ==========================================================
    // CARGA INICIAL Y EXPOSICIÓN
    // ==========================================================
    loadProveedoresParaCompra();
    loadComprasHistorial();
    renderDetalleTemporal();
    cargarMetodosPagoCompra();
    establecerFechaActual(); // Establecer fecha actual al cargar
    if (productoSearchInput) { productoSearchInput.disabled = true; productoSearchInput.placeholder = "Seleccione un proveedor primero"; }

    window.cargarDatosCompras = async function () {
        await fetchSaldoCajaActual();
        await loadProveedoresParaCompra();
        if (historialCurrentPage === 0) { loadComprasHistorial(); }
        const idProveedorSeleccionado = proveedorHiddenInput.value;
        if (idProveedorSeleccionado) { fetchAllProductosParaCompra(); }
        establecerFechaActual(); // Establecer fecha actual al recargar datos
    };

    // Escucha actualizaciones de productos (ej: stock, precios)
    document.addEventListener('productosActualizados', function () {
        console.log('Compras.js: Detectados cambios en productos/stock. Recargando...');
        window.cargarDatosCompras();
    });

    // Escucha actualizaciones de proveedores (nuevo proveedor creado)
    document.addEventListener('proveedoresActualizados', function () {
        console.log('Compras.js: Detectado cambio en proveedores. Recargando lista...');
        loadProveedoresParaCompra();
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de compras
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('compras-')) {
                container.style.display = 'none';
            }
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente
    window.showComprasSubsection = showSubsection;

    // ==========================================================
    // FILTRO POR FECHAS
    // ==========================================================

    const btnFiltrar = document.getElementById('compras-btn-filtrar');
    const btnLimpiarFiltro = document.getElementById('compras-btn-limpiar-filtro');
    const btnExportarPdf = document.getElementById('compras-btn-exportar-pdf');
    const fechaInicio = document.getElementById('compras-fecha-inicio');
    const fechaFin = document.getElementById('compras-fecha-fin');
    const filtroError = document.getElementById('compras-filtro-error');

    // Función helper para mostrar mensajes de error inline
    function mostrarErrorFiltro(mensaje) {
        if (filtroError) {
            filtroError.textContent = mensaje;
            filtroError.style.display = 'block';
        }
    }

    function ocultarErrorFiltro() {
        if (filtroError) {
            filtroError.style.display = 'none';
            filtroError.textContent = '';
        }
    }

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', filtrarComprasPorFecha);
    }

    if (btnLimpiarFiltro) {
        btnLimpiarFiltro.addEventListener('click', limpiarFiltroFechas);
    }

    if (btnExportarPdf) {
        btnExportarPdf.addEventListener('click', exportarPdfCompras);
    }

    // Ocultar error cuando el usuario modifica las fechas
    if (fechaInicio) {
        fechaInicio.addEventListener('change', ocultarErrorFiltro);
    }
    if (fechaFin) {
        fechaFin.addEventListener('change', ocultarErrorFiltro);
    }

    // ==========================================================
    // FILTRO POR BÚSQUEDA (BACKEND)
    // ==========================================================

    function filtrarComprasPorBusqueda() {
        historialCurrentPage = 0; // Volver a la primera página al buscar
        loadComprasHistorial();
    }

    async function filtrarComprasPorFecha() {
        const inicio = fechaInicio.value;
        const fin = fechaFin.value;

        if (!inicio || !fin) {
            mostrarErrorFiltro('Por favor selecciona ambas fechas');
            return;
        }

        const fechaInicioDate = new Date(inicio);
        const fechaFinDate = new Date(fin);

        if (fechaInicioDate > fechaFinDate) {
            mostrarErrorFiltro('La fecha de inicio no puede ser mayor que la fecha de fin');
            return;
        }

        // Ocultar error si todo está bien
        ocultarErrorFiltro();

        // Volver a la primera página y recargar con filtros
        historialCurrentPage = 0;
        loadComprasHistorial();
    }

    function limpiarFiltroFechas() {
        // Limpiar fechas
        fechaInicio.value = '';
        fechaFin.value = '';

        // Limpiar búsqueda
        if (comprasSearchInput) {
            comprasSearchInput.value = '';
            if (window.limpiarErroresInline) {
                window.limpiarErroresInline('compras-search-input');
            }
        }

        // Limpiar filtros adicionales
        if (filtroEstado) filtroEstado.value = '';
        if (filtroProveedor) filtroProveedor.value = '';

        // Restaurar ordenamiento por defecto: compra más reciente
        historialSortField = 'fecha';
        historialSortDirection = 'desc';

        // Limpiar errores de filtro
        ocultarErrorFiltro();

        // Volver a la primera página y recargar sin filtros
        historialCurrentPage = 0;
        loadComprasHistorial();
    }

    async function exportarPdfCompras() {
        const inicio = fechaInicio ? fechaInicio.value : '';
        const fin = fechaFin ? fechaFin.value : '';

        // Construir URL con parámetros opcionales
        let url = `${API_COMPRAS_URL}/exportar-pdf`;
        const params = new URLSearchParams();

        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        const searchText = comprasSearchInput ? comprasSearchInput.value.trim() : '';
        if (searchText) params.append('search', searchText);

        const estadoVal = filtroEstado ? filtroEstado.value : '';
        if (estadoVal) params.append('estadoPago', estadoVal);

        const proveedorVal = filtroProveedor ? filtroProveedor.value : '';
        if (proveedorVal) params.append('proveedorId', proveedorVal);

        if (historialSortField) {
            params.append('sort', `${historialSortField},${historialSortDirection}`);
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al generar PDF');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            // Extraer nombre de archivo del Content-Disposition si existe
            let filename = 'Reporte_Compras.pdf';
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            mostrarErrorFiltro('No se pudo generar el PDF. Por favor intenta nuevamente.');
        }
    }

    // ==========================================================
    // EVENT LISTENER PARA BÚSQUEDA
    // ==========================================================

    let comprasSearchTimeout;
    if (comprasSearchInput) {
        comprasSearchInput.addEventListener('input', function () {
            if (window.checkMaxLength) window.checkMaxLength(this, 100);
            clearTimeout(comprasSearchTimeout);
            comprasSearchTimeout = setTimeout(() => {
                filtrarComprasPorBusqueda();
            }, 300);
        });
    }

    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => {
            historialCurrentPage = 0;
            loadComprasHistorial();
        });
    }

    if (filtroProveedor) {
        filtroProveedor.addEventListener('change', () => {
            historialCurrentPage = 0;
            loadComprasHistorial();
        });
    }

    // ==========================================================
    // MODAL PAGAR COMPRA PENDIENTE
    // ==========================================================
    window.abrirModalPagarCompra = async function (compraId) {
        // Verificar si la caja está abierta antes de continuar
        if (typeof window.isCajaAbierta === 'function' && !window.isCajaAbierta()) {
            // Redirigir a la sección de caja
            const cajaLink = document.querySelector('.sidebar-menu a[data-section="caja"]');
            if (cajaLink) cajaLink.click();

            if (typeof window.showErrorBannerCaja === 'function') {
                window.showErrorBannerCaja('Para registrar un pago, primero debes abrir la caja.');
            } else {
                alert('Para registrar un pago, primero debes abrir la caja.');
            }
            return; // Bloquea la apertura del modal y la llamada a la API
        }

        // console.log removido
        try {
            const response = await fetch(`${API_COMPRAS_URL}/${compraId}`);
            if (!response.ok) throw new Error('Error al cargar la compra');
            const compra = await response.json();

            // Setea el ID
            const compraIdInput = document.getElementById('pago-compra-id');
            compraIdInput.value = compra.id;

            // 1. Monto a Pagar
            const montoPagarInput = document.getElementById('pago-compra-monto');
            const montoPendiente = compra.montoPendiente !== undefined && compra.montoPendiente !== null ? compra.montoPendiente : compra.total;
            montoPagarInput.value = formatoMoneda.format(montoPendiente);
            montoPagarInput.dataset.montoPendiente = montoPendiente; // Guardar crudo para validación de pago parcial

            // 2. Fecha del Pago 
            const fechaInput = document.getElementById('pago-compra-fecha');
            const hoy = new Date();
            const anio = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            const hoyFormat = `${anio}-${mes}-${dia}`;
            fechaInput.value = hoyFormat;

            // Resetear contenedor de Próxima Fecha
            const proximaFechaContainer = document.getElementById('pago-compra-proxima-fecha-container');
            const proximaFechaInput = document.getElementById('pago-compra-proxima-fecha');
            if (proximaFechaContainer && proximaFechaInput) {
                proximaFechaContainer.style.display = 'none';
                proximaFechaContainer.style.opacity = '0';
                proximaFechaContainer.style.transform = 'translateY(-10px)';
                proximaFechaInput.value = ''; // Limpiar valor previo

                // Evento para detectar si es pago parcial y enmascarar
                montoPagarInput.oninput = function () {
                    let oldLength = this.value.length;
                    let cursorPosition = this.selectionStart;

                    let newValue = formatearInputMonedaDecimales(this.value);
                    if (newValue === '') {
                        this.value = '';
                    } else {
                        this.value = newValue;
                        let diffLen = this.value.length - oldLength;
                        this.setSelectionRange(cursorPosition + diffLen, cursorPosition + diffLen);
                    }

                    const valorIngresado = parsearMoneda(this.value) || 0;
                    const pendiente = parseFloat(this.dataset.montoPendiente);

                    if (valorIngresado > 0 && valorIngresado < pendiente) {
                        // Es un pago parcial, mostrar fecha de compromiso
                        proximaFechaContainer.style.display = 'block';
                        setTimeout(() => {
                            proximaFechaContainer.style.opacity = '1';
                            proximaFechaContainer.style.transform = 'translateY(0)';
                        }, 10);

                        // Si no tiene fecha seleccionada, por defecto sugerimos un mes después
                        if (!proximaFechaInput.value) {
                            const nextMonth = new Date();
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            proximaFechaInput.value = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;
                        }
                    } else {
                        // Pago total o sobrepago, ocultar
                        proximaFechaContainer.style.opacity = '0';
                        proximaFechaContainer.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            proximaFechaContainer.style.display = 'none';
                        }, 300);
                    }
                };
            }

            // 3. Método de Pago (copiamos las opciones del select original)
            const pagoMetodoSelect = document.getElementById('pago-compra-metodo');
            const compraMetodoSelect = document.getElementById('compra-metodo-pago');

            if (pagoMetodoSelect && compraMetodoSelect) {
                pagoMetodoSelect.innerHTML = compraMetodoSelect.innerHTML;
                // Asegurarse de tener la primera opción vacía si no la copió
                if (pagoMetodoSelect.options.length > 0 && pagoMetodoSelect.options[0].value !== "") {
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = "";
                    defaultOpt.textContent = "Seleccionar método";
                    pagoMetodoSelect.insertBefore(defaultOpt, pagoMetodoSelect.firstChild);
                }
            }

            // Ocultar mensajes de error previos
            const errorDiv = document.getElementById('pago-compra-error');
            if (errorDiv) errorDiv.style.display = 'none';

            // Mostrar el modal
            document.getElementById('pago-compra-modal').style.display = 'flex';

        } catch (error) {
            console.error('Error al cargar la información de la compra:', error);
            if (typeof showToast === 'function') {
                showToast('No se pudo cargar la información de la compra para el pago.', 'error');
            } else {
                alert('No se pudo cargar la información de la compra para el pago.');
            }
        }
    };

    // Agregar evento al botón Confirmar Pago en el Modal
    const btnConfirmarPagoCompra = document.getElementById('btn-confirmar-pago-compra');
    if (btnConfirmarPagoCompra) {
        btnConfirmarPagoCompra.addEventListener('click', async function () {
            const compraId = document.getElementById('pago-compra-id').value;
            const monto = document.getElementById('pago-compra-monto').value;
            const metodoId = document.getElementById('pago-compra-metodo').value;
            const fechaPago = document.getElementById('pago-compra-fecha').value;
            const errorDiv = document.getElementById('pago-compra-error');

            const montoNumerico = parsearMoneda(monto);
            if (!monto || isNaN(montoNumerico) || montoNumerico <= 0 || !metodoId || !fechaPago) {
                errorDiv.textContent = 'Por favor complete todos los campos correctamente.';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                // Verificar nueva fecha si el contenedor está visible
                const proximaFechaContainer = document.getElementById('pago-compra-proxima-fecha-container');
                const proximaFechaInput = document.getElementById('pago-compra-proxima-fecha');
                let nuevaFechaVencimiento = null;

                if (proximaFechaContainer && proximaFechaContainer.style.display === 'block') {
                    if (!proximaFechaInput.value) {
                        errorDiv.textContent = 'Por favor indique la fecha de compromiso para el pago restante.';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    const hoyStr = new Date().toISOString().split('T')[0];
                    if (proximaFechaInput.value < hoyStr) {
                        errorDiv.textContent = 'La fecha de compromiso para el pago restante no puede ser en el pasado.';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    nuevaFechaVencimiento = proximaFechaInput.value;
                }

                // Bloquear botón
                btnConfirmarPagoCompra.disabled = true;
                btnConfirmarPagoCompra.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

                const payload = {
                    idMetodoPago: parseInt(metodoId, 10),
                    importe: montoNumerico,
                    fechaPago: fechaPago
                };

                if (nuevaFechaVencimiento) {
                    payload.nuevaFechaVencimiento = nuevaFechaVencimiento;
                }

                const response = await fetch(`${API_COMPRAS_URL}/${compraId}/pagos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    // Éxito in-modal
                    errorDiv.style.backgroundColor = '#d1fae5';
                    errorDiv.style.color = '#065f46';
                    errorDiv.style.border = '1px solid #a7f3d0';
                    errorDiv.style.padding = '10px';
                    errorDiv.style.borderRadius = '5px';
                    errorDiv.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 5px;"></i> Pago realizado con éxito';
                    errorDiv.style.display = 'block';

                    btnConfirmarPagoCompra.innerHTML = '<i class="fas fa-check"></i> Éxito';

                    setTimeout(() => {
                        document.getElementById('pago-compra-modal').style.display = 'none';
                        // Resetear estilos visuales para próxima vez
                        errorDiv.style.backgroundColor = '';
                        errorDiv.style.color = '';
                        errorDiv.style.border = '';
                        errorDiv.style.padding = '';

                        btnConfirmarPagoCompra.disabled = false;
                        btnConfirmarPagoCompra.innerHTML = '<i class="fas fa-check" style="margin-right: 5px;"></i> Confirmar Pago';

                        if (typeof loadComprasHistorial === 'function') {
                            loadComprasHistorial();
                        } else {
                            window.location.reload();
                        }
                    }, 500);
                } else {
                    errorDiv.style.backgroundColor = '#fee2e2';
                    errorDiv.style.color = '#991b1b';
                    errorDiv.style.border = '1px solid #fecaca';
                    errorDiv.style.padding = '10px';
                    errorDiv.style.borderRadius = '5px';

                    const textError = await response.text();
                    errorDiv.textContent = textError || 'Error al registrar el pago.';
                    errorDiv.style.display = 'block';

                    btnConfirmarPagoCompra.disabled = false;
                    btnConfirmarPagoCompra.innerHTML = '<i class="fas fa-check" style="margin-right: 5px;"></i> Confirmar Pago';
                }
            } catch (error) {
                console.error("Error al registrar pago diferido: ", error);

                errorDiv.style.backgroundColor = '#fee2e2';
                errorDiv.style.color = '#991b1b';
                errorDiv.style.border = '1px solid #fecaca';
                errorDiv.style.padding = '10px';
                errorDiv.style.borderRadius = '5px';

                errorDiv.textContent = 'Ocurrió un error (ej. caja cerrada).';
                errorDiv.style.display = 'block';

                btnConfirmarPagoCompra.disabled = false;
                btnConfirmarPagoCompra.innerHTML = '<i class="fas fa-check" style="margin-right: 5px;"></i> Confirmar Pago';
            }
        });
    }

    // Agregar evento al botón Limpiar en el Modal
    const btnBorrarPagoCompra = document.getElementById('btn-borrar-pago-compra');
    if (btnBorrarPagoCompra) {
        btnBorrarPagoCompra.addEventListener('click', function () {
            const form = document.getElementById('form-pagar-compra');
            const montoInput = document.getElementById('pago-compra-monto');
            const pendienteOriginal = montoInput.dataset.montoPendiente;

            // Resetear el formulario (esto limpia el Método de Pago y fechas no default)
            if (form) form.reset();

            // Restaurar monto pendiente pre-formateado y disparar evento para ocultar fecha parcial
            if (montoInput && pendienteOriginal) {
                const num = parseFloat(pendienteOriginal);
                if (!isNaN(num)) {
                    montoInput.value = formatoMoneda.format(num);
                } else {
                    montoInput.value = pendienteOriginal;
                }
                // Disparar evento de input para que la lógica de "Próxima Fecha" evalúe
                montoInput.dispatchEvent(new Event('input'));
            }

            // Ocultar mensajes de error si estaban visibles
            const errorDiv = document.getElementById('pago-compra-error');
            if (errorDiv) errorDiv.style.display = 'none';

            // Volver a setear la fecha de pago al día de hoy por defecto
            const fechaInput = document.getElementById('pago-compra-fecha');
            if (fechaInput) {
                const hoy = new Date();
                const anio = hoy.getFullYear();
                const mes = String(hoy.getMonth() + 1).padStart(2, '0');
                const dia = String(hoy.getDate()).padStart(2, '0');
                fechaInput.value = `${anio}-${mes}-${dia}`;
            }
        });
    }

    // Cerrar modal al hacer clic fuera o presionar ESC
    const pagoCompraModal = document.getElementById('pago-compra-modal');
    if (pagoCompraModal) {
        window.addEventListener('click', function (e) {
            if (e.target === pagoCompraModal) {
                pagoCompraModal.style.display = 'none';
            }
        });
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && pagoCompraModal.style.display === 'flex') {
                pagoCompraModal.style.display = 'none';
            }
        });
    }

    // ==========================================================
    // MODAL DETALLE DE COMPRA
    // ==========================================================

    // Variables para el modal
    let modalProductosActuales = [];
    let modalCompraCurrentSortCol = -1;
    let modalCompraCurrentSortAsc = true;


    async function mostrarDetalleCompra(compraId) {
        const modal = document.getElementById('purchase-detail-modal');
        if (!modal) return;

        resetPurchaseDetailTabs();

        try {
            const response = await fetch(`${API_COMPRAS_URL}/${compraId}`);
            if (!response.ok) throw new Error('Error al cargar el detalle');
            const compra = await response.json();

            // Formatear fecha
            let fechaFormateada = compra.fecha || 'N/A';
            if (typeof fechaFormateada === 'string' && fechaFormateada.includes('-')) {
                const partes = fechaFormateada.split('T')[0].split('-');
                fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }

            // Llenar información general
            document.getElementById('modal-compra-id').textContent = `#${compra.id}`;
            document.getElementById('modal-compra-fecha').textContent = fechaFormateada;
            document.getElementById('modal-compra-proveedor').textContent = compra.nombreProveedor || 'N/A';
            document.getElementById('modal-compra-metodo-pago').textContent = compra.metodoPago || '-';

            const estadoContainer = document.getElementById('modal-compra-estado');
            estadoContainer.textContent = compra.estadoPago || 'PAGADO';
            if (compra.estadoPago === 'PENDIENTE') {
                estadoContainer.style.backgroundColor = '#fee2e2';
                estadoContainer.style.color = '#ef4444';
            } else {
                estadoContainer.style.backgroundColor = '#d1fae5';
                estadoContainer.style.color = '#10b981';
            }

            // Fecha de Vencimiento en header
            const vencimientoContainer = document.getElementById('modal-compra-vencimiento-container');
            let venciFormateada = '';
            if (compra.estadoPago === 'PENDIENTE' && compra.fechaVencimientoPago) {
                let venciStr = compra.fechaVencimientoPago;
                if (venciStr.includes('-')) {
                    const partes = venciStr.split('-');
                    if (partes.length >= 3) {
                        venciStr = `${partes[2]}/${partes[1]}/${partes[0]}`;
                    }
                }
                venciFormateada = venciStr;
                document.getElementById('modal-compra-vencimiento').textContent = venciStr;
                vencimientoContainer.style.display = 'flex';
            } else {
                vencimientoContainer.style.display = 'none';
            }

            // Resumen de Pago (visible SIEMPRE)
            const resumenPagoDiv = document.getElementById('modal-compra-resumen-pago');
            resumenPagoDiv.style.display = 'block';
            document.getElementById('modal-compra-monto-pagar').textContent = `$${formatoMoneda.format(compra.total || 0)}`;

            const montoPendienteEl = document.getElementById('modal-compra-monto-pendiente');
            const cardPendiente = document.getElementById('modal-compra-card-pendiente');
            const venceElDiv = document.getElementById('modal-compra-vence-el');

            if (compra.estadoPago === 'PENDIENTE') {
                // Estilo rojo para pendiente
                montoPendienteEl.textContent = `$${formatoMoneda.format(compra.montoPendiente || 0)}`;
                montoPendienteEl.style.color = '#ef4444';

                if (venciFormateada) {
                    venceElDiv.innerHTML = `<i class="fas fa-calendar-alt"></i> Vence el: <span>${venciFormateada}</span>`;
                    venceElDiv.style.color = '#ef4444';
                    venceElDiv.style.display = 'flex';
                } else {
                    venceElDiv.style.display = 'none';
                }
            } else {
                // Estilo verde para pagado
                montoPendienteEl.textContent = '$0';
                montoPendienteEl.style.color = '#10b981';

                let fechaPagadoTexto = fechaFormateada;
                if (compra.fechaUltimoPago) {
                    let f = compra.fechaUltimoPago;
                    if (typeof f === 'string') {
                        const partes = f.split('T')[0].split('-');
                        if (partes.length >= 3) {
                            fechaPagadoTexto = `${partes[2]}/${partes[1]}/${partes[0]}`;
                        }
                    } else if (Array.isArray(f)) {
                        const d = String(f[2]).padStart(2, '0');
                        const m = String(f[1]).padStart(2, '0');
                        const y = f[0];
                        fechaPagadoTexto = `${d}/${m}/${y}`;
                    }
                }
                venceElDiv.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Pagado el: <span>${fechaPagadoTexto}</span>`;
                venceElDiv.style.color = '#10b981';
                venceElDiv.style.display = 'flex';
            }

            document.getElementById('modal-compra-total').textContent = `$${formatoMoneda.format(compra.total || 0)}`;

            // Guardar productos
            modalProductosActuales = compra.productosComprados || [];

            // Renderizar historial de pagos
            renderModalPagos(compra.pagos);

            // Actualizar badge de cantidad de pagos
            const pagosCountEl = document.getElementById('pdm-tab-pagos-badge');
            if (pagosCountEl) {
                pagosCountEl.textContent = compra.pagos ? compra.pagos.length : 0;
            }

            // Resetear UI de busqueda y ordenamiento
            const searchInput = document.getElementById('modal-compra-productos-search');
            if (searchInput) {
                searchInput.value = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline(searchInput.id);
                const errDiv = document.getElementById('error-' + searchInput.id);
                if (errDiv) errDiv.style.display = 'none';
            }
            document.querySelectorAll('.pdm-filter-btn').forEach(btn => {
                btn.classList.remove('active');
                const icon = btn.querySelector('.sort-arrow');
                if (icon) icon.className = 'fas fa-sort sort-arrow';
            });
            modalCompraCurrentSortCol = -1;
            modalCompraCurrentSortAsc = true;

            // Renderizar tabla con productos
            renderModalProductos();

            // Mostrar modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error al cargar el detalle de la compra:', error);
            if (typeof showToast === 'function') {
                showToast('No se pudo cargar el detalle de la compra.', 'error');
            } else {
                alert('No se pudo cargar el detalle de la compra.');
            }
        }
    }

    function renderModalPagos(pagos) {
        const container = document.getElementById('modal-compra-pagos-list');
        if (!container) return;

        if (!pagos || pagos.length === 0) {
            container.innerHTML = '<div style="padding: 15px; text-align: center; color: #64748b;">No hay pagos registrados para esta compra.</div>';
            return;
        }

        let html = '<table class="pdm-pagos-table">';
        html += '<thead><tr>';
        html += '<th>Fecha</th>';
        html += '<th>Método</th>';
        html += '<th style="text-align: right;">Importe</th>';
        html += '<th>Estado</th>';
        html += '</tr></thead><tbody>';

        pagos.forEach(pago => {
            let fechaStr = 'N/A';
            if (pago.fechaPago) {
                const fecha = new Date(pago.fechaPago);
                const d = String(fecha.getDate()).padStart(2, '0');
                const m = String(fecha.getMonth() + 1).padStart(2, '0');
                const y = fecha.getFullYear();
                const h = String(fecha.getHours()).padStart(2, '0');
                const min = String(fecha.getMinutes()).padStart(2, '0');
                fechaStr = `${d}/${m}/${y} ${h}:${min}`;
            }

            const estadoClass = pago.estado === 'PAGADO' ? 'style="color: #10b981; font-weight: 600;"' : 'style="color: #ef4444; font-weight: 600;"';

            let importeHtml = `$${formatoMoneda.format(pago.importe || 0)}`;
            if (pago.vuelto && parseFloat(pago.vuelto) > 0) {
                importeHtml += `<br><span style="font-size: 0.75rem; color: #64748b;">(Efectivo: $${formatoMoneda.format(pago.montoEntregado)} - Vuelto: $${formatoMoneda.format(pago.vuelto)})</span>`;
            }

            html += `<tr>`;
            html += `<td>${fechaStr}</td>`;
            html += `<td>${pago.metodoPago || 'N/A'}</td>`;
            html += `<td style="text-align: right;">${importeHtml}</td>`;
            html += `<td ${estadoClass}>${pago.estado || 'N/A'}</td>`;
            html += `</tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function renderModalProductos() {
        const tbody = document.getElementById('modal-compra-productos');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (modalProductosActuales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No hay productos en esta compra.</td></tr>';
            return;
        }

        // Renderizar todos los productos para vista scrolleable
        modalProductosActuales.forEach(producto => {
            const subtotal = (producto.cantidad || 0) * (producto.precioUnitario || 0);
            const row = `
                <tr>
                    <td>${producto.nombreProducto || 'N/A'}</td>
                    <td>${producto.cantidad || 0}</td>
                    <td style="text-align: right;">$${formatoMoneda.format(producto.precioUnitario || 0)}</td>
                    <td style="text-align: right;">$${formatoMoneda.format(subtotal)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Removed cushion as footer is no longer explicitly sticky
    }

    window.cerrarModalDetalleCompra = function () {
        const modal = document.getElementById('purchase-detail-modal');
        if (modal) modal.style.display = 'none';
        modalProductosActuales = [];
    }

    function resetPurchaseDetailTabs() {
        const tabs = document.querySelectorAll('#purchase-detail-modal .pdm-tab');
        const contents = document.querySelectorAll('#purchase-detail-modal .pdm-tab-content');
        
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.style.display = 'none');
        
        const firstTab = document.querySelector('#purchase-detail-modal .pdm-tab[data-tab="pdm-tab-info"]');
        if (firstTab) firstTab.classList.add('active');
        
        const firstContent = document.getElementById('pdm-tab-info');
        if (firstContent) firstContent.style.display = 'block';
    }

    const pdmTabs = document.querySelectorAll('#purchase-detail-modal .pdm-tab');
    pdmTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            pdmTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#purchase-detail-modal .pdm-tab-content').forEach(c => c.style.display = 'none');
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.style.display = 'block';
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('purchase-detail-modal');
            if (modal && modal.style.display === 'block') {
                cerrarModalDetalleCompra();
            }
        }
    });

    // ===============================
    // LÓGICA DE AÑADIR PROVEEDOR RÁPIDO (ATAJO EN COMPRAS)
    // ===============================
    const btnAddProveedorCompra = document.getElementById('btn-add-proveedor-compra');
    const modalAddProveedorCompras = document.getElementById('modal-add-proveedor-compras-overlay');
    const modalAddProveedorComprasClose = document.getElementById('modal-add-proveedor-compras-close');
    const addProveedorComprasForm = document.getElementById('add-proveedor-compras-form');
    const formMsgAddProveedorCompras = document.getElementById('form-general-message-add-proveedor-compras');

    // --- Helpers de restricción de inputs (misma lógica que proveedor.js) ---
    function restrictTelefonoInputCompra(input) {
        if (!input) return;
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9+ ]/g, '');
        });
        input.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey) return;
            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', ' '];
            if (allowed.includes(e.key)) return;
            if (!/^[0-9+]$/.test(e.key)) e.preventDefault();
        });
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const sanitized = pasted.replace(/[^0-9+ ]/g, '');
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const maxLen = parseInt(this.getAttribute('maxlength')) || Infinity;
            const newValue = (this.value.slice(0, start) + sanitized + this.value.slice(end)).slice(0, maxLen);
            this.value = newValue;
            this.selectionStart = this.selectionEnd = Math.min(start + sanitized.length, maxLen);
            this.dispatchEvent(new Event('input'));
        });
    }

    function formatCuitCompra(digits) {
        if (digits.length <= 2) return digits;
        if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2);
        return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10, 11);
    }

    function restrictCuitInputCompra(input) {
        if (!input) return;
        input.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey) return;
            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
            if (allowed.includes(e.key)) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
        });
        input.addEventListener('input', function () {
            const pos = this.selectionStart;
            const digitsBeforeCursor = this.value.slice(0, pos).replace(/\D/g, '').length;
            const digits = this.value.replace(/\D/g, '').slice(0, 11);
            const formatted = formatCuitCompra(digits);
            this.value = formatted;
            let count = 0;
            let newPos = formatted.length;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) count++;
                if (count === digitsBeforeCursor) { newPos = i + 1; break; }
            }
            this.selectionStart = this.selectionEnd = newPos;
        });
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const beforeDigits = this.value.slice(0, start).replace(/\D/g, '');
            const afterDigits = this.value.slice(end).replace(/\D/g, '');
            const newDigits = (beforeDigits + pasted.replace(/\D/g, '') + afterDigits).slice(0, 11);
            this.value = formatCuitCompra(newDigits);
            this.dispatchEvent(new Event('input'));
        });
    }

    function bindLimitCompra(input, errorEl, max) {
        if (!input || !errorEl) return;
        input.addEventListener('input', () => {
            if (input.value.length >= max) {
                if(window.mostrarErrorInline) window.mostrarErrorInline(input.id, `Límite de ${max} caracteres alcanzado.`);
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline(input.id);
            }
        });
    }

    // Aplicar restricciones y límites al modal rápido
    restrictTelefonoInputCompra(document.getElementById('addProveedorComprasTelefono'));
    restrictCuitInputCompra(document.getElementById('addProveedorComprasCuit'));
    bindLimitCompra(document.getElementById('addProveedorComprasNombre'), document.getElementById('error-addProveedorComprasNombre'), 70);
    bindLimitCompra(document.getElementById('addProveedorComprasCuit'), document.getElementById('error-addProveedorComprasCuit'), 13);
    bindLimitCompra(document.getElementById('addProveedorComprasTelefono'), document.getElementById('error-addProveedorComprasTelefono'), 20);
    bindLimitCompra(document.getElementById('addProveedorComprasEmail'), document.getElementById('error-addProveedorComprasEmail'), 80);
    bindLimitCompra(document.getElementById('addProveedorComprasDireccion'), document.getElementById('error-addProveedorComprasDireccion'), 100);

    if (btnAddProveedorCompra) {
        btnAddProveedorCompra.addEventListener('click', () => {
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('addProveedorCompras');
            if (formMsgAddProveedorCompras) {
                formMsgAddProveedorCompras.textContent = '';
                formMsgAddProveedorCompras.className = 'form-message';
            }
            addProveedorComprasForm.reset();
            modalAddProveedorCompras.style.display = 'flex';
        });
    }

    function cerrarModalProveedorCompra() {
        if (modalAddProveedorCompras) modalAddProveedorCompras.style.display = 'none';
    }

    if (modalAddProveedorComprasClose) {
        modalAddProveedorComprasClose.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarModalProveedorCompra();
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalAddProveedorCompras && modalAddProveedorCompras.style.display === 'flex') {
            cerrarModalProveedorCompra();
        }
    });

    // Cerrar clickeando fuera del modal
    if (modalAddProveedorCompras) {
        modalAddProveedorCompras.addEventListener('click', (e) => {
            if (e.target === modalAddProveedorCompras) cerrarModalProveedorCompra();
        });
    }

    // Botón limpiar
    const btnLimpiarProveedorCompra = document.getElementById('btn-limpiar-proveedor-compra');
    if (btnLimpiarProveedorCompra) {
        btnLimpiarProveedorCompra.addEventListener('click', () => {
            addProveedorComprasForm.reset();
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('addProveedorCompras');
            if (formMsgAddProveedorCompras) {
                formMsgAddProveedorCompras.textContent = '';
                formMsgAddProveedorCompras.className = 'form-message';
            }
        });
    }

    if (addProveedorComprasForm) {
        addProveedorComprasForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (formMsgAddProveedorCompras) {
                formMsgAddProveedorCompras.textContent = '';
                formMsgAddProveedorCompras.className = 'form-message';
            }

            const nombre = document.getElementById('addProveedorComprasNombre').value.trim();
            const telefono = document.getElementById('addProveedorComprasTelefono').value.trim();
            const email = document.getElementById('addProveedorComprasEmail').value.trim();
            const direccion = document.getElementById('addProveedorComprasDireccion').value.trim();
            const cuit = document.getElementById('addProveedorComprasCuit').value.trim();

            let isValid = true;

            if (!nombre) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasNombre', 'El nombre del proveedor es obligatorio');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('addProveedorComprasNombre');
            }

            if (!telefono) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasTelefono', 'El teléfono del proveedor es obligatorio');
                isValid = false;
            } else if (telefono.length < 6) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasTelefono', 'El teléfono debe tener al menos 6 caracteres');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('addProveedorComprasTelefono');
            }

            if (!email) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasEmail', 'El email del proveedor es obligatorio');
                isValid = false;
            } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasEmail', 'El formato del email no es válido');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('addProveedorComprasEmail');
            }

            if (!direccion) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasDireccion', 'La dirección del proveedor es obligatoria');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('addProveedorComprasDireccion');
            }

            if (!cuit) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasCuit', 'El CUIT es obligatorio');
                isValid = false;
            } else if (!cuit.match(/^\d{2}-\d{8}-\d{1}$/)) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasCuit', 'El formato de CUIT debe ser XX-XXXXXXXX-X');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('addProveedorComprasCuit');
            }

            if (!isValid) {
                return;
            }

            // Verificar duplicados en servidor
            try {
                const [nombreRes, emailRes] = await Promise.all([
                    fetch(`/api/proveedores/existe/nombre/${encodeURIComponent(nombre)}`),
                    fetch(`/api/proveedores/existe/email/${encodeURIComponent(email)}`)
                ]);
                const nombreExiste = await nombreRes.json();
                const emailExiste = await emailRes.json();
                if (nombreExiste) {
                    if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasNombre', 'Ya existe un proveedor con ese nombre');
                    isValid = false;
                }
                if (emailExiste) {
                    if(window.mostrarErrorInline) window.mostrarErrorInline('addProveedorComprasEmail', 'Ya existe un proveedor con ese email');
                    isValid = false;
                }
                if (!isValid) {
                    return;
                }
            } catch (err) {
                console.error('Error al verificar duplicados:', err);
            }

            const dto = { nombre, telefono, email, direccion, cuit, productosIds: [] };

            try {
                const response = await fetch('/api/proveedores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al guardar el proveedor.');
                }

                const nuevoProveedor = await response.json();

                formMsgAddProveedorCompras.textContent = '¡Proveedor registrado exitosamente!';
                formMsgAddProveedorCompras.className = 'form-message success';

                if (typeof todosLosProveedores !== 'undefined') {
                    todosLosProveedores.push(nuevoProveedor);
                }

                const nombreCapitalizado = capitalizarNombre(nuevoProveedor.nombre);
                proveedorSearchInput.value = nombreCapitalizado;
                proveedorHiddenInput.value = nuevoProveedor.id;

                previousProveedorId = nuevoProveedor.id.toString();
                previousProveedorNombre = nombreCapitalizado;

                detalleItems = [];
                renderDetalleTemporal();
                fetchAllProductosParaCompra();

                document.dispatchEvent(new Event('proveedoresActualizados'));

                setTimeout(() => {
                    modalAddProveedorCompras.style.display = 'none';
                }, 1500);

            } catch (error) {
                formMsgAddProveedorCompras.textContent = error.message;
                formMsgAddProveedorCompras.className = 'form-message error';
            }
        });
    }

    // Funciones Helper para Multi-Select clonadas y adaptadas
    function setupMultiSelect(selectUI, productosPreSeleccionados = []) {
        if (!selectUI.options || !selectUI.hiddenSelect || !selectUI.tags) return;

        selectUI.options.innerHTML = '';
        selectUI.hiddenSelect.innerHTML = '';
        selectUI.tags.innerHTML = '';

        const preSeleccionadosSet = new Set(productosPreSeleccionados.map(p => p.idProducto));

        // Ordenar productos alfabéticamente
        const productosOrdenados = [...todosLosProductosSelectInfo].sort((a, b) =>
            a.nombreProducto.localeCompare(b.nombreProducto)
        );

        productosOrdenados.forEach(producto => {
            const realOption = document.createElement('option');
            realOption.value = producto.idProducto;
            realOption.textContent = capitalizarNombre(producto.nombreProducto);
            selectUI.hiddenSelect.appendChild(realOption);

            const visualOption = document.createElement('div');
            visualOption.classList.add('option');
            visualOption.textContent = capitalizarNombre(producto.nombreProducto);
            visualOption.dataset.value = producto.idProducto;

            visualOption.addEventListener('click', (e) => {
                e.stopPropagation();
                seleccionarProductoMulti(visualOption, realOption, selectUI);
            });

            selectUI.options.appendChild(visualOption);

            if (preSeleccionadosSet.has(producto.idProducto)) {
                seleccionarProductoMulti(visualOption, realOption, selectUI);
            }
        });
        setupMultiSelectUIEvents(selectUI);
    }

    function seleccionarProductoMulti(visualOption, realOption, selectUI) {
        realOption.selected = true;
        visualOption.classList.add('selected-option');
        crearTag(visualOption.textContent, visualOption.dataset.value, visualOption, realOption, selectUI);
        visualOption.style.display = 'none';
        selectUI.input.value = '';
    }

    function crearTag(texto, valor, visualOption, realOption, selectUI) {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = texto;

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('tag-close');
        closeBtn.innerHTML = '&times;';

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            realOption.selected = false;
            visualOption.classList.remove('selected-option');
            selectUI.tags.removeChild(tag);
            visualOption.style.display = 'block';

            if (selectUI.tags.children.length === 0) {
                selectUI.input.placeholder = 'Buscar y seleccionar productos...';
            }
        });

        tag.appendChild(closeBtn);
        selectUI.tags.appendChild(tag);
    }

    function setupMultiSelectUIEvents(selectUI) {
        if (selectUI.container) {
            selectUI.container.addEventListener('click', () => {
                selectUI.options.style.display = 'block';
                selectUI.input.focus();
            });
        }
        if (selectUI.input) {
            selectUI.input.addEventListener('input', () => {
                const normalizarTexto = (str) =>
                    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const filtro = normalizarTexto(selectUI.input.value);

                selectUI.options.querySelectorAll('.option').forEach(opcion => {
                    const textoOpcion = normalizarTexto(opcion.textContent);
                    const isSelected = opcion.classList.contains('selected-option');

                    if (textoOpcion.includes(filtro) && !isSelected) {
                        opcion.style.display = 'block';
                    } else {
                        opcion.style.display = 'none';
                    }
                });
            });
        }
    }

    document.addEventListener('click', (e) => {
        if (typeof addCompraSelect !== 'undefined' && addCompraSelect && addCompraSelect.container && !addCompraSelect.container.contains(e.target) && !addCompraSelect.options.contains(e.target)) {
            addCompraSelect.options.style.display = 'none';
        }
    });

    // ==========================================================
    // BUSQUEDA Y ORDENAMIENTO EN MODAL DETALLE DE COMPRA
    // ==========================================================

    function initializeModalInteractions() {
        const removeAccents = (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const searchInput = document.getElementById('modal-compra-productos-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                // Validación del límite de caracteres
                if (this.value.length >= 100) {
                    if (window.mostrarErrorInline) {
                        window.mostrarErrorInline(this.id, 'Límite de 100 caracteres alcanzado.');
                    } else {
                        const errorDiv = document.getElementById('error-' + this.id);
                        if (errorDiv) {
                            errorDiv.textContent = 'Límite de 100 caracteres alcanzado.';
                            errorDiv.style.display = 'block';
                        }
                    }
                } else {
                    if (window.limpiarErroresInline) {
                        window.limpiarErroresInline(this.id);
                    } else {
                        const errorDiv = document.getElementById('error-' + this.id);
                        if (errorDiv) {
                            errorDiv.style.display = 'none';
                        }
                    }
                }

                const tbody = document.getElementById('modal-compra-productos');
                // Añadir clase de animación
                tbody.classList.add('loading');

                const query = removeAccents(this.value.trim().toLowerCase());

                // Esperar a que la animacion de fade-out (200ms aprox) surta efecto
                setTimeout(() => {
                    const rows = document.querySelectorAll('#modal-compra-productos tr');
                    rows.forEach(row => {
                        const productNameTd = row.querySelector('td:first-child');
                        if (productNameTd) {
                            const productName = removeAccents(productNameTd.textContent.trim().toLowerCase());
                            if (productName.includes(query)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        }
                    });

                    // Remover clase y el tbody vuelve a fade-in solo
                    tbody.classList.remove('loading');
                }, 200);
            });
        }

        const sortButtons = document.querySelectorAll('.pdm-filter-btn[data-sort-field]');

        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortField = btn.getAttribute('data-sort-field');
                let colIndex, dataType;

                if (sortField === 'cantidad') {
                    colIndex = 1;
                    dataType = 'number';
                } else if (sortField === 'subtotal') {
                    colIndex = 3;
                    dataType = 'currency';
                } else {
                    return;
                }

                if (modalCompraCurrentSortCol === colIndex) {
                    modalCompraCurrentSortAsc = !modalCompraCurrentSortAsc;
                } else {
                    modalCompraCurrentSortCol = colIndex;
                    // Por defecto, al clickear por primera vez cantidad o subtotal, ordenamos de mayor a menor (descendente)
                    modalCompraCurrentSortAsc = false;
                }

                sortButtons.forEach(b => {
                    b.classList.remove('active');
                    const icon = b.querySelector('.sort-arrow');
                    if (icon) icon.className = 'fas fa-sort sort-arrow';
                });

                btn.classList.add('active');
                const icon = btn.querySelector('.sort-arrow');
                if (icon) {
                    icon.className = modalCompraCurrentSortAsc ? 'fas fa-sort-up sort-arrow' : 'fas fa-sort-down sort-arrow';
                }

                const tbody = document.getElementById('modal-compra-productos');
                tbody.classList.add('loading');

                setTimeout(() => {
                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    rows.sort((a, b) => {
                        if (!a.children[colIndex] || !b.children[colIndex]) return 0;

                        const valA = a.children[colIndex].textContent.trim();
                        const valB = b.children[colIndex].textContent.trim();

                        let cmpA, cmpB;

                        if (dataType === 'number') {
                            cmpA = parseInt(valA, 10) || 0;
                            cmpB = parseInt(valB, 10) || 0;
                        } else if (dataType === 'currency') {
                            const cleanA = valA.replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
                            const cleanB = valB.replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
                            cmpA = parseFloat(cleanA) || 0;
                            cmpB = parseFloat(cleanB) || 0;
                        }

                        if (cmpA < cmpB) return modalCompraCurrentSortAsc ? -1 : 1;
                        if (cmpA > cmpB) return modalCompraCurrentSortAsc ? 1 : -1;
                        return 0;
                    });

                    tbody.innerHTML = '';
                    rows.forEach(row => tbody.appendChild(row));

                    if (searchInput && searchInput.value) {
                        const query = removeAccents(searchInput.value.trim().toLowerCase());
                        const newRows = document.querySelectorAll('#modal-compra-productos tr');
                        newRows.forEach(row => {
                            const td = row.querySelector('td:first-child');
                            if (td) {
                                if (removeAccents(td.textContent.trim().toLowerCase()).includes(query)) {
                                    row.style.display = '';
                                } else {
                                    row.style.display = 'none';
                                }
                            }
                        });
                    }

                    tbody.classList.remove('loading');
                }, 200);
            });
        });

        // 3. Botón para Limpiar Filtros y Ordenamiento
        const btnCleanFilters = document.getElementById('modal-compra-clean-filters');
        if (btnCleanFilters) {
            btnCleanFilters.addEventListener('click', () => {
                const tbody = document.getElementById('modal-compra-productos');
                tbody.classList.add('loading');

                setTimeout(() => {
                    if (searchInput) {
                        searchInput.value = '';
                        if (window.limpiarErroresInline) window.limpiarErroresInline(searchInput.id);
                        const errDiv = document.getElementById('error-' + searchInput.id);
                        if (errDiv) errDiv.style.display = 'none';
                    }
                    modalCompraCurrentSortCol = -1;
                    modalCompraCurrentSortAsc = true;

                    sortButtons.forEach(b => {
                        b.classList.remove('active');
                        const icon = b.querySelector('.sort-arrow');
                        if (icon) icon.className = 'fas fa-sort sort-arrow';
                    });

                    renderModalProductos();
                    tbody.classList.remove('loading');
                }, 200);
            });
        }
    }

    // Inicializar listeners del modal
    initializeModalInteractions();

    // Exponer funciones globalmente
    window.mostrarDetalleCompra = mostrarDetalleCompra;
    window.cerrarModalDetalleCompra = cerrarModalDetalleCompra;
    // -----------------------------------------------------
    // LÓGICA DE PAGOS MIXTOS PARA COMPRAS
    // -----------------------------------------------------
    // -----------------------------------------------------
    // LÓGICA DE PAGOS MIXTOS PARA COMPRAS
    // -----------------------------------------------------
    const btnAddPagoMixto = document.getElementById('btn-add-pago-mixto');
    const selectMetodoGlobal = document.getElementById('compra-metodo-pago');
    const inputMontoGlobal = document.getElementById('compra-pago-monto');

    if (selectMetodoGlobal && inputMontoGlobal) {
        selectMetodoGlobal.addEventListener('change', () => {
            // Autocompletar solo si se eligió un método válido y el monto está vacío
            const valFormateadoNum = inputMontoGlobal.value ? parsearMoneda(inputMontoGlobal.value) : 0;
            if (selectMetodoGlobal.value && valFormateadoNum === 0) {
                const totalCompra = calcularTotalGenerico(detalleItems);
                let totalPagosActuales = 0;
                pagosMixtos.forEach(p => totalPagosActuales += parseFloat(p.importe));
                const diff = totalCompra - totalPagosActuales; // Permitimos decimales
                if (diff > 0) {
                    inputMontoGlobal.value = formatoMoneda.format(diff);
                    renderPagosMixtos(); // Refresh balance visual
                }
            }
        });

        inputMontoGlobal.addEventListener('input', function () {
            let cursorPosition = this.selectionStart;
            let oldLength = this.value.length;

            // Revisar manualmente si excedió los 10 dígitos enteros para lanzar el error inline
            let cleanVal = this.value.replace(/[^0-9,]/g, '');
            let parts = cleanVal.split(',');
            if (parts[0] && parts[0].length > 10) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('compra-pago-monto', 'Límite de 10 dígitos enteros alcanzado.');
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline('compra-pago-monto');
            }

            let newValue = formatearInputMonedaDecimales(this.value);
            if (newValue === '') {
                this.value = '';
                renderPagosMixtos();
                return;
            }

            this.value = newValue;

            let diffLen = this.value.length - oldLength;
            this.setSelectionRange(cursorPosition + diffLen, cursorPosition + diffLen);

            renderPagosMixtos();
        });
    }

    if (btnAddPagoMixto) {
        btnAddPagoMixto.addEventListener('click', () => {
            const selectMetodo = document.getElementById('compra-metodo-pago');
            const inputMonto = document.getElementById('compra-pago-monto');
            if (window.limpiarErroresInline) window.limpiarErroresInline('compra-pago-monto');

            const idMetodo = selectMetodo.value;
            const nombreMetodo = selectMetodo.options[selectMetodo.selectedIndex]?.text;
            let monto = parsearMoneda(inputMonto.value) || 0;

            if (!idMetodo) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('compra-metodo-pago', 'Seleccione un método de pago.');
                return;
            }
            if (isNaN(monto) || monto <= 0) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('compra-pago-monto', 'Ingrese un monto válido mayor a 0.');
                return;
            }

            const totalCompraActual = Math.round(calcularTotalGenerico(detalleItems));
            let totalPagosActuales = 0;
            pagosMixtos.forEach(p => totalPagosActuales += parseFloat(p.importe));

            let montoEntregadoFisico = monto;
            let vueltoCalc = 0;

            if ((totalPagosActuales + monto) > totalCompraActual + 0.05) {
                let saldoPendiente = totalCompraActual - totalPagosActuales;
                vueltoCalc = monto - saldoPendiente;

                if (saldoPendiente <= 0) {
                    if (window.mostrarErrorInline) window.mostrarErrorInline('compra-pago-monto', 'La compra ya está saldada en su totalidad.');
                    return;
                }

                mostrarVueltoToast(vueltoCalc);
                monto = saldoPendiente;
            }

            // Agregar a la lista temporal
            pagosMixtos.push({
                idMetodoPago: parseInt(idMetodo),
                nombreMetodo: nombreMetodo,
                importe: monto,
                montoEntregado: montoEntregadoFisico,
                vuelto: vueltoCalc,
                estadoPago: 'PAGADO', // Todo lo pagado asume estado cancelado
                fechaVencimientoPago: null
            });

            inputMonto.value = '';
            renderPagosMixtos();
        });
    }

    function renderPagosMixtos() {
        const container = document.getElementById('pagos-mixtos-container');
        const balanceIndicator = document.getElementById('payment-balance-indicator');
        const inputMonto = document.getElementById('compra-pago-monto');

        if (!container) return;
        container.innerHTML = '';

        let totalPagosActuales = 0;

        // Render Píldoras
        pagosMixtos.forEach((pago, index) => {
            totalPagosActuales += parseFloat(pago.importe);

            let detallesVueltoHtml = '';
            if (pago.vuelto && parseFloat(pago.vuelto) > 0) {
                detallesVueltoHtml = `<div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Entregó: $${formatoMoneda.format(pago.montoEntregado)} | Vuelto: $${formatoMoneda.format(pago.vuelto)}</div>`;
            }

            const cardHtml = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-weight: 600; font-size: 0.85rem; color: #475569;">${pago.nombreMetodo}</span>
                            <span style="font-size: 0.85rem; font-weight: 500; color: #1e293b;">$${formatoMoneda.format(pago.importe)}</span>
                        </div>
                        ${detallesVueltoHtml}
                    </div>
                    <button type="button" class="btn-icon btn-delete-pago" data-index="${index}" style="color: #94a3b8; background: none; border: none; cursor: pointer; padding: 2px 6px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });

        container.querySelectorAll('.btn-delete-pago').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                pagosMixtos.splice(idx, 1);
                renderPagosMixtos();
            });
        });

        // UI de Saldo
        const totalCompraActual = calcularTotalGenerico(detalleItems);

        // Sumar lo tippeado en el input para el display instantáneo (sin tocar "+")
        let sumFromInput = 0;
        if (inputMonto && inputMonto.value) {
            const parsed = parsearMoneda(inputMonto.value);
            if (!isNaN(parsed)) sumFromInput = parsed;
        }

        const diff = totalCompraActual - (totalPagosActuales + sumFromInput);

        if (balanceIndicator) {
            balanceIndicator.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                    <span style="color: #cfe2ff; font-size: 0.9rem;">Pagado ahora</span>
                    <span style="color: #fff; font-weight: 600; font-size: 0.95rem;">$${formatoMoneda.format(totalPagosActuales + sumFromInput)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                    <span style="color: #cfe2ff; font-size: 0.9rem;">Saldo pendiente</span>
                    <span style="color: ${diff > 0.05 ? '#ff6b6b' : '#fff'}; font-weight: 700; font-size: 0.95rem;">$${formatoMoneda.format(diff > 0 ? diff : 0)}</span>
                </div>
            `;
        }

        // Mostrar / Ocultar el input de Fecha a Pagar si hay Saldo Pendiente
        const dateContainer = document.getElementById('compra-fecha-programada-container');
        if (dateContainer) {
            if (diff > 0.05) {
                dateContainer.style.display = 'block';
            } else {
                dateContainer.style.display = 'none';
                const scheduledInput = document.getElementById('compra-fecha-programada-pago');
                if (scheduledInput) {
                    scheduledInput.value = ''; // Limpiar si se ocultó
                    scheduledInput.style.border = '1px solid #ced4da';
                }
            }
        }

        // Bloquear inputs de pago si el saldo REAL (sin contar lo tippeado) está cubierto
        const selectMetodo = document.getElementById('compra-metodo-pago');
        const inputPago = document.getElementById('compra-pago-monto');
        const btnAddPago = document.getElementById('btn-add-pago-mixto');

        if (selectMetodo && inputPago && btnAddPago) {
            const saldoReal = totalCompraActual - totalPagosActuales;
            if (saldoReal <= 0.05 && totalCompraActual > 0) {
                selectMetodo.disabled = true;
                inputPago.disabled = true;
                btnAddPago.disabled = true;
                inputPago.value = ''; // Limpia el input si ya llegamos al total

                selectMetodo.style.backgroundColor = '#f1f5f9';
                inputPago.style.backgroundColor = '#f1f5f9';
                btnAddPago.style.opacity = '0.5';
                btnAddPago.style.cursor = 'not-allowed';
            } else {
                selectMetodo.disabled = false;
                inputPago.disabled = false;
                btnAddPago.disabled = false;

                selectMetodo.style.backgroundColor = 'white';
                inputPago.style.backgroundColor = 'white';
                btnAddPago.style.opacity = '1';
                btnAddPago.style.cursor = 'pointer';
            }
        }
        
        if (typeof validarEfectivoEnTiempoReal === 'function') {
            validarEfectivoEnTiempoReal();
        }
    }

    const originalRenderDetalleTemporal = renderDetalleTemporal;
    renderDetalleTemporal = function () {
        originalRenderDetalleTemporal();
        renderPagosMixtos();
    };

    // Render initially to show empty balance cards
    renderPagosMixtos();

});
