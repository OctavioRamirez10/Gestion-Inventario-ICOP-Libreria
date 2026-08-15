document.addEventListener('DOMContentLoaded', function () {

    // --- 1. CONSTANTES DE API ---
    const API_STOCK_URL = '/api/stock/productos';
    const API_STOCK_EDIT_URL = '/api/stock/';
    const API_PRODUCTOS_DELETE_URL = '/api/productos/';

    // --- CONFIGURACIÓN DE FORMATO ---
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    // --- 2. CONSTANTES DEL DOM (PÁGINA PRINCIPAL) ---
    // La subsección "Gestión Stock" dentro de Productos usa 'product-search-input'
    // La sección independiente Stock usa 'stock-search-input'
    const searchInput = document.getElementById('product-search-input') || document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body') || document.getElementById('product-table-body');

    // Constantes para búsqueda de categorías en modal de edición
    const editCategoriaSearchInput = document.getElementById('edit-categoria-search');
    const editCategoriaHiddenInput = document.getElementById('edit-categoria-id-hidden');
    const editCategoriaResultsContainer = document.getElementById('edit-categoria-results');
    const btnAddCategoriaEdit = document.getElementById('btn-add-categoria-edit');

    const mainContent = document.querySelector('.main-content');
    const tableHeaders = document.querySelectorAll('#stock-section .data-table th[data-sort-by]');

    // Selectores para las tarjetas de Resumen (Dashboard)
    const countTotalProductos = document.getElementById('total-productos-count');
    const countProductosAgotados = document.getElementById('productos-agotados-count');
    const countStockBajo = document.getElementById('stock-bajo-count');

    // --- 3. DETECCIÓN DE MODO (EMPLEADO VS ADMIN) ---
    const editModal = document.getElementById('edit-product-modal');
    const isReadOnly = !editModal;

    // --- 4. CONSTANTES DEL DOM (ACCIONES) ---
    let editModalCloseBtn, editProductForm, editProductId, editNombre, editDescripcion, editPrecio, editStockActual, editCantidadAjuste, editFormGeneralMessage;
    let errorEditNombre, errorEditCategoria, errorEditPrecio, errorEditAjuste;

    if (!isReadOnly) {
        editModalCloseBtn = document.getElementById('edit-modal-close-btn');
        editProductForm = document.getElementById('edit-product-form');
        editProductId = document.getElementById('edit-product-id');
        editNombre = document.getElementById('edit-nombre');
        editDescripcion = document.getElementById('edit-descripcion');
        editPrecio = document.getElementById('edit-precio');
        editStockActual = document.getElementById('edit-stock-actual');
        editCantidadAjuste = document.getElementById('edit-cantidad-ajuste');
        editFormGeneralMessage = document.getElementById('edit-form-general-message');

        errorEditNombre = document.getElementById('error-edit-nombre');
        errorEditCategoria = document.getElementById('error-edit-categoria');
        errorEditPrecio = document.getElementById('error-edit-precio');
        errorEditAjuste = document.getElementById('error-edit-ajuste');
    }

    // Constantes de paginación
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    // --- 5. VARIABLES DE ESTADO ---
    let todosLosProductos = [];
    let currentPage = 1;
    const itemsPerPage = 7;
    let currentListForPagination = [];
    let sortField = 'nombre'; // Ordenamiento predeterminado: A → Z
    let sortDirection = 'asc';

    // Estado de categorías para el modal de edición
    let todasLasCategoriasEdicion = [];

    // =================================================================
    // --- 6. FUNCIONES DE LÓGICA ---
    // =================================================================

    async function loadStock() {
        if (tableBody)
            try {
                const response = await fetch(API_STOCK_URL);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

                // Guardamos todos los datos
                todosLosProductos = await response.json();

                // 1. Calcular resumen localmente (sin llamar a otra API)
                actualizarResumenDashboard(todosLosProductos);

                // 2. Filtrar y mostrar tabla
                filtrarStock();

            } catch (error) {
                console.error('Error al cargar el stock:', error);
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
            }
    }

    function actualizarResumenDashboard(productos) {
        if (!productos) return;

        const total = productos.length;
        const agotados = productos.filter(p => p.stock <= 0).length;
        const bajoStock = productos.filter(p => p.stock > 0 && p.stockMinimo && p.stock < p.stockMinimo).length;

        if (countTotalProductos) countTotalProductos.textContent = total;
        if (countProductosAgotados) countProductosAgotados.textContent = agotados;
        if (countStockBajo) countStockBajo.textContent = bajoStock;
    }

    async function renderStockTable() {
        if (!tableBody || !mainContent) {
            return;
        }

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));
        tableBody.innerHTML = '';

        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentListForPagination.slice(startIndex, endIndex);

        if (paginatedItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No se encontraron productos.</td></tr>`;
        } else {
            paginatedItems.forEach(producto => {
                let stockClass = 'good';
                if (producto.stock <= 0) stockClass = 'empty';
                else if (producto.stockMinimo && producto.stock < producto.stockMinimo) stockClass = 'low';

                let accionesHtml = '';
                if (!isReadOnly) {
                    accionesHtml = `
                        <td>
                            <button class="btn-icon btn-edit-producto" data-id="${producto.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon btn-delete-producto" data-id="${producto.id}"><i class="fas fa-trash"></i></button>
                        </td>`;
                } else {
                    accionesHtml = `
                        <td>
                            <div class="action-buttons">
                                <button class="btn-action view" title="Ver detalles" data-id="${producto.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </td>`;
                }

                // Construir celda de proveedor
                let proveedorCell = '<span style="color: #94a3b8; font-style: italic;">Sin proveedor</span>';
                if (producto.proveedor) {
                    proveedorCell = producto.proveedor;
                    if (producto.totalProveedores > 1) {
                        const extras = producto.totalProveedores - 1;
                        const nombres = (producto.otrosProveedores && producto.otrosProveedores.length > 0)
                            ? producto.otrosProveedores.join(', ')
                            : `${extras} proveedor(es) más`;
                        proveedorCell += ` <span class="proveedor-badge-wrapper" data-id="${producto.id}" style="cursor: pointer;" title="Ver proveedores">` +
                            `<span class="proveedor-badge">+${extras} ${extras === 1 ? 'opción' : 'opciones'}</span>` +
                            `<span class="proveedor-popover">` +
                            `<div class="popover-label">También suministrado por:</div>` +
                            `<div class="popover-names">${nombres}</div>` +
                            `</span></span>`;
                    }
                }

                const row = `
                    <tr>
                        <td>${producto.nombre}</td>
                        <td>${producto.categoria}</td>
                        <td>${producto.descripcion}</td>
                        <td>${proveedorCell}</td>
                        <td class="col-num"><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                        ${accionesHtml}
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

        if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
        if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);

        updateSortIndicators();

        requestAnimationFrame(() => {
            const isSearchActive = (document.activeElement === searchInput);
            if (!isSearchActive) mainContent.focus();
            window.scrollTo(0, scrollPosition);
            tableBody.classList.remove('loading');
        });
    }

    function removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function filtrarStock() {
        // Validar que tengamos datos cargados
        if (todosLosProductos.length === 0) {
            currentListForPagination = [];
            currentPage = 1;
            renderStockTable();
            return;
        }

        if (!searchInput || !searchInput.value.trim()) {
            currentListForPagination = todosLosProductos;
        } else {
            const textoBusqueda = removeAccents(searchInput.value.toLowerCase().trim());
            currentListForPagination = todosLosProductos.filter(producto => {
                // Buscar en nombre, categoría y descripción (insensible a acentos)
                return removeAccents(producto.nombre.toLowerCase()).includes(textoBusqueda) ||
                    removeAccents(producto.categoria.toLowerCase()).includes(textoBusqueda) ||
                    removeAccents(producto.descripcion.toLowerCase()).includes(textoBusqueda);
            });
        }
        clientSideSort();
        currentPage = 1;
        renderStockTable();
    }

    function clientSideSort() {
        currentListForPagination.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Productos sin proveedor siempre al final
            if (sortField === 'proveedor') {
                if (valA == null && valB == null) return 0;
                if (valA == null) return 1;
                if (valB == null) return -1;
            }

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
                let comparison = valA.localeCompare(valB, 'es', { sensitivity: 'base' });
                return (sortDirection === 'desc') ? (comparison * -1) : comparison;
            }
            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            return (sortDirection === 'desc') ? (comparison * -1) : comparison;
        });
    }

    function handleSortClick(event) {
        event.preventDefault();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');
        if (!newSortField) return;
        if (sortField === newSortField) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = newSortField;
            sortDirection = 'asc';
        }
        filtrarStock(); // Reordenar y renderizar
    }

    function updateSortIndicators() {
        tableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';

            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    // =================================================================
    // --- FUNCIONES DE CATEGORÍAS PARA EDICIÓN ---
    // =================================================================

    const API_CATEGORIAS_URL = '/api/categorias';

    async function loadCategoriasParaEdicion() {
        if (!editCategoriaSearchInput) return;
        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/select`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasLasCategoriasEdicion = await response.json();
        } catch (error) {
            console.error(error);
            if (editCategoriaSearchInput) {
                editCategoriaSearchInput.placeholder = "Error al cargar categorías";
            }
        }
    }

    function filtrarCategoriasEdicion() {
        if (!editCategoriaSearchInput || !editCategoriaResultsContainer) return;
        const query = editCategoriaSearchInput.value.toLowerCase();
        const categoriasFiltradas = todasLasCategoriasEdicion.filter(c =>
            c.nombre.toLowerCase().includes(query)
        );
        renderResultadosCategoriasEdicion(categoriasFiltradas);
    }

    function renderResultadosCategoriasEdicion(categorias) {
        if (!editCategoriaResultsContainer) return;
        if (categorias.length === 0) {
            editCategoriaResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            editCategoriaResultsContainer.innerHTML = categorias.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${c.nombre}</div>`
            ).join('');
        }
        editCategoriaResultsContainer.style.display = 'block';
    }

    function seleccionarCategoriaEdicion(event) {
        if (!editCategoriaSearchInput || !editCategoriaHiddenInput || !editCategoriaResultsContainer) return;
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const categoriaId = parseInt(target.dataset.id, 10);
        const categoria = todasLasCategoriasEdicion.find(c => c.id === categoriaId);

        if (categoria) {
            editCategoriaSearchInput.value = categoria.nombre;
            editCategoriaHiddenInput.value = categoria.id;
            editCategoriaResultsContainer.style.display = 'none';
            if (errorEditCategoria) errorEditCategoria.textContent = '';
        }
    }

    // =================================================================
    // --- FUNCIONES DE DETALLE (read-only - empleado) ---
    // =================================================================

    const detailModal = document.getElementById('product-detail-modal');
    const detailCloseBtn = document.getElementById('product-detail-close');
    const detailCloseBtnFooter = document.getElementById('product-detail-close-btn');
    const API_PRODUCTOS_INVENTARIO_URL = '/api/productos/inventario';

    // --- Lógica de Pestañas (idéntica al admin) ---
    const detailTabs = document.querySelectorAll('#product-detail-modal .product-detail-tab');
    detailTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todas las pestañas
            detailTabs.forEach(t => t.classList.remove('active'));
            // Ocultar todos los contenidos
            document.querySelectorAll('#product-detail-modal .product-detail-tab-content').forEach(c => c.style.display = 'none');
            // Activar la pestaña clickeada
            tab.classList.add('active');
            // Mostrar el contenido correspondiente
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.style.display = 'block';
        });
    });

    // Función para resetear al Tab 1 al abrir el modal
    function resetDetailTabs() {
        detailTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#product-detail-modal .product-detail-tab-content').forEach(c => c.style.display = 'none');
        const firstTab = document.querySelector('#product-detail-modal .product-detail-tab[data-tab="product-detail-tab-info"]');
        if (firstTab) firstTab.classList.add('active');
        const firstContent = document.getElementById('product-detail-tab-info');
        if (firstContent) firstContent.style.display = 'block';
    }

    async function openDetailModal(productId, targetTabId = null) {
        try {
            // Resetear pestañas al abrir
            resetDetailTabs();

            const response = await fetch(`${API_PRODUCTOS_INVENTARIO_URL}?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);

            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            document.getElementById('detail-nombre').textContent = product.nombre || 'N/A';
            document.getElementById('detail-categoria').textContent = product.categoria || 'N/A';
            document.getElementById('detail-descripcion').textContent = product.descripcion || 'N/A';
            document.getElementById('detail-precio').textContent = product.precio > 0
                ? `$${product.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'No establecido';

            let fechaFormateada = 'N/A';
            if (product.fechaCreacion) {
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            document.getElementById('detail-fecha').textContent = fechaFormateada;

            document.getElementById('detail-stock-actual').textContent = product.stock;
            document.getElementById('detail-stock-min').textContent = product.stockMinimo;
            document.getElementById('detail-stock-max').textContent = product.stockMaximo;

            let estadoTexto = 'N/A';
            let estadoClase = '';
            let badgeBg = 'rgba(16,185,129,0.25)';
            let badgeBorder = 'rgba(16,185,129,0.3)';

            if (product.stock === undefined || product.stock === null) {
                estadoTexto = 'N/A';
            } else if (product.stock <= 0) {
                estadoTexto = 'Agotado';
                estadoClase = 'empty';
                badgeBg = 'rgba(239,68,68,0.25)';
                badgeBorder = 'rgba(239,68,68,0.3)';
            } else if (product.stockMinimo && product.stock < product.stockMinimo) {
                estadoTexto = 'Bajo';
                estadoClase = 'low';
                badgeBg = 'rgba(245,158,11,0.25)';
                badgeBorder = 'rgba(245,158,11,0.3)';
            } else {
                estadoTexto = 'Óptimo';
                estadoClase = 'good';
            }

            // Banner badge (en el header)
            document.getElementById('detail-stock-estado').textContent = estadoTexto;
            const estadoBadgeEl = document.getElementById('detail-stock-estado-badge');
            if (estadoBadgeEl) {
                estadoBadgeEl.style.background = badgeBg;
                estadoBadgeEl.style.borderColor = badgeBorder;
            }

            // Config section badge
            const estadoTextEl = document.getElementById('detail-stock-estado-text');
            if (estadoTextEl) {
                estadoTextEl.innerHTML = `<span class="stock-badge ${estadoClase}" style="padding-left: 6px; padding-right: 8px;">${estadoTexto}</span>`;
            }

            // Cargar proveedores asociados
            const proveedoresBody = document.getElementById('detail-proveedores-body');
            if (proveedoresBody) {
                proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
                try {
                    const provResponse = await fetch(`/api/productos/${productId}/proveedores`, { cache: 'no-store' });
                    if (provResponse.ok) {
                        const proveedores = await provResponse.json();
                        // Actualizar badge de la pestaña
                        const provBadge = document.getElementById('product-detail-tab-proveedores-badge');
                        if (provBadge) provBadge.textContent = proveedores.length;

                        if (proveedores.length === 0) {
                            proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">Sin proveedores asociados</td></tr>';
                        } else {
                            proveedoresBody.innerHTML = proveedores.map(prov => `
                                <tr>
                                    <td style="font-weight: 500;">${prov.nombre || 'N/A'}</td>
                                    <td>${prov.telefono || '<span style="color: #94a3b8;">—</span>'}</td>
                                    <td>${prov.email || '<span style="color: #94a3b8;">—</span>'}</td>
                                </tr>
                            `).join('');
                        }
                    } else {
                        proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
                    }
                } catch (provErr) {
                    console.error('Error al cargar proveedores:', provErr);
                    proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
                }
            }

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

            if (targetTabId) {
                const targetTab = document.querySelector(`#product-detail-modal .product-detail-tab[data-tab="${targetTabId}"]`);
                if (targetTab) targetTab.click();
            }

            detailModal.style.display = 'flex';

            const handleEscKey = (e) => { if (e.key === 'Escape') closeDetailModal(); };
            document.addEventListener('keydown', handleEscKey);
            detailModal._escHandler = handleEscKey;

        } catch (error) {
            console.error('Error al abrir modal de detalles:', error);
            alert('Error al cargar los detalles del producto');
        }
    }

    function closeDetailModal() {
        if (!detailModal) return;
        detailModal.style.display = 'none';
        if (detailModal._escHandler) {
            document.removeEventListener('keydown', detailModal._escHandler);
            detailModal._escHandler = null;
        }
    }

    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailModal);
    if (detailCloseBtnFooter) detailCloseBtnFooter.addEventListener('click', closeDetailModal);
    if (detailModal) {
        detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });
    }

    // =================================================================
    // --- FUNCIONES DE EDICIÓN/BORRADO ---
    // =================================================================

    function removerFilaDelDOM(id) {
        const botonParaBorrar = tableBody.querySelector(`.btn-delete-producto[data-id="${id}"]`);
        if (botonParaBorrar) {
            const fila = botonParaBorrar.closest('tr');
            if (fila) fila.remove();
        }
        todosLosProductos = todosLosProductos.filter(p => p.id != id);
        currentListForPagination = currentListForPagination.filter(p => p.id != id);
        renderStockTable();
        // Actualizamos resumen al borrar
        actualizarResumenDashboard(todosLosProductos);
    }

    function openEditModal(id) {
        if (isReadOnly) return;
        const producto = todosLosProductos.find(p => p.id == id);
        if (!producto) return;

        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        if (editFormGeneralMessage) {
            editFormGeneralMessage.textContent = '';
            editFormGeneralMessage.className = 'form-message';
        }

        editProductId.value = producto.id;
        editNombre.value = producto.nombre;

        // Configurar categoría con búsqueda autocompletable
        if (editCategoriaSearchInput && editCategoriaHiddenInput) {
            editCategoriaSearchInput.value = producto.categoria;
            editCategoriaHiddenInput.value = producto.idCategoria || '';
        }

        editDescripcion.value = producto.descripcion;
        editPrecio.value = producto.precio.toFixed(2);
        editStockActual.value = producto.stock;
        editCantidadAjuste.value = 0;

        if (editModal) editModal.style.display = 'block';
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        if (isReadOnly) return;

        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';

        const id = editProductId.value;
        const ajuste = parseInt(editCantidadAjuste.value) || 0;

        // Validación de categoría
        const idCategoria = editCategoriaHiddenInput ? parseInt(editCategoriaHiddenInput.value, 10) : null;

        let isValid = true;
        if (editNombre.value.trim() === "") { errorEditNombre.textContent = 'Campo obligatorio'; isValid = false; }
        if (!idCategoria) { errorEditCategoria.textContent = 'Debe seleccionar una categoría'; isValid = false; }
        if (parseFloat(editPrecio.value) < 0 || isNaN(parseFloat(editPrecio.value)) || editPrecio.value.trim() === "") { errorEditPrecio.textContent = 'Precio inválido'; isValid = false; }
        if (isNaN(ajuste)) { errorEditAjuste.textContent = 'Número inválido'; isValid = false; }

        if (!isValid) return;

        const actualizarDTO = {
            nombre: editNombre.value.trim(),
            idCategoria: idCategoria,
            descripcion: editDescripcion.value.trim(),
            precio: parseFloat(editPrecio.value),
            cantidadExtraStock: ajuste
        };

        try {
            const response = await fetch(API_STOCK_EDIT_URL + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actualizarDTO)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error HTTP: ${response.status}`);
            }
            editModal.style.display = 'none';

            // Recargamos todo para ver los cambios reflejados
            loadStock();
            document.dispatchEvent(new Event('productosActualizados')); // Avisar a otros módulos

        } catch (error) {
            console.error('Error al actualizar:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // --- 7. LISTENERS ---
    // =================================================================

    if (searchInput) {
        searchInput.addEventListener('input', filtrarStock);
    }

    // Botón limpiar búsqueda
    const btnLimpiarBusqueda = document.getElementById('stock-btn-limpiar-busqueda');
    if (btnLimpiarBusqueda) {
        btnLimpiarBusqueda.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            filtrarStock();
        });
    }

    tableHeaders.forEach(th => th.addEventListener('click', handleSortClick));

    // Listeners para búsqueda de categorías en modal de edición
    if (editCategoriaSearchInput) {
        editCategoriaSearchInput.addEventListener('input', filtrarCategoriasEdicion);
        editCategoriaSearchInput.addEventListener('focus', filtrarCategoriasEdicion);
    }

    if (editCategoriaResultsContainer) {
        editCategoriaResultsContainer.addEventListener('click', seleccionarCategoriaEdicion);
    }

    if (btnAddCategoriaEdit) {
        btnAddCategoriaEdit.addEventListener('click', function () {
            // Abrir el modal de crear categoría existente
            const addCategoriaModal = document.getElementById('modal-add-categoria-overlay');
            if (addCategoriaModal) {
                addCategoriaModal.style.display = 'flex';
                const addCategoriaNombre = document.getElementById('addCategoriaNombre');
                if (addCategoriaNombre) addCategoriaNombre.focus();
            }
        });
    }

    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (editCategoriaSearchInput && editCategoriaResultsContainer) {
            if (!editCategoriaSearchInput.contains(e.target) && !editCategoriaResultsContainer.contains(e.target)) {
                editCategoriaResultsContainer.style.display = 'none';
            }
        }
    });

    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            const target = event.target;

            // Botón ver detalle (solo empleado - read-only)
            const viewButton = target.closest('.btn-action.view');
            if (viewButton) {
                openDetailModal(viewButton.dataset.id);
                return;
            }

            // Click en el badge de proveedores
            const badgeWrapper = target.closest('.proveedor-badge-wrapper');
            if (badgeWrapper) {
                openDetailModal(badgeWrapper.dataset.id, 'product-detail-tab-proveedores');
                return;
            }

            if (isReadOnly) return;

            // Usamos .closest para atrapar clicks en el ícono <i> o en el botón
            const deleteButton = target.closest('.btn-delete-producto');
            if (deleteButton && !isReadOnly) {
                const idParaBorrar = deleteButton.dataset.id;
                showConfirmationModal(
                    '¿Estás seguro de que quieres eliminar este producto?',
                    async () => {
                        try {
                            const response = await fetch(API_PRODUCTOS_DELETE_URL + idParaBorrar, { method: 'DELETE' });
                            if (response.ok) {
                                removerFilaDelDOM(idParaBorrar);
                                document.dispatchEvent(new Event('productosActualizados'));
                            } else {
                                const errorTexto = await response.text();
                                if (response.status === 400 && errorTexto.includes('INACTIVO')) {
                                    removerFilaDelDOM(idParaBorrar);
                                } else {
                                    throw new Error(errorTexto || `Error HTTP: ${response.status}`);
                                }
                            }
                        } catch (error) {
                            console.error('Error al eliminar:', error.message);
                            if (!error.message.includes('INACTIVO')) alert(`Error: ${error.message}`);
                        }
                    }
                );
            }
            const editButton = target.closest('.btn-edit-producto');
            if (editButton && editModal) {
                openEditModal(editButton.dataset.id);
            }
        });
    }

    if (!isReadOnly) {
        const handleEditEsc = (e) => { if (e.key === 'Escape' && editModal.style.display === 'block') editModal.style.display = 'none'; };
        window.addEventListener('keydown', handleEditEsc);

        if (editModalCloseBtn) editModalCloseBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
        if (editProductForm) editProductForm.addEventListener('submit', handleEditSubmit);
    }

    if (prevPageBtn) prevPageBtn.addEventListener('click', async () => { if (currentPage > 1) { currentPage--; await renderStockTable(); } });
    if (nextPageBtn) nextPageBtn.addEventListener('click', async () => {
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; await renderStockTable(); }
    });

    // =================================================================
    // --- 8. CARGA INICIAL Y EVENTOS GLOBALES ---
    // =================================================================

    loadStock();
    loadCategoriasParaEdicion();

    // EXPOSICIÓN GLOBAL: Para que admin.js pueda llamar a esta función
    window.cargarDatosStock = function () {
        todosLosProductos = []; // Forzamos vaciar para recargar de la API
        loadStock();
    };

    // ESCUCHA DE EVENTOS: Para recargar si se crea/edita producto en otra pestaña
    document.addEventListener('productosActualizados', function () {
        console.log('Stock.js: Detectado cambio en inventario. Recargando...');
        todosLosProductos = [];
        loadStock();
    });

    // ESCUCHA DE EVENTOS: Para recargar si se registra una venta
    document.addEventListener('ventaRegistrada', function () {
        console.log('Stock.js: Venta registrada. Recargando stock...');
        todosLosProductos = [];
        loadStock();
    });
});