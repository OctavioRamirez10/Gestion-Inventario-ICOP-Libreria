document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_VENTAS_URL = '/api/ventas';
    const API_PRODUCTOS_URL = '/api/productos/select';
    const API_CLIENTES_URL = '/api/clientes/select';
    const API_CLIENTES_BASE_URL = '/api/clientes';
    const API_METODOS_PAGO_URL = '/api/metodos-pago/activos';

    // =================================================================
    // --- CONFIGURACIÓN DE FORMATO ---
    // =================================================================
    // Formateador para MOSTRAR (ej: 54.000 o 1.500,50)
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    // Función para parsear valores Monetarios (ej: "1.500" o "1500,50")
    function parsearMoneda(valor) {
        if (!valor) return NaN;
        const limpio = valor.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(limpio);
    }

    // ===============================
    // SELECTORES FORMULARIO VENTA
    // ===============================
    const ventaForm = document.getElementById('venta-form');

    // --- Selectores Buscador Cliente ---
    const clienteSearchInput = document.getElementById('venta-cliente-search');
    const clienteHiddenInput = document.getElementById('venta-cliente-id-hidden');
    const clienteResultsContainer = document.getElementById('venta-cliente-results');
    const clienteError = document.getElementById('errorVentaCliente');

    // --- Selectores Buscador Producto ---
    const productSearchInput = document.getElementById('product-search');
    const productResultsContainer = document.getElementById('product-results');

    // --- Selectores Detalle Venta ("Carrito") ---
    const ventaDetalleTemporalBody = document.getElementById('venta-detalle-temporal');
    const totalVentaDisplay = document.getElementById('total-venta');

    // --- Mensajes de Error ---
    const errorProducto = document.getElementById('errorProducto');
    const errorDetalleGeneral = document.getElementById('errorStockVenta');
    const generalMessage = document.getElementById('form-general-message-venta');

    // --- Selectores Gestión de Cobros ---
    const cobroMetodoSelect = document.getElementById('venta-cobro-metodo');
    const cobroMontoInput = document.getElementById('venta-cobro-monto');
    const cobroTipoTarjetaSelect = document.getElementById('venta-cobro-tipo-tarjeta');
    const errorMetodoPago = document.getElementById('errorMetodoPago');
    let cobrosMixtos = [];

    // Legacy — ya no están en HTML, pero se deja null para no romper refs dispersas
    const metodoPagoSelect = null;
    const tipoTarjetaSelect = null;

    // --- Navegación con teclado en dropdowns ---
    let clienteSelectedIndex = -1;
    let productoSelectedIndex = -1;

    // --- Selectores Descuento ---
    const descuentoInput = document.getElementById('descuento-venta');
    const tipoDescuentoSelect = document.getElementById('tipo-descuento-venta');
    const descuentoDisplay = document.getElementById('descuento-aplicado-display');
    const montoDescuentoMostrado = document.getElementById('monto-descuento-mostrado');
    const subtotalVentaDisplay = document.getElementById('subtotal-venta');
    const errorDescuento = document.getElementById('errorDescuento');

    // ===================================
    // SELECTORES - MODAL NUEVO CLIENTE
    // ===================================
    const addClienteModal = document.getElementById('modal-add-cliente-overlay');
    const addClienteBtn = document.getElementById('btn-add-cliente');
    const addClienteCloseBtn = document.getElementById('modal-add-cliente-close');
    const addClienteForm = document.getElementById('add-cliente-form');
    const addClienteMessage = document.getElementById('form-general-message-add-cliente');

    // ===================================
    // SELECTORES - MODAL TICKET
    // ===================================
    const modalTicketOverlay = document.getElementById('modal-ticket-overlay');
    const btnGenerarTicket = document.getElementById('btn-generar-ticket');
    const btnCerrarTicket = document.getElementById('btn-cerrar-ticket');

    // Variable para guardar el ID de la última venta
    let ultimaVentaId = null;

    // Función para mostrar modal ticket
    function mostrarModalTicket(idVenta) {
        console.log('Mostrando modal ticket para venta:', idVenta);
        ultimaVentaId = idVenta;
        if (modalTicketOverlay) {
            console.log('Modal encontrado, mostrando...');
            modalTicketOverlay.style.display = 'block';
        } else {
            console.log('Modal NO encontrado en el DOM');
        }
    }

    // Función para cerrar modal ticket
    function cerrarModalTicket() {
        if (modalTicketOverlay) {
            modalTicketOverlay.style.display = 'none';
        }
        ultimaVentaId = null;
    }

    // Event listeners para botones del modal ticket
    if (btnGenerarTicket) {
        btnGenerarTicket.addEventListener('click', async () => {
            if (!ultimaVentaId) return;
            try {
                const response = await fetch(`/api/ventas/${ultimaVentaId}/ticket`);
                if (!response.ok) throw new Error('Error al generar ticket');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ticket_Venta_${ultimaVentaId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Error al descargar ticket:', error);
                alert('Error al generar el ticket');
            }
            cerrarModalTicket();
        });
    }

    if (btnCerrarTicket) {
        btnCerrarTicket.addEventListener('click', cerrarModalTicket);
    }

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalTicketOverlay && modalTicketOverlay.style.display !== 'none') {
            cerrarModalTicket();
        }
    });

    // Click fuera del modal para cerrar (en el div interno)
    if (modalTicketOverlay) {
        const modalInner = modalTicketOverlay.firstElementChild;
        if (modalInner) {
            modalInner.addEventListener('click', (e) => {
                // Solo cerrar si hace click en el fondo oscuro
                if (e.target === modalInner) {
                    cerrarModalTicket();
                }
            });
        }
    }

    // ===============================
    // RESTRICCIÓN DE CAMPO TELÉFONO CLIENTE
    // Solo permite dígitos, + y espacios. Soporta copiar/pegar.
    // ===============================
    function restrictTelefonoInput(input) {
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
            this.value = this.value.slice(0, start) + sanitized + this.value.slice(end);
            this.selectionStart = this.selectionEnd = start + sanitized.length;
        });
    }

    restrictTelefonoInput(document.getElementById('addClienteTelefono'));

    // ===============================
    // VALIDACIÓN DNI DUPLICADO (en tiempo real al salir del campo)
    // ===============================
    const addClienteDNIInput = document.getElementById('addClienteDNI');
    const errorAddClienteDNIEl = document.getElementById('errorAddClienteDNI');
    if (addClienteDNIInput && errorAddClienteDNIEl) {
        addClienteDNIInput.addEventListener('blur', async function () {
            const dni = this.value.trim();
            if (!dni) { errorAddClienteDNIEl.textContent = ''; return; }
            try {
                const response = await fetch(`/api/clientes/existe/dni/${encodeURIComponent(dni)}`);
                const existe = await response.json();
                errorAddClienteDNIEl.textContent = existe ? 'Ya existe un cliente con ese DNI.' : '';
            } catch (err) {
                console.error('Error al verificar DNI:', err);
            }
        });
    }

    // ===============================
    // HELPERS DE FECHA
    // ===============================
    function getFechaActual() {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    }

    function refrescarFechaVentaDisplay() {
        const hoy = new Date();
        const dd = String(hoy.getDate()).padStart(2, '0');
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const el = document.getElementById('fecha-venta-valor');
        if (el) el.textContent = `${dd}/${mm}/${hoy.getFullYear()}`;
    }
    refrescarFechaVentaDisplay();

    // ===============================
    // HELPERS DE FORMATO
    // ===============================
    function capitalizarNombre(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function actualizarSeleccionKeyboard(items, selectedIndex) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function formatearDNI(dni) {
        if (!dni) return '';
        // Remover puntos existentes y formatear
        const soloNumeros = dni.replace(/\./g, '');
        return soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function formatearFechaHora(dateInput) {
        if (!dateInput) return 'N/A';
        let date;
        if (Array.isArray(dateInput)) {
            const [year, month, day, hour = 0, minute = 0] = dateInput;
            date = new Date(year, month - 1, day, hour, minute);
        } else if (typeof dateInput === 'string') {
            const parts = dateInput.split(/\D+/);
            if (parts.length >= 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const hour = parts[3] ? parseInt(parts[3], 10) : 0;
                const minute = parts[4] ? parseInt(parts[4], 10) : 0;
                date = new Date(year, month, day, hour, minute);
            } else {
                date = new Date(dateInput);
            }
        } else {
            return 'N/A';
        }

        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        const hr = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');

        return `${d}/${m}/${y} ${hr}:${min} hs`;
    }

    // ===============================
    // SELECTORES TABLA HISTORIAL
    // ===============================
    const ventaTableBody = document.querySelector('#tabla-ventas tbody');
    const ventasPageInfo = document.getElementById('ventas-page-info');
    const ventasPrevPageBtn = document.getElementById('ventas-prev-page');
    const ventasNextPageBtn = document.getElementById('ventas-next-page');
    const mainContent = document.querySelector('.main-content');
    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let todosLosProductos = [];
    let todosLosClientes = [];
    let productoSeleccionado = null;
    let detallesVenta = [];

    // --- Estado de Paginación ---
    let currentPageVentas = 0;
    const pageSizeVentas = 7;
    let totalPagesVentas = 0;
    let ventasSortField = 'fecha';
    let ventasSortDirection = 'desc';

    // --- Variables para rastrear el cliente anterior ---
    let previousClienteId = null;
    let previousClienteNombre = '';
    let productosStockDesactualizado = false; // flag: recarga stock antes de la próxima búsqueda

    // --- Variables para búsqueda y filtrado (todo server-side) ---
    const ventasSearchInput = document.getElementById('ventas-search-input');
    const ventasFechaInicio = document.getElementById('ventas-fecha-inicio');
    const ventasFechaFin = document.getElementById('ventas-fecha-fin');
    const ventasBtnFiltrar = document.getElementById('ventas-btn-filtrar');
    const ventasBtnLimpiar = document.getElementById('ventas-btn-limpiar-filtro');
    const ventasFiltroError = document.getElementById('ventas-filtro-error');
    const btnSortFecha = document.getElementById('ventas-sort-fecha');
    const btnSortTotal = document.getElementById('ventas-sort-total');
    const filtroVendedor = document.getElementById('ventas-filtro-vendedor');
    const filtroMetodoPago = document.getElementById('ventas-filtro-metodo-pago');
    const sortButtons = [btnSortFecha, btnSortTotal].filter(Boolean);

    // Función helper para mostrar mensajes de error inline
    function mostrarErrorFiltroVentas(mensaje) {
        if (ventasFiltroError) {
            ventasFiltroError.textContent = mensaje;
            ventasFiltroError.style.display = 'block';
            setTimeout(() => {
                ventasFiltroError.style.display = 'none';
            }, 4000);
        }
    }

    function ocultarErrorFiltroVentas() {
        if (ventasFiltroError) {
            ventasFiltroError.style.display = 'none';
            ventasFiltroError.textContent = '';
        }
    }


    // ==========================================================
    // LÓGICA DE CARGA DE DATOS
    // ==========================================================

    async function loadVentas(page = 0) {
        if (!ventaTableBody || !mainContent) return;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        ventaTableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = `&sort=${ventasSortField},${ventasSortDirection}`;

            const searchText = ventasSearchInput ? ventasSearchInput.value.trim() : '';
            const searchParam = searchText ? `&search=${encodeURIComponent(searchText)}` : '';

            const inicioVal = ventasFechaInicio ? ventasFechaInicio.value : '';
            const finVal = ventasFechaFin ? ventasFechaFin.value : '';
            const fechaParam = (inicioVal && finVal) ? `&inicio=${inicioVal}&fin=${finVal}` : '';

            const vendedorVal = filtroVendedor ? filtroVendedor.value : '';
            const vendedorParam = vendedorVal ? `&vendedorId=${vendedorVal}` : '';

            const metodoVal = filtroMetodoPago ? filtroMetodoPago.value : '';
            const metodoParam = metodoVal ? `&metodoPagoId=${metodoVal}` : '';

            const url = `${API_VENTAS_URL}?page=${page}&size=${pageSizeVentas}${sortParam}${searchParam}${fechaParam}${vendedorParam}${metodoParam}`;

            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const pageData = await response.json();
            currentPageVentas = pageData.number;
            totalPagesVentas = pageData.totalPages;

            renderVentasTable(pageData.content);
            updateVentasPaginationControls();
            updateVentasSortIndicators();

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                ventaTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar las ventas:', error);
            if (ventaTableBody) {
                ventaTableBody.innerHTML = `<tr><td colspan="7">Error al cargar el historial de ventas.</td></tr>`;
            }
            currentPageVentas = 0;
            totalPagesVentas = 0;
            renderVentasTable([]);
            updateVentasPaginationControls();
            ventaTableBody.classList.remove('loading');
        }
    }

    async function loadProductosParaSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            todosLosProductos = await response.json();
            console.log("Productos actualizados en Ventas:", todosLosProductos.length); // Log para verificar
        } catch (error) {
            console.error('Error al cargar productos:', error);
            if (errorProducto) errorProducto.textContent = "No se pudieron cargar los productos.";
        }
    }

    async function loadClientesParaVenta() {
        if (!clienteSearchInput) return;
        try {
            const response = await fetch(API_CLIENTES_URL);
            if (!response.ok) throw new Error('Error al cargar clientes');
            todosLosClientes = await response.json();
        } catch (error) {
            console.error(error);
            clienteSearchInput.placeholder = "Error al cargar clientes";
        }
    }

    // ==========================================================
    function formatDni(digits) {
        digits = digits.slice(0, 8);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return digits.slice(0, -3) + '.' + digits.slice(-3);
        return digits.slice(0, -6) + '.' + digits.slice(-6, -3) + '.' + digits.slice(-3);
    }

    function restrictDniInput(input) {
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
            const digits = this.value.replace(/\D/g, '').slice(0, 9);
            const formatted = formatDni(digits);
            this.value = formatted;
            let count = 0, newPos = formatted.length;
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
            const newDigits = (beforeDigits + pasted.replace(/\D/g, '') + afterDigits).slice(0, 9);
            this.value = formatDni(newDigits);
            this.dispatchEvent(new Event('input'));
        });
    }

    function bindLimitCliente(input, max) {
        if (!input) return;
        input.addEventListener('input', () => {
            if (input.value.length >= max) {
                if (window.mostrarErrorInline) window.mostrarErrorInline(input.id, `Límite de ${max} caracteres alcanzado.`);
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline(input.id);
            }
        });
    }

    const modalAddClienteInputs = [
        { id: 'addClienteNombre', max: 70 },
        { id: 'addClienteApellido', max: 70 },
        { id: 'addClienteDNI', max: 10 },
        { id: 'addClienteTelefono', max: 20 },
        { id: 'addClienteDireccion', max: 100 },
        { id: 'addClienteEmail', max: 80 }
    ];
    modalAddClienteInputs.forEach(item => {
        bindLimitCliente(document.getElementById(item.id), item.max);
    });

    bindLimitCliente(document.getElementById('venta-cliente-search'), 70);
    bindLimitCliente(document.getElementById('product-search'), 60);

    restrictDniInput(document.getElementById('addClienteDNI'));

    const handleAddClienteEsc = (e) => {
        if (e.key === 'Escape') closeAddClienteModal();
    };

    function resetAddClienteModal() {
        if (addClienteForm) addClienteForm.reset();
        if (addClienteMessage) {
            addClienteMessage.textContent = '';
            addClienteMessage.className = 'form-message';
        }
        if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('addCliente');
    }

    function openAddClienteModal() {
        if (!addClienteModal) return;
        resetAddClienteModal();
        addClienteModal.style.display = 'flex';
        document.getElementById('addClienteNombre').focus();

        // Agregar listener para ESC
        window.addEventListener('keydown', handleAddClienteEsc);
    }

    function closeAddClienteModal() {
        if (!addClienteModal) return;
        addClienteModal.style.display = 'none';

        // Remover listener para ESC
        window.removeEventListener('keydown', handleAddClienteEsc);
    }

    async function handleAddClienteSubmit(event) {
        event.preventDefault();

        if (addClienteMessage) {
            addClienteMessage.textContent = '';
            addClienteMessage.classList.remove('error', 'success');
        }

        let isValid = true;

        // Obtener valores
        const nombre = document.getElementById('addClienteNombre').value.trim();
        const apellido = document.getElementById('addClienteApellido').value.trim();
        const dni = document.getElementById('addClienteDNI').value.trim().replace(/[^0-9]/g, '');
        const telefono = document.getElementById('addClienteTelefono').value.trim();
        const direccion = document.getElementById('addClienteDireccion').value.trim();
        const email = document.getElementById('addClienteEmail').value.trim();

        // Validación: campos obligatorios
        if (!nombre) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteNombre', 'El nombre es obligatorio.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteNombre');
        }

        if (!apellido) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteApellido', 'El apellido es obligatorio.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteApellido');
        }

        if (!dni) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteDNI', 'El DNI es obligatorio.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteDNI');
            try {
                const dniCheckResponse = await fetch(`/api/clientes/existe/dni/${encodeURIComponent(dni)}`);
                const dniExiste = await dniCheckResponse.json();
                if (dniExiste) {
                    if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteDNI', 'Ya existe un cliente con ese DNI.');
                    isValid = false;
                }
            } catch (err) {
                console.error('Error al verificar DNI:', err);
            }
        }

        if (!telefono) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteTelefono', 'El teléfono es obligatorio.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteTelefono');
        }

        if (!direccion) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteDireccion', 'La dirección es obligatoria.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteDireccion');
        }

        if (!email) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteEmail', 'El email es obligatorio.');
            isValid = false;
        } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addClienteEmail', 'El formato del email no es válido.');
            isValid = false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('addClienteEmail');
        }

        if (!isValid) return;

        const clienteRequestDTO = {
            nombre: nombre,
            apellido: apellido || null,
            dni: dni,
            telefono: telefono || null,
            direccion: direccion || null,
            email: email || null
        };

        try {
            const response = await fetch(API_CLIENTES_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clienteRequestDTO)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `Error ${response.status}`;
                try { errorMsg = JSON.parse(errorText).message || errorText; } catch { errorMsg = errorText; }
                throw new Error(errorMsg);
            }

            const nuevoCliente = await response.json();
            closeAddClienteModal();

            const nombreCompleto = `${capitalizarNombre(nuevoCliente.nombre)} ${capitalizarNombre(nuevoCliente.apellido)} (${formatearDNI(nuevoCliente.dni)})`;
            clienteSearchInput.value = nombreCompleto.trim();
            clienteHiddenInput.value = nuevoCliente.idCliente;
            if (clienteError) clienteError.textContent = '';

            loadClientesParaVenta();

        } catch (error) {
            console.error('Error al crear cliente:', error);
            if (addClienteMessage) {
                addClienteMessage.textContent = error.message;
                addClienteMessage.classList.add('error');
            }
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE CLIENTES
    // ==========================================================

    function renderResultadosClientes(clientes) {
        if (clientes.length === 0) {
            clienteResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron clientes</div>';
        } else {
            // Separar "Consumidor Final" del resto
            const consumidorFinal = clientes.find(c =>
                c.nombre && c.nombre.toLowerCase() === 'consumidor' &&
                c.apellido && c.apellido.toLowerCase() === 'final'
            );

            const otrosClientes = clientes.filter(c =>
                !(c.nombre && c.nombre.toLowerCase() === 'consumidor' &&
                    c.apellido && c.apellido.toLowerCase() === 'final')
            );

            // Ordenar el resto alfabéticamente
            const clientesOrdenados = [...otrosClientes].sort((a, b) => {
                const nombreA = `${a.nombre} ${a.apellido || ''}`.toLowerCase();
                const nombreB = `${b.nombre} ${b.apellido || ''}`.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });

            // Consumidor Final primero, luego los demás
            const clientesFinal = consumidorFinal
                ? [consumidorFinal, ...clientesOrdenados]
                : clientesOrdenados;

            clienteResultsContainer.innerHTML = clientesFinal.map(c => {
                const nombre = capitalizarNombre(c.nombre);
                const apellido = capitalizarNombre(c.apellido);

                // Si es Consumidor Final, no mostrar DNI
                const esConsumidorFinal = c.nombre && c.nombre.toLowerCase() === 'consumidor' &&
                    c.apellido && c.apellido.toLowerCase() === 'final';

                let nombreCompleto;
                if (esConsumidorFinal) {
                    nombreCompleto = `${nombre} ${apellido}`;
                } else {
                    const dniFormateado = formatearDNI(c.dni);
                    nombreCompleto = `${nombre} ${apellido} (${dniFormateado})`;
                }
                return `<div class="product-result-item" data-id="${c.id}">${nombreCompleto.trim()}</div>`;
            }).join('');
        }
        clienteResultsContainer.style.display = 'block';
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE CLIENTES
    // ==========================================================

    function removeAccents(str) {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    }

    function filtrarClientes() {
        const query = removeAccents(clienteSearchInput.value.toLowerCase());
        const terminosBusqueda = query.split(' ').filter(term => term.length > 0);

        const clientesFiltrados = todosLosClientes.filter(c => {
            const nombreCompleto = removeAccents(`${c.nombre ? c.nombre.toLowerCase() : ''} ${c.apellido ? c.apellido.toLowerCase() : ''} ${c.dni ? c.dni.toLowerCase() : ''}`);
            return terminosBusqueda.every(term => nombreCompleto.includes(term));
        });

        renderResultadosClientes(clientesFiltrados);
    }

    function seleccionarCliente(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const clienteIdNum = parseInt(target.dataset.id, 10);
        const cliente = todosLosClientes.find(c => c.id === clienteIdNum);

        if (cliente) {
            const newClienteId = cliente.id.toString();
            const nombreCompleto = `${capitalizarNombre(cliente.nombre)} ${capitalizarNombre(cliente.apellido)} (${formatearDNI(cliente.dni)})`;

            // Verificar si hay productos en el detalle y si el cliente es diferente
            if (detallesVenta.length > 0 && previousClienteId && newClienteId !== previousClienteId) {
                showConfirmationModal(
                    `Ya tienes ${detallesVenta.length} producto${detallesVenta.length > 1 ? 's' : ''} agregado${detallesVenta.length > 1 ? 's' : ''}.\nCambiar de cliente borrará el detalle actual.\n¿Deseas continuar?`,
                    () => {
                        // Usuario confirmó: limpiar detalle y cambiar cliente
                        detallesVenta = [];
                        renderDetalleTemporal();
                        clienteSearchInput.value = nombreCompleto.trim();
                        clienteHiddenInput.value = newClienteId;
                        previousClienteId = newClienteId;
                        previousClienteNombre = nombreCompleto;
                        clienteResultsContainer.style.display = 'none';
                        if (clienteError) clienteError.textContent = '';
                    },
                    () => {
                        // Usuario canceló: revertir al cliente anterior
                        clienteSearchInput.value = previousClienteNombre;
                        clienteHiddenInput.value = previousClienteId;
                        clienteResultsContainer.style.display = 'none';
                    }
                );
            } else {
                // No hay productos o es el mismo cliente: cambiar sin confirmación
                clienteSearchInput.value = nombreCompleto.trim();
                clienteHiddenInput.value = newClienteId;
                previousClienteId = newClienteId;
                previousClienteNombre = nombreCompleto;
                clienteResultsContainer.style.display = 'none';
                if (clienteError) clienteError.textContent = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline('venta-cliente-search');
            }
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE PRODUCTOS
    // ==========================================================

    async function buscarProductos() {
        // Si hubo una venta reciente, recargar el stock antes de filtrar
        if (productosStockDesactualizado) {
            productosStockDesactualizado = false;
            await loadProductosParaSelect();
        }

        const query = removeAccents(productSearchInput.value.toLowerCase().trim());

        // Si el campo está vacío o solo tiene espacios, mostrar todos los productos
        const productosFiltrados = query === ''
            ? todosLosProductos
            : todosLosProductos.filter(producto => {
                return removeAccents(producto.nombreProducto.toLowerCase()).includes(query);
            });
        renderResultadosProductos(productosFiltrados);
    }

    function renderResultadosProductos(productos) {
        if (productos.length === 0) {
            productResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
            productResultsContainer.style.display = 'block';
            return;
        }

        // Ordenar alfabéticamente por nombre
        const productosOrdenados = [...productos].sort((a, b) =>
            a.nombreProducto.localeCompare(b.nombreProducto, 'es', { sensitivity: 'base' })
        );

        // Capitalizar cada palabra
        function capitalizarPalabras(texto) {
            return texto.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        productResultsContainer.innerHTML = productosOrdenados.map(producto => {
            const stockActual = producto.stockActual || 0;
            const stockColor = stockActual > 10 ? '#28a745' : stockActual > 0 ? '#ffc107' : '#dc3545';
            const stockText = stockActual > 0 ? `Stock: ${stockActual}` : 'Sin stock';
            const nombreCapitalizado = capitalizarPalabras(producto.nombreProducto);

            return `
                <div class="product-result-item" data-id="${producto.idProducto}">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: 500;">${nombreCapitalizado}</span>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <span style="color: ${stockColor}; font-weight: 600; font-size: 12px;">
                                <i class="fas fa-box"></i> ${stockText}
                            </span>
                            <span style="color: #000000; font-weight: 600;">
                                $${formatoMoneda.format(producto.precioVenta)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        productResultsContainer.style.display = 'block';
    }

    function seleccionarProducto(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const productoId = Number(target.dataset.id);
        const producto = todosLosProductos.find(p => p.idProducto === productoId);
        if (!producto) return;

        // Verificar stock
        if ((producto.stockActual || 0) <= 0) {
            if (errorProducto) {
                errorProducto.textContent = "No se puede agregar un producto con stock agotado.";
                setTimeout(() => errorProducto.textContent = '', 3000);
            }
            return;
        }

        // Limpiar input y cerrar dropdown
        productSearchInput.value = '';
        productResultsContainer.innerHTML = '';
        productResultsContainer.style.display = 'none';
        productoSelectedIndex = -1;

        // Si ya está en el detalle: resaltar fila y no agregar
        const existente = detallesVenta.find(d => d.idProducto === productoId);
        if (existente) {
            const fila = ventaDetalleTemporalBody.querySelector(`tr[data-id="${productoId}"]`);
            if (fila) {
                fila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                fila.classList.remove('row-highlight');
                void fila.offsetWidth; // reinicia la animación
                fila.classList.add('row-highlight');
            }
            return;
        }

        // Agregar al detalle con cantidad 0
        detallesVenta.push({
            idProducto: producto.idProducto,
            nombreProducto: producto.nombreProducto,
            precioVenta: producto.precioVenta,
            cantidad: 0,
            stockAlAgregar: producto.stockActual || 0
        });
        renderDetalleTemporal();

        // Limpiar error previo
        if (errorDetalleGeneral) {
            errorDetalleGeneral.textContent = '';
            errorDetalleGeneral.style.display = 'none';
        }
        if (window.limpiarErroresInline) window.limpiarErroresInline('product-search');
    }

    // ==========================================================
    // LÓGICA DEL DETALLE DE VENTA ("CARRITO")
    // ==========================================================

    function cambiarCantidadDetalle(index, delta) {
        const item = detallesVenta[index];
        if (!item) return;
        const nueva = item.cantidad + delta;
        if (nueva < 0) return;

        const fila = ventaDetalleTemporalBody.querySelector(`tr[data-id="${item.idProducto}"]`);
        const qtyInput = fila ? fila.querySelector('.qty-input') : null;

        if (nueva > item.stockAlAgregar) {
            if (qtyInput) {
                window.mostrarTooltipStock(qtyInput, `Stock disponible: ${item.stockAlAgregar} unidades.`);
            }
            return;
        }
        item.cantidad = nueva;
        renderDetalleTemporal();
    }

    function renderDetalleTemporal() {
        ventaDetalleTemporalBody.innerHTML = '';
        let totalAcumulado = 0;

        if (detallesVenta.length === 0) {
            ventaDetalleTemporalBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999;">Buscá un producto y hacé click para agregarlo...</td></tr>';
            totalVentaDisplay.textContent = '$0.00';
            if (subtotalVentaDisplay) subtotalVentaDisplay.textContent = '$0.00';
            if (descuentoDisplay) descuentoDisplay.style.display = 'none';
            return;
        }

        detallesVenta.forEach((item, index) => {
            const subtotal = item.precioVenta * item.cantidad;

            const row = `
                <tr data-id="${item.idProducto}">
                    <td>${item.nombreProducto}</td>
                    <td class="col-num">${item.stockAlAgregar}</td>
                    <td class="col-num col-qty">
                        <div class="qty-stepper">
                            <button type="button" class="btn-qty btn-qty-minus" data-index="${index}">−</button>
                            <input type="number" class="qty-input" data-index="${index}" value="${item.cantidad}" min="0" max="${item.stockAlAgregar}" inputmode="numeric" onkeypress="return event.charCode >= 48 && event.charCode <= 57">
                            <button type="button" class="btn-qty btn-qty-plus" data-index="${index}">+</button>
                        </div>
                    </td>
                    <td class="col-num">$${formatoMoneda.format(item.precioVenta)}</td>
                    <td class="col-num col-subtotal">$${formatoMoneda.format(subtotal)}</td>
                    <td>
                        <button type="button" class="btn-icon btn-delete-detalle" data-id="${item.idProducto}" title="Quitar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            ventaDetalleTemporalBody.innerHTML += row;
        });

        actualizarSubtotalesYTotales();
    }

    function actualizarSubtotalesYTotales() {
        let totalAcumulado = 0;
        detallesVenta.forEach(item => {
            const subtotal = item.precioVenta * item.cantidad;
            totalAcumulado += subtotal;
            const fila = ventaDetalleTemporalBody.querySelector(`tr[data-id="${item.idProducto}"]`);
            if (fila) {
                const cell = fila.querySelector('.col-subtotal');
                if (cell) cell.textContent = `$${formatoMoneda.format(subtotal)}`;
            }
        });

        if (subtotalVentaDisplay) subtotalVentaDisplay.textContent = `$${formatoMoneda.format(totalAcumulado)}`;

        const tipoDescuento = tipoDescuentoSelect?.value || '$';
        const descuento = tipoDescuento === '$' ? (parsearMoneda(descuentoInput?.value) || 0) : (parseFloat((descuentoInput?.value || '').replace(',', '.')) || 0);
        let descuentoMonto = 0;
        let totalConDescuento = totalAcumulado;

        if (descuento > 0 && totalAcumulado > 0) {
            if (tipoDescuento === '%') {
                descuentoMonto = totalAcumulado * (descuento / 100);
            } else {
                descuentoMonto = descuento;
            }
            descuentoMonto = Math.min(descuentoMonto, totalAcumulado);
            totalConDescuento = totalAcumulado - descuentoMonto;
            if (descuentoDisplay) {
                descuentoDisplay.style.display = 'flex';
                if (montoDescuentoMostrado) montoDescuentoMostrado.textContent = `-${formatoMoneda.format(descuentoMonto)}`;
            }
        } else {
            if (descuentoDisplay) descuentoDisplay.style.display = 'none';
        }

        if (totalConDescuento <= 0 && descuento > 0) {
            if (errorDescuento) {
                errorDescuento.textContent = 'El total con descuento debe ser mayor a $0.';
                errorDescuento.style.display = 'block';
            }
        } else {
            if (errorDescuento) {
                errorDescuento.textContent = '';
                errorDescuento.style.display = 'none';
            }
        }

        totalVentaDisplay.textContent = `$${formatoMoneda.format(totalConDescuento)}`;
        renderCobrosMixtos();
    }

    // ==========================================================
    // LÓGICA DE ENVÍO DE FORMULARIO (SUBMIT)
    // ==========================================================

    async function saveVenta(event) {
        event.preventDefault();

        generalMessage.textContent = '';
        generalMessage.className = 'form-message';
        window.limpiarTodosErroresInline('venta-cliente-search');
        window.limpiarTodosErroresInline('product-search');
        window.limpiarTodosErroresInline('descuento-venta');
        window.limpiarTodosErroresInline('venta-cobro-metodo');
        window.limpiarTodosErroresInline('venta-cobro-monto');
        window.limpiarTodosErroresInline('venta-paga-con');

        const fechaVenta = getFechaActual();
        const idCliente = clienteHiddenInput.value;

        let isValid = true;

        if (!idCliente) {
            window.mostrarErrorInline('venta-cliente-search', 'Debe seleccionar un cliente.');
            isValid = false;
        }

        if (detallesVenta.length === 0) {
            window.mostrarErrorInline('product-search', 'Debe agregar al menos un producto.');
            isValid = false;
        }

        const itemsSinCantidad = detallesVenta.filter(d => d.cantidad < 1);
        if (itemsSinCantidad.length > 0) {
            itemsSinCantidad.forEach(item => {
                const fila = ventaDetalleTemporalBody.querySelector(`tr[data-id="${item.idProducto}"]`);
                const qtyInput = fila ? fila.querySelector('.qty-input') : null;
                if (qtyInput) {
                    window.mostrarTooltipStock(qtyInput, 'La cantidad debe ser mayor a 0.');
                }
            });
            isValid = false;
        }

        // Calcular totales (debe ir antes de validar cobros)
        let descuentoMonto = 0;
        const tipoDescuento = tipoDescuentoSelect?.value || '$';
        const descuento = tipoDescuento === '$' ? (parsearMoneda(descuentoInput?.value) || 0) : (parseFloat((descuentoInput?.value || '').replace(',', '.')) || 0);
        let totalBase = 0;
        detallesVenta.forEach(item => { totalBase += item.precioVenta * item.cantidad; });
        if (descuento > 0 && totalBase > 0) {
            const d = tipoDescuento === '%' ? totalBase * (descuento / 100) : descuento;
            descuentoMonto = Math.min(d, totalBase);
        }
        const totalFinal = totalBase - descuentoMonto;

        // Auto-registro de cobro pendiente en inputs
        const cobroMetodoVal = cobroMetodoSelect?.value;
        if (cobroMetodoVal) {
            const added = intentarAgregarCobroAutomatico(totalFinal);
            if (!added) {
                isValid = false;
            }
        }

        if (!isValid) return;

        // Validar cobros
        if (cobrosMixtos.length === 0) {
            window.mostrarErrorInline('venta-cobro-metodo', 'Debe agregar al menos un cobro.');
            isValid = false;
        } else {
            const sumaCobros = cobrosMixtos.reduce((acc, c) => acc + parseFloat(c.importe), 0);
            if (Math.abs(sumaCobros - totalFinal) > 0.05) {
                window.mostrarErrorInline('venta-cobro-monto', `Los cobros no cubren el total.`);
                isValid = false;
            }
        }

        if (!isValid) {
            return;
        }

        showConfirmationModal("¿Estás seguro de que deseas registrar esta venta?", async () => {

            try {
                const detallesParaBackend = detallesVenta.map(item => {
                    return {
                        productoId: item.idProducto,
                        cantidad: item.cantidad,
                        precioUnitario: item.precioVenta
                    };
                });

                const ventaRequestDTO = {
                    fecha: fechaVenta,
                    idCliente: parseInt(idCliente),
                    detalles: detallesParaBackend,
                    cobros: cobrosMixtos.map(c => ({
                        idMetodoPago: c.idMetodoPago,
                        importe: c.importe,
                        tipoTarjeta: c.tipoTarjeta || null,
                        montoPagado: c.montoPagado || null,
                        vuelto: c.vuelto || null
                    })),
                    descuento: descuento,
                    tipoDescuento: tipoDescuento
                };

                const response = await fetch(API_VENTAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ventaRequestDTO),
                });

                if (!response.ok) {
                    const errorTexto = await response.text();
                    try {
                        const errorData = JSON.parse(errorTexto);
                        throw new Error(errorData.message || "Error desconocido del servidor.");
                    } catch (jsonError) {
                        throw new Error(errorTexto || `Error HTTP: ${response.status}`);
                    }
                }

                const ventaCreada = await response.json();

                // Mostrar modal de ticket — creado dinámicamente en body para evitar conflictos
                const existingModal = document.getElementById('modal-ticket-dinamico');
                if (existingModal) existingModal.remove();

                const ticketModal = document.createElement('div');
                ticketModal.id = 'modal-ticket-dinamico';
                ticketModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:999999;';
                ticketModal.innerHTML = `
                    <div style="background:white;padding:30px;border-radius:15px;text-align:center;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                        <h3 style="margin:0 0 20px 0;color:#333;"><i class="fas fa-print" style="color:#667eea;margin-right:10px;"></i>¿Desea imprimir ticket?</h3>
                        <p style="color:#666;margin-bottom:25px;">La venta se registró exitosamente.</p>
                        <div style="display:flex;gap:15px;justify-content:center;">
                            <button id="btn-ticket-si" style="padding:12px 25px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Sí, generar PDF</button>
                            <button id="btn-ticket-no" style="padding:12px 25px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">No</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(ticketModal);

                const cerrarTicketDinamico = () => ticketModal.remove();

                document.getElementById('btn-ticket-no').addEventListener('click', cerrarTicketDinamico);
                document.getElementById('btn-ticket-si').addEventListener('click', async () => {
                    try {
                        const res = await fetch(`/api/ventas/${ventaCreada.idVenta}/ticket`);
                        if (!res.ok) throw new Error('Error al generar ticket');
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `Ticket_Venta_${ventaCreada.idVenta}.pdf`;
                        document.body.appendChild(a); a.click();
                        window.URL.revokeObjectURL(url); a.remove();
                    } catch (err) {
                        console.error('Error descargando ticket:', err);
                        alert('No se pudo generar el ticket.');
                    }
                    cerrarTicketDinamico();
                });
                ticketModal.addEventListener('click', (e) => { if (e.target === ticketModal) cerrarTicketDinamico(); });
                document.addEventListener('keydown', function escHandler(e) {
                    if (e.key === 'Escape') { cerrarTicketDinamico(); document.removeEventListener('keydown', escHandler); }
                });

                // Resetear formulario
                detallesVenta = [];
                renderDetalleTemporal();
                clienteHiddenInput.value = '';
                clienteSearchInput.value = '';
                productSearchInput.value = '';
                // Resetear descuento
                if (descuentoInput) descuentoInput.value = '';
                if (tipoDescuentoSelect) tipoDescuentoSelect.value = '$';
                if (descuentoDisplay) descuentoDisplay.style.display = 'none';
                if (subtotalVentaDisplay) subtotalVentaDisplay.textContent = '$0.00';
                // Resetear cliente anterior
                previousClienteId = null;
                previousClienteNombre = '';

                // Resetear cobros
                cobrosMixtos = [];
                if (cobroMetodoSelect) cobroMetodoSelect.value = '';
                if (cobroMontoInput) cobroMontoInput.value = '';
                renderCobrosMixtos();
                await new Promise(resolve => setTimeout(resolve, 250));
                currentPageVentas = 0;
                ventasSortField = 'fecha';
                ventasSortDirection = 'desc';
                loadVentas(currentPageVentas);
                // Recargar productos para reflejar el stock actualizado
                productosStockDesactualizado = true;
                // Notificar al dashboard para que actualice los datos de hoy
                document.dispatchEvent(new Event('ventaRegistrada'));

            } catch (error) {
                console.error('Error al registrar la venta:', error);
                generalMessage.textContent = `Error: ${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // ==========================================================
    // LÓGICA DE TABLA DE VENTAS
    // ==========================================================
    function crearFilaVentaHTML(venta) {
        const fechaFormateada = formatearFechaHora(venta.fecha);

        const productosTexto = formatProductosList(venta.productos);
        const nombreClienteTexto = venta.nombreCliente || 'Cliente N/A';
        const nombreVendedorTexto = venta.nombreVendedor || 'N/A';
        const metodoPagoTexto = venta.metodoPago || 'No especificado';

        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${nombreClienteTexto}</td> 
                <td>${productosTexto}</td> 
                <td class="col-num">$${formatoMoneda.format(venta.total)}</td>
                <td>${nombreVendedorTexto}</td>
                <td>${metodoPagoTexto}</td>
                <td>
                    <button class="btn-icon btn-view-venta" onclick="mostrarDetalleVenta(${venta.idVenta})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function renderVentasTable(ventas) {
        if (!ventaTableBody) return;
        ventaTableBody.innerHTML = '';

        if (!Array.isArray(ventas) || ventas.length === 0) {
            ventaTableBody.innerHTML = '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
            return;
        }

        const rowsHtml = ventas.map(crearFilaVentaHTML).join('');
        ventaTableBody.innerHTML = rowsHtml;
    }

    function formatProductosList(productosList) {
        if (!productosList || productosList.length === 0) return "N/A";

        const maxProductos = 2;

        if (productosList.length <= maxProductos) {
            // Mostrar todos los productos
            return productosList.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>');
        } else {
            // Mostrar solo los primeros 2 + contador
            const productosAMostrar = productosList.slice(0, maxProductos);
            const productosRestantes = productosList.length - maxProductos;
            return productosAMostrar.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>') +
                `<br><span style="color: #666; font-style: italic;">+${productosRestantes} más...</span>`;
        }
    }

    // ==========================================================
    // MODAL DE DETALLE DE VENTA
    // ==========================================================

    let modalVentaProductos = [];
    let modalVentaCurrentPage = 0;
    const modalVentaItemsPerPage = 5;

    async function mostrarDetalleVenta(ventaId) {
        try {
            const response = await fetch(`/api/ventas/${ventaId}`);
            if (!response.ok) throw new Error('Error al obtener detalle de venta');

            const venta = await response.json();

            // Poblar información general
            document.getElementById('modal-venta-id').textContent = `#${venta.idVenta}`;

            const fechaFormateada = formatearFechaHora(venta.fecha);
            document.getElementById('modal-venta-fecha').textContent = fechaFormateada;
            document.getElementById('modal-venta-cliente').textContent = venta.nombreCliente || 'N/A';
            document.getElementById('modal-venta-vendedor').textContent = venta.nombreVendedor || 'N/A';
            document.getElementById('modal-venta-metodo-pago').textContent = venta.metodoPago || 'No especificado';

            // Totales
            document.getElementById('modal-venta-subtotal').textContent = `$${formatoMoneda.format(venta.subtotal || 0)}`;

            // Descuento
            const descuentoContainer = document.getElementById('modal-venta-descuento-container');
            if (venta.descuentoMonto && venta.descuentoMonto > 0) {
                descuentoContainer.style.display = 'flex';
                document.getElementById('modal-venta-descuento').textContent = `-$${formatoMoneda.format(venta.descuentoMonto)}`;
            } else {
                descuentoContainer.style.display = 'none';
            }

            document.getElementById('modal-venta-total').textContent = `$${formatoMoneda.format(venta.total)}`;

            // Resumen pago efectivo
            const resumenPago = document.getElementById('modal-venta-resumen-pago');
            if (venta.metodoPago === 'Efectivo' && venta.montoPagado && venta.vuelto !== null) {
                resumenPago.style.display = 'block';
                document.getElementById('modal-venta-pago-con').textContent = `$${formatoMoneda.format(venta.montoPagado)}`;
                document.getElementById('modal-venta-vuelto').textContent = `$${formatoMoneda.format(venta.vuelto)}`;
            } else {
                resumenPago.style.display = 'none';
            }

            // Guardar productos y resetear paginación
            modalVentaProductos = venta.productos || [];
            modalVentaCurrentPage = 0;

            // Renderizar tabla con paginación
            renderModalVentaProductos();

            // Mostrar modal
            document.getElementById('venta-detail-modal').style.display = 'flex';

        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo cargar el detalle de la venta');
        }
    }

    function cerrarModalDetalleVenta() {
        document.getElementById('venta-detail-modal').style.display = 'none';
    }

    function renderModalVentaProductos() {
        const tbody = document.getElementById('modal-venta-productos');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (modalVentaProductos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No hay productos en esta venta.</td></tr>';
            return;
        }

        // Calcular precio unitario promedio (Lógica original)
        const totalVentaStr = document.getElementById('modal-venta-total').textContent;
        const totalVenta = parseFloat(totalVentaStr.replace('$', '').replace(/\./g, '').replace(',', '.'));
        const cantidadTotal = modalVentaProductos.reduce((sum, p) => sum + p.cantidad, 0);

        // Renderizar todos los productos de la venta (sin límite de página)
        modalVentaProductos.forEach(producto => {
            const precioUnitario = producto.precioUnitario || 0;
            const subtotal = precioUnitario * producto.cantidad;

            const row = `
                <tr>
                    <td>${producto.nombreProducto || 'N/A'}</td>
                    <td class="col-center">${producto.cantidad || 0}</td>
                    <td class="col-num">$${formatoMoneda.format(precioUnitario)}</td>
                    <td class="col-num">$${formatoMoneda.format(subtotal)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // Exponer funciones globalmente
    window.mostrarDetalleVenta = mostrarDetalleVenta;
    window.cerrarModalDetalleVenta = cerrarModalDetalleVenta;

    function updateVentasPaginationControls() {
        if (!ventasPageInfo || !ventasPrevPageBtn || !ventasNextPageBtn) return;
        const displayPage = totalPagesVentas > 0 ? currentPageVentas + 1 : 0;
        ventasPageInfo.textContent = `Página ${displayPage} de ${totalPagesVentas || 1}`;
        ventasPrevPageBtn.disabled = currentPageVentas === 0 || totalPagesVentas === 0;
        ventasNextPageBtn.disabled = currentPageVentas >= totalPagesVentas - 1 || totalPagesVentas === 0;
    }

    function updateVentasSortIndicators() {
        sortButtons.forEach(btn => {
            const field = btn.getAttribute('data-sort-field');
            const arrow = btn.querySelector('.sort-arrow');
            if (field === ventasSortField) {
                btn.classList.add('active');
                if (arrow) arrow.className = `fas fa-sort-${ventasSortDirection === 'asc' ? 'up' : 'down'} sort-arrow`;
            } else {
                btn.classList.remove('active');
                if (arrow) arrow.className = 'fas fa-sort sort-arrow';
            }
        });
    }

    function handleSortBtnClick(field) {
        if (ventasSortField === field) {
            ventasSortDirection = ventasSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            ventasSortField = field;
            ventasSortDirection = 'desc';
        }
        currentPageVentas = 0;
        loadVentas(0);
    }

    function handleVentasPrevPage() {
        if (currentPageVentas > 0) loadVentas(currentPageVentas - 1);
    }

    function handleVentasNextPage() {
        if (currentPageVentas < totalPagesVentas - 1) loadVentas(currentPageVentas + 1);
    }

    // ==========================================================
    // BÚSQUEDA Y FILTRADO DE VENTAS
    // ==========================================================
    // Cargar opciones de los dropdowns dinámicamente
    async function cargarFiltroVendedores() {
        if (!filtroVendedor) return;
        try {
            const response = await fetch('/api/usuarios/select');
            if (!response.ok) return;
            const usuarios = await response.json();
            const seleccionado = filtroVendedor.value;
            filtroVendedor.innerHTML = '<option value="">👤 Vendedor: Todos</option>';
            usuarios.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.nombre} ${u.apellido || ''}`.trim();
                filtroVendedor.appendChild(opt);
            });
            if (seleccionado) filtroVendedor.value = seleccionado;
        } catch (e) {
            console.error('Error al cargar vendedores:', e);
        }
    }

    async function cargarFiltroMetodosPago() {
        if (!filtroMetodoPago) return;
        try {
            const response = await fetch('/api/metodos-pago/activos');
            if (!response.ok) return;
            const metodos = await response.json();
            const seleccionado = filtroMetodoPago.value;
            filtroMetodoPago.innerHTML = '<option value="">💳 Método: Todos</option>';
            metodos
                .filter(m => !m.nombre.includes('('))
                .forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id ?? m.idMetodoPago;
                    opt.textContent = m.nombre;
                    filtroMetodoPago.appendChild(opt);
                });
            if (seleccionado) filtroMetodoPago.value = seleccionado;
        } catch (e) {
            console.error('Error al cargar métodos de pago:', e);
        }
    }

    async function filtrarVentasPorFecha() {
        const inicio = ventasFechaInicio ? ventasFechaInicio.value : '';
        const fin = ventasFechaFin ? ventasFechaFin.value : '';

        if (!inicio || !fin) {
            mostrarErrorFiltroVentas('Por favor selecciona ambas fechas');
            return;
        }

        if (new Date(inicio) > new Date(fin)) {
            mostrarErrorFiltroVentas('La fecha de inicio no puede ser mayor que la fecha de fin');
            return;
        }

        ocultarErrorFiltroVentas();
        currentPageVentas = 0;
        loadVentas(0);
    }

    function limpiarFiltrosVentas() {
        if (ventasSearchInput) ventasSearchInput.value = '';

        // Limpiar errores visuales
        if (window.limpiarErroresInline) {
            window.limpiarErroresInline('ventas-search-input');
        }

        if (ventasFechaInicio) ventasFechaInicio.value = '';
        if (ventasFechaFin) ventasFechaFin.value = '';
        if (filtroVendedor) filtroVendedor.value = '';
        if (filtroMetodoPago) filtroMetodoPago.value = '';
        ventasSortField = 'fecha';
        ventasSortDirection = 'desc';
        ocultarErrorFiltroVentas();
        currentPageVentas = 0;
        loadVentas(0);
    }

    async function exportarVentasPdf() {
        const inicio = ventasFechaInicio ? ventasFechaInicio.value : '';
        const fin = ventasFechaFin ? ventasFechaFin.value : '';
        const search = ventasSearchInput ? ventasSearchInput.value.trim() : '';
        const vendedorId = filtroVendedor ? filtroVendedor.value : '';
        const metodoPagoId = filtroMetodoPago ? filtroMetodoPago.value : '';

        // Construir URL con parámetros opcionales
        let url = '/api/ventas/pdf';
        const params = new URLSearchParams();

        if (ventasSortField) {
            params.append('sort', `${ventasSortField},${ventasSortDirection}`);
        }
        if (search) params.append('search', search);
        if (inicio && fin) {
            params.append('inicio', inicio);
            params.append('fin', fin);
        }
        if (vendedorId) params.append('vendedorId', vendedorId);
        if (metodoPagoId) params.append('metodoPagoId', metodoPagoId);

        if (params.toString()) {
            url += '?' + params.toString();
        }

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al generar el PDF');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            // Leer filename del Content-Disposition si existe
            let nombreArchivo = 'Reporte_Ventas.pdf';
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    nombreArchivo = matches[1].replace(/['"]/g, '');
                }
            }

            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            alert('No se pudo exportar el PDF. Intente nuevamente.');
        }
    }

    // ==========================================================
    // ASIGNACIÓN DE EVENT LISTENERS
    // ==========================================================

    if (ventaForm) {
        ventaForm.addEventListener('submit', saveVenta);
    }

    if (addClienteBtn) {
        addClienteBtn.addEventListener('click', openAddClienteModal);
    }
    if (addClienteCloseBtn) {
        addClienteCloseBtn.addEventListener('click', closeAddClienteModal);
    }

    const btnLimpiarAddCliente = document.getElementById('btn-limpiar-add-cliente');
    if (btnLimpiarAddCliente) {
        btnLimpiarAddCliente.addEventListener('click', resetAddClienteModal);
    }
    if (addClienteForm) {
        addClienteForm.addEventListener('submit', handleAddClienteSubmit);
    }
    if (addClienteModal) {
        addClienteModal.addEventListener('click', (event) => {
            if (event.target === addClienteModal) closeAddClienteModal();
        });
    }

    if (clienteSearchInput) {
        clienteSearchInput.addEventListener('input', () => {
            clienteHiddenInput.value = '';
            if (clienteError) clienteError.textContent = '';
            filtrarClientes();
        });
        clienteSearchInput.addEventListener('focus', filtrarClientes);
        clienteSearchInput.addEventListener('keydown', (e) => {
            const items = clienteResultsContainer.querySelectorAll('.product-result-item[data-id]');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                clienteSelectedIndex = Math.min(clienteSelectedIndex + 1, items.length - 1);
                actualizarSeleccionKeyboard(items, clienteSelectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                clienteSelectedIndex = Math.max(clienteSelectedIndex - 1, 0);
                actualizarSeleccionKeyboard(items, clienteSelectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (clienteSelectedIndex >= 0 && items[clienteSelectedIndex]) {
                    items[clienteSelectedIndex].click();
                    clienteSearchInput.blur();
                }
            }
        });
        clienteSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                clienteSelectedIndex = -1;
                const items = clienteResultsContainer.querySelectorAll('.product-result-item');
                items.forEach(item => item.classList.remove('selected'));
            }, 150);
        });
    }
    if (clienteResultsContainer) {
        clienteResultsContainer.addEventListener('click', seleccionarCliente);
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', buscarProductos);
        productSearchInput.addEventListener('focus', buscarProductos);
        productSearchInput.addEventListener('click', buscarProductos);
        productSearchInput.addEventListener('keydown', (e) => {
            const items = productResultsContainer.querySelectorAll('.product-result-item[data-id]');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                productoSelectedIndex = Math.min(productoSelectedIndex + 1, items.length - 1);
                actualizarSeleccionKeyboard(items, productoSelectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                productoSelectedIndex = Math.max(productoSelectedIndex - 1, 0);
                actualizarSeleccionKeyboard(items, productoSelectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (productoSelectedIndex >= 0 && items[productoSelectedIndex]) {
                    items[productoSelectedIndex].click();
                    productSearchInput.blur();
                }
            }
        });
        productSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                productoSelectedIndex = -1;
                const items = productResultsContainer.querySelectorAll('.product-result-item');
                items.forEach(item => item.classList.remove('selected'));
            }, 150);
        });
    }
    if (productResultsContainer) {
        productResultsContainer.addEventListener('click', seleccionarProducto);
    }
    if (ventaDetalleTemporalBody) {
        ventaDetalleTemporalBody.addEventListener('click', function (event) {
            // Botón eliminar
            const deleteButton = event.target.closest('.btn-delete-detalle');
            if (deleteButton) {
                const idParaQuitar = Number(deleteButton.dataset.id);
                detallesVenta = detallesVenta.filter(item => item.idProducto !== idParaQuitar);
                renderDetalleTemporal();
                return;
            }

            // Botón +
            const plusBtn = event.target.closest('.btn-qty-plus');
            if (plusBtn) {
                cambiarCantidadDetalle(parseInt(plusBtn.dataset.index, 10), +1);
                return;
            }

            // Botón -
            const minusBtn = event.target.closest('.btn-qty-minus');
            if (minusBtn) {
                cambiarCantidadDetalle(parseInt(minusBtn.dataset.index, 10), -1);
                return;
            }
        });

        ventaDetalleTemporalBody.addEventListener('input', function (event) {
            const qtyInput = event.target.closest('.qty-input');
            if (!qtyInput) return;
            const index = parseInt(qtyInput.dataset.index, 10);
            const item = detallesVenta[index];
            if (!item) return;

            qtyInput.value = qtyInput.value.replace(/\D/g, '');
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            if (val > item.stockAlAgregar) {
                val = item.stockAlAgregar;
                qtyInput.value = val;
                window.mostrarTooltipStock(qtyInput, `Stock disponible: ${item.stockAlAgregar} unidades.`);
            }
            item.cantidad = val;
            actualizarSubtotalesYTotales();
        });
    }

    document.addEventListener('click', function (event) {
        const isClickInsideProductInput = productSearchInput && productSearchInput.contains(event.target);
        const isClickInsideProductResults = productResultsContainer && productResultsContainer.contains(event.target);
        if (!isClickInsideProductInput && !isClickInsideProductResults) {
            if (productResultsContainer) productResultsContainer.style.display = 'none';
        }

        const isClickInsideClientInput = clienteSearchInput && clienteSearchInput.contains(event.target);
        const isClickInsideClientResults = clienteResultsContainer && clienteResultsContainer.contains(event.target);
        if (!isClickInsideClientInput && !isClickInsideClientResults) {
            if (clienteResultsContainer) clienteResultsContainer.style.display = 'none';
        }
    });

    if (ventasPrevPageBtn) {
        ventasPrevPageBtn.addEventListener('click', handleVentasPrevPage);
    }
    if (ventasNextPageBtn) {
        ventasNextPageBtn.addEventListener('click', handleVentasNextPage);
    }
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => handleSortBtnClick(btn.getAttribute('data-sort-field')));
    });
    if (filtroVendedor) {
        filtroVendedor.addEventListener('change', () => { currentPageVentas = 0; loadVentas(0); });
    }
    if (filtroMetodoPago) {
        filtroMetodoPago.addEventListener('change', () => { currentPageVentas = 0; loadVentas(0); });
    }

    // ==========================================================
    // CARGA INICIAL Y EXPOSICIÓN DE FUNCIONES (MODIFICADO)
    // ==========================================================

    // Event listeners para búsqueda y filtrado
    if (ventasBtnFiltrar) {
        ventasBtnFiltrar.addEventListener('click', filtrarVentasPorFecha);
    }
    if (ventasBtnLimpiar) {
        ventasBtnLimpiar.addEventListener('click', limpiarFiltrosVentas);
    }
    let ventasSearchTimeout;
    if (ventasSearchInput) {
        ventasSearchInput.addEventListener('input', function () {
            clearTimeout(ventasSearchTimeout);
            ventasSearchTimeout = setTimeout(() => {
                currentPageVentas = 0;
                loadVentas(0);
            }, 300);
        });
    }
    // Ocultar error cuando el usuario modifica las fechas
    if (ventasFechaInicio) {
        ventasFechaInicio.addEventListener('change', ocultarErrorFiltroVentas);
    }
    if (ventasFechaFin) {
        ventasFechaFin.addEventListener('change', ocultarErrorFiltroVentas);
    }
    // Event listener para exportar PDF
    const ventasBtnExportarPdf = document.getElementById('ventas-btn-exportar-pdf');
    if (ventasBtnExportarPdf) {
        ventasBtnExportarPdf.addEventListener('click', exportarVentasPdf);
    }

    // 1. Carga inicial estándar
    loadProductosParaSelect();
    loadClientesParaVenta();
    cargarFiltroVendedores();
    cargarFiltroMetodosPago();
    loadVentas();
    renderDetalleTemporal();

    // --- NUEVO: Exponer la función para que admin.js pueda llamarla al cambiar de pestaña ---
    window.cargarDatosVentas = async function () {
        // Recargamos productos y clientes (para asegurar que estén frescos)
        await loadProductosParaSelect();
        await loadClientesParaVenta();
        // Si estamos en la primera página del historial, también lo refrescamos
        if (currentPageVentas === 0) {
            loadVentas(0);
        }
    };

    // --- NUEVO: Escuchar evento de actualización automática de productos ---
    document.addEventListener('productosActualizados', function () {
        console.log('Ventas.js: Detectada actualización de productos. Recargando lista...');
        loadProductosParaSelect();
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de ventas
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('ventas-')) {
                container.style.display = 'none';
            }
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // ==========================================================
    // MÉTODOS DE PAGO
    // ==========================================================

    /**
     * Cargar métodos de pago activos desde la API
     */
    async function cargarMetodosPago() {
        try {
            const response = await fetch(API_METODOS_PAGO_URL);
            if (!response.ok) throw new Error('Error al cargar métodos de pago');

            const metodos = await response.json();

            if (cobroMetodoSelect) {
                cobroMetodoSelect.innerHTML = '<option value="">Seleccionar</option>';
                metodos.forEach(metodo => {
                    if (!metodo.nombre.toLowerCase().includes('caja') && !metodo.nombre.toLowerCase().includes('aporte externo')) {
                        const option = document.createElement('option');
                        option.value = metodo.idMetodoPago;
                        option.textContent = metodo.nombre;
                        option.dataset.nombre = metodo.nombre.toLowerCase();
                        cobroMetodoSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error:', error);
            if (errorMetodoPago) errorMetodoPago.textContent = 'No se pudieron cargar los métodos de pago';
        }
    }

    /**
     * Manejar cambio de método de pago
     */
    function handleCobroMetodoChange() {
        if (errorMetodoPago) errorMetodoPago.textContent = '';
        const selectedOption = cobroMetodoSelect ? cobroMetodoSelect.options[cobroMetodoSelect.selectedIndex] : null;
        const nombreMetodo = selectedOption ? (selectedOption.dataset.nombre || selectedOption.text.toLowerCase()) : '';

        const tipoTarjetaContainer = document.getElementById('venta-tipo-tarjeta-container');
        const pagaConContainer = document.getElementById('venta-paga-con-container');
        const vueltoDisplay = document.getElementById('venta-vuelto-display');
        const pagaConInput = document.getElementById('venta-paga-con');

        const esEfectivo = nombreMetodo.includes('efectivo');

        if (tipoTarjetaContainer) tipoTarjetaContainer.style.display = 'none';
        if (pagaConContainer) pagaConContainer.style.display = esEfectivo ? 'block' : 'none';
        if (!esEfectivo) {
            if (vueltoDisplay) vueltoDisplay.style.display = 'none';
            if (pagaConInput) pagaConInput.value = '';
        }

        // Autocompletar importe con el saldo pendiente
        if (cobroMontoInput && !cobroMontoInput.value) {
            const pendiente = calcularPendiente();
            if (pendiente > 0) cobroMontoInput.value = new Intl.NumberFormat('es-AR').format(Math.round(pendiente));
        }

        renderCobrosMixtos();
    }

    function calcularPendiente() {
        let totalVenta = calcularTotalConDescuento();
        let totalCobrado = cobrosMixtos.reduce((acc, c) => acc + parseFloat(c.importe), 0);
        return totalVenta - totalCobrado;
    }

    function calcularTotalConDescuento() {
        let base = 0;
        detallesVenta.forEach(item => { base += item.precioVenta * item.cantidad; });
        const tipo = tipoDescuentoSelect?.value || '$';
        const descuento = tipo === '$' ? (parsearMoneda(descuentoInput?.value) || 0) : (parseFloat((descuentoInput?.value || '').replace(',', '.')) || 0);
        if (descuento > 0) {
            const d = tipo === '%' ? base * (descuento / 100) : descuento;
            base -= Math.min(d, base);
        }
        return base;
    }

    function calcularVuelto() {
        const pagaConInput = document.getElementById('venta-paga-con');
        const vueltoDisplay = document.getElementById('venta-vuelto-display');
        const vueltoAmount = document.getElementById('venta-vuelto-amount');
        if (!pagaConInput || !vueltoDisplay || !vueltoAmount) return;

        const montoPagado = parsearMoneda(pagaConInput.value);
        const montoImporte = parsearMoneda(cobroMontoInput?.value) || calcularPendiente();
        const vuelto = montoPagado - montoImporte;

        if (montoPagado > 0 && montoImporte > 0) {
            vueltoAmount.textContent = vuelto >= 0 ? `$${formatoMoneda.format(vuelto)}` : 'Monto insuficiente';
            vueltoAmount.style.color = vuelto >= 0 ? '#2e7d32' : '#d32f2f';
            vueltoDisplay.style.background = vuelto >= 0 ? '#e8f5e9' : '#ffebee';
            vueltoDisplay.style.display = 'block';
        } else {
            vueltoDisplay.style.display = 'none';
        }
    }

    function renderCobrosMixtos() {
        const container = document.getElementById('cobros-mixtos-container');
        const balanceIndicator = document.getElementById('venta-cobro-balance-indicator');
        if (!container) return;
        container.innerHTML = '';

        let totalCobrado = 0;
        cobrosMixtos.forEach((cobro, index) => {
            totalCobrado += parseFloat(cobro.importe);
            container.insertAdjacentHTML('beforeend', `
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                    <span style="font-weight:600;font-size:0.85rem;color:#475569;">${cobro.nombreMetodo}${cobro.tipoTarjeta ? ' (' + cobro.tipoTarjeta + ')' : ''}</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.9rem;font-weight:600;color:#1e293b;font-variant-numeric:tabular-nums;">$${formatoMoneda.format(cobro.importe)}</span>
                        <button type="button" class="btn-icon btn-delete-cobro" data-index="${index}" style="color:#94a3b8;background:none;border:none;cursor:pointer;padding:2px 6px;" title="Quitar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>`);
        });

        container.querySelectorAll('.btn-delete-cobro').forEach(btn => {
            btn.addEventListener('click', e => {
                cobrosMixtos.splice(parseInt(e.currentTarget.dataset.index), 1);
                renderCobrosMixtos();
            });
        });

        const totalVenta = calcularTotalConDescuento();
        const pendiente = totalVenta - totalCobrado;
        const inputPreview = parsearMoneda(cobroMontoInput?.value) || 0;
        const diff = pendiente - inputPreview;

        if (balanceIndicator) {
            if (totalVenta === 0 && cobrosMixtos.length === 0) {
                balanceIndicator.innerHTML = '';
            } else {
                balanceIndicator.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                    <span style="color: #cfe2ff; font-size: 0.9rem;">Cobrado ahora</span>
                    <span style="color: #fff; font-weight: 600; font-size: 0.95rem;">$${formatoMoneda.format(totalCobrado + inputPreview)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                    <span style="color: #cfe2ff; font-size: 0.9rem;">Saldo pendiente</span>
                    <span style="color: ${diff > 0.05 ? '#ff6b6b' : '#fff'}; font-weight: 700; font-size: 0.95rem;">$${formatoMoneda.format(diff > 0 ? diff : 0)}</span>
                </div>
            `;
            }
        }
    }

    // Listener cambio método
    if (cobroMetodoSelect) cobroMetodoSelect.addEventListener('change', handleCobroMetodoChange);

    // Listener paga-con para vuelto
    const pagaConInput = document.getElementById('venta-paga-con');
    if (pagaConInput) {
        pagaConInput.addEventListener('input', function () {
            let raw = this.value.replace(/[^0-9]/g, '');
            if (raw === '') {
                this.value = '';
                calcularVuelto();
                return;
            }
            const cursorPos = this.selectionStart;
            const oldLen = this.value.length;
            this.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));
            const diff = this.value.length - oldLen;
            this.setSelectionRange(cursorPos + diff, cursorPos + diff);
            calcularVuelto();
        });
    }

    // Formatear importe al escribir
    if (cobroMontoInput) {
        cobroMontoInput.addEventListener('input', function () {
            let raw = this.value.replace(/[^0-9]/g, '');
            if (raw === '') { this.value = ''; renderCobrosMixtos(); return; }
            const cursorPos = this.selectionStart;
            const oldLen = this.value.length;
            this.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));
            const diff = this.value.length - oldLen;
            this.setSelectionRange(cursorPos + diff, cursorPos + diff);
            renderCobrosMixtos();
        });
    }

    // Lógica de agregar cobro (usada por el botón + y por el auto-registro)
    function agregarCobroDesdeInputs() {
        if (errorMetodoPago) errorMetodoPago.textContent = '';

        const idMetodo = cobroMetodoSelect?.value;
        const nombreMetodo = cobroMetodoSelect?.options[cobroMetodoSelect.selectedIndex]?.text || '';
        const montoRaw = cobroMontoInput?.value?.replace(/\./g, '') || '0';
        const monto = parseFloat(montoRaw);
        const tipoTarjeta = cobroTipoTarjetaSelect?.value || null;
        const esEfectivo = nombreMetodo.toLowerCase().includes('efectivo');

        if (!idMetodo) {
            window.mostrarErrorInline('venta-cobro-metodo', 'Seleccione un método de pago.');
            return false;
        } else {
            window.limpiarErroresInline('venta-cobro-metodo');
        }

        if (isNaN(monto) || monto <= 0) {
            window.mostrarErrorInline('venta-cobro-monto', 'Debe ingresar un importe para este cobro.');
            return false;
        } else {
            window.limpiarErroresInline('venta-cobro-monto');
        }

        const pendiente = calcularPendiente();
        if (monto > pendiente + 0.05) {
            window.mostrarErrorInline('venta-cobro-monto', `El monto excede. Pendiente: $${formatoMoneda.format(pendiente)}`);
            return false;
        } else {
            window.limpiarErroresInline('venta-cobro-monto');
        }

        let montoPagado = null;
        let vueltoVal = null;
        if (esEfectivo) {
            const pagaCon = parsearMoneda(document.getElementById('venta-paga-con')?.value);
            if (!isNaN(pagaCon) && pagaCon > 0) {
                montoPagado = pagaCon;
                vueltoVal = Math.max(0, pagaCon - monto);
            }
        }

        cobrosMixtos.push({
            idMetodoPago: parseInt(idMetodo),
            nombreMetodo: nombreMetodo,
            importe: monto,
            tipoTarjeta: tipoTarjeta,
            montoPagado: montoPagado,
            vuelto: vueltoVal
        });

        // Reset fila
        if (cobroMontoInput) cobroMontoInput.value = '';
        if (cobroMetodoSelect) cobroMetodoSelect.value = '';
        if (cobroTipoTarjetaSelect) cobroTipoTarjetaSelect.value = '';
        const tipoTarjetaContainer = document.getElementById('venta-tipo-tarjeta-container');
        const pagaConContainer = document.getElementById('venta-paga-con-container');
        const vueltoDisplay = document.getElementById('venta-vuelto-display');
        const pagaConInputEl = document.getElementById('venta-paga-con');
        if (tipoTarjetaContainer) tipoTarjetaContainer.style.display = 'none';
        if (pagaConContainer) pagaConContainer.style.display = 'none';
        if (vueltoDisplay) vueltoDisplay.style.display = 'none';
        if (pagaConInputEl) pagaConInputEl.value = '';

        renderCobrosMixtos();
        return true;
    }

    function intentarAgregarCobroAutomatico(totalFinal) {
        const idMetodo = cobroMetodoSelect?.value;
        if (!idMetodo) return; // sin método, la validación posterior mostrará el error

        // Autocompletar monto si está vacío o en cero
        const montoRaw = cobroMontoInput?.value?.replace(/\./g, '') || '';
        const montoActual = parseFloat(montoRaw);
        if (!montoRaw || isNaN(montoActual) || montoActual <= 0) {
            // No autocompletar si el usuario lo dejó vacío, dejar que agregarCobroDesdeInputs lance error in line
            // Solo pasaremos a intentar agregarlo para que salte la validación
        }

        const nombreMetodo = cobroMetodoSelect.options[cobroMetodoSelect.selectedIndex]?.text || '';
        const esEfectivo = nombreMetodo.toLowerCase().includes('efectivo');

        // Si es efectivo y "paga con" está vacío, asumir paga con = monto cobrado
        if (esEfectivo) {
            const pagaConInput = document.getElementById('venta-paga-con');
            if (pagaConInput && !pagaConInput.value) {
                pagaConInput.value = cobroMontoInput.value;
            }
        }

        return agregarCobroDesdeInputs();
    }

    // Botón Agregar Cobro
    const btnAddCobroMixto = document.getElementById('btn-add-cobro-mixto');
    if (btnAddCobroMixto) {
        btnAddCobroMixto.addEventListener('click', function () {
            const metodoInput = document.getElementById('venta-cobro-metodo');
            const montoInput = document.getElementById('venta-cobro-monto');
            const ventaTipoTarjetaContainer = document.getElementById('venta-tipo-tarjeta-container');

            const metodo = metodoInput ? metodoInput.value : '';
            const importe = montoInput ? parseFloat(montoInput.value.replace(/\./g, '')) : 0;
            const tarjetaTipo = ventaTipoTarjetaContainer && ventaTipoTarjetaContainer.style.display !== 'none' ? document.getElementById('venta-cobro-tipo-tarjeta').value : null;

            let valid = true;
            if (!metodo) {
                window.mostrarErrorInline('venta-cobro-metodo', 'Seleccione un método.');
                valid = false;
            } else {
                window.limpiarErroresInline('venta-cobro-metodo');
            }

            if (!importe || importe <= 0 || isNaN(importe)) {
                window.mostrarErrorInline('venta-cobro-monto', 'Debe ingresar un importe para este cobro.');
                valid = false;
            } else {
                window.limpiarErroresInline('venta-cobro-monto');
            }

            if (!valid) return;

            agregarCobroDesdeInputs();
        });
    }

    // Event listeners para descuento
    if (descuentoInput) {
        descuentoInput.addEventListener('input', function () {
            if (tipoDescuentoSelect && tipoDescuentoSelect.value === '$') {
                let raw = this.value.replace(/[^0-9]/g, '');
                if (raw === '') {
                    this.value = '';
                } else {
                    const cursorPos = this.selectionStart;
                    const oldLen = this.value.length;
                    this.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));
                    const diff = this.value.length - oldLen;
                    this.setSelectionRange(cursorPos + diff, cursorPos + diff);
                }
            } else {
                this.value = this.value.replace(/[^0-9.,]/g, '');
            }
            renderDetalleTemporal();
        });
    }
    if (tipoDescuentoSelect) {
        tipoDescuentoSelect.addEventListener('change', function () {
            if (descuentoInput) {
                if (this.value === '$') {
                    let raw = descuentoInput.value.replace(/[^0-9]/g, '');
                    if (raw !== '') {
                        descuentoInput.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));
                    }
                } else {
                    let val = parsearMoneda(descuentoInput.value);
                    descuentoInput.value = val ? val.toString() : '';
                }
            }
            renderDetalleTemporal();
        });
    }

    // Event listeners para búsqueda de clientes
    if (clienteSearchInput) {
        clienteSearchInput.addEventListener('input', filtrarClientes);
    }

    // Event listeners para búsqueda de productos
    if (productSearchInput) {
        productSearchInput.addEventListener('input', buscarProductos);
    }

    // Cargar métodos al iniciar
    cargarMetodosPago();

    // ==========================================================
    // FUNCIÓN LIMPIAR FORMULARIO DE VENTA
    // ==========================================================

    function limpiarFormularioVenta() {
        if (ventaForm) ventaForm.reset();

        window.limpiarTodosErroresInline('venta-cliente-search');
        window.limpiarTodosErroresInline('product-search');
        window.limpiarTodosErroresInline('descuento-venta');
        window.limpiarTodosErroresInline('venta-cobro-metodo');
        window.limpiarTodosErroresInline('venta-cobro-monto');
        window.limpiarTodosErroresInline('venta-paga-con');

        if (errorDetalleGeneral) {
            errorDetalleGeneral.textContent = '';
            errorDetalleGeneral.style.display = 'none';
        }
        if (generalMessage) {
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
        }

        // Limpiar inputs de búsqueda y ocultos
        clienteSearchInput.value = '';
        clienteHiddenInput.value = '';
        productSearchInput.value = '';

        // Limpiar detalle de venta
        detallesVenta = [];
        productoSeleccionado = null;
        renderDetalleTemporal();

        // Resetear cliente anterior
        previousClienteId = null;
        previousClienteNombre = '';

        // Resetear cobros
        cobrosMixtos = [];
        if (cobroMetodoSelect) cobroMetodoSelect.value = '';
        if (cobroMontoInput) cobroMontoInput.value = '';
        if (cobroTipoTarjetaSelect) cobroTipoTarjetaSelect.value = '';
        const tipoTarjetaContainerLimpiar = document.getElementById('venta-tipo-tarjeta-container');
        const pagaConContainerLimpiar = document.getElementById('venta-paga-con-container');
        const vueltoDisplayLimpiar = document.getElementById('venta-vuelto-display');
        const pagaConInputLimpiar = document.getElementById('venta-paga-con');
        if (tipoTarjetaContainerLimpiar) tipoTarjetaContainerLimpiar.style.display = 'none';
        if (pagaConContainerLimpiar) pagaConContainerLimpiar.style.display = 'none';
        if (vueltoDisplayLimpiar) vueltoDisplayLimpiar.style.display = 'none';
        if (pagaConInputLimpiar) pagaConInputLimpiar.value = '';
        renderCobrosMixtos();
    }

    // Event listener para botón limpiar
    const btnLimpiarFormVenta = document.getElementById('limpiar-form-venta');
    if (btnLimpiarFormVenta) {
        btnLimpiarFormVenta.addEventListener('click', limpiarFormularioVenta);
    }

    // Exponer globalmente
    window.showVentasSubsection = showSubsection;

    // Cerrar modal de detalle al hacer clic fuera del contenido
    const ventaDetailModal = document.getElementById('venta-detail-modal');
    if (ventaDetailModal) {
        ventaDetailModal.addEventListener('click', function (e) {
            if (e.target === ventaDetailModal) {
                cerrarModalDetalleVenta();
            }
        });
    }

    // Cerrar modal de detalle con ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('venta-detail-modal');
            if (modal && modal.style.display === 'flex') {
                cerrarModalDetalleVenta();
            }
        }
    });

    // --- Limpieza dinámica de errores inline ---
    ['descuento-venta', 'venta-cobro-metodo', 'venta-cobro-monto', 'venta-paga-con'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (window.limpiarErroresInline) window.limpiarErroresInline(id);
            });
            el.addEventListener('change', () => {
                if (window.limpiarErroresInline) window.limpiarErroresInline(id);
            });
        }
    });

});