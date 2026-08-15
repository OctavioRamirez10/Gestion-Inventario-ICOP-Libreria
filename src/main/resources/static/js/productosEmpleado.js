document.addEventListener('DOMContentLoaded', function () {

    const productTableBody = document.getElementById('product-table-body');
    const prevPageBtn = document.getElementById('product-prev-page');
    const nextPageBtn = document.getElementById('product-next-page');
    const pageInfo = document.getElementById('product-page-info');
    const mainContent = document.querySelector('.main-content');
    const productSearchInputElement = document.getElementById('product-search-input');
    const productBtnLimpiar = document.getElementById('product-btn-limpiar-busqueda');
    const filterStockEstado = document.getElementById('filter-stock-estado');
    const filterCategoria = document.getElementById('filter-categoria');
    const filterProveedor = document.getElementById('filter-proveedor');
    const sortBtnNombre = document.getElementById('sort-btn-nombre');
    const sortBtnPrecio = document.getElementById('sort-btn-precio');

    const API_PRODUCTOS_URL = '/api/productos';
    const API_CATEGORIAS_URL = '/api/categorias';

    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 10;
    let sortField = 'estadoStock';
    let sortDirection = 'asc';
    let todasLasCategorias = [];
    let todosLosProductos = [];
    let productosBuscados = null;
    let searchTimeout = null;
    let isLoadingProducts = false;
    let filtroStockEstado = 'todos';
    let filtroCategoria = 'todos';
    let filtroProveedor = 'todos';

    // =====================
    // CARGAR PRODUCTOS
    // =====================
    async function loadProducts() {
        if (!productTableBody || !mainContent) return;
        if (isLoadingProducts) return;
        isLoadingProducts = true;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        productTableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

            const pageData = await response.json();
            todosLosProductos = pageData.content;

            poblarDropdownsFiltro();

            let productosParaFiltrar = todosLosProductos;
            if (productSearchInputElement && productSearchInputElement.value.trim() !== '') {
                const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());
                productosBuscados = todosLosProductos.filter(p =>
                    (p.nombre && removeAccents(p.nombre.toLowerCase()).includes(textoBusqueda)) ||
                    (p.categoria && removeAccents(p.categoria.toLowerCase()).includes(textoBusqueda)) ||
                    (p.descripcion && removeAccents(p.descripcion.toLowerCase()).includes(textoBusqueda)) ||
                    (p.proveedorNombre && removeAccents(p.proveedorNombre.toLowerCase()).includes(textoBusqueda))
                );
                productosParaFiltrar = productosBuscados;
            }

            const productosAMostrar = aplicarFiltros(productosParaFiltrar);
            const productosSorted = clientSideSort(productosAMostrar);

            totalPages = Math.ceil(productosSorted.length / itemsPerPage);
            if (currentPage >= totalPages && totalPages > 0) currentPage = totalPages - 1;
            if (currentPage < 0) currentPage = 0;

            const startIndex = currentPage * itemsPerPage;
            const productosPaginados = productosSorted.slice(startIndex, startIndex + itemsPerPage);

            renderProductTable(productosPaginados);
            updatePaginationControls();
            updateSortIndicators();
            actualizarColorColumnaStock();

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                productTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="6">Error al cargar productos.</td></tr>`;
            productTableBody.classList.remove('loading');
        } finally {
            isLoadingProducts = false;
        }
    }

    window.loadProducts = loadProducts;

    // =====================
    // POBLAR DROPDOWNS
    // =====================
    function poblarDropdownsFiltro() {
        if (filterCategoria && todasLasCategorias.length > 0) {
            const valorActual = filterCategoria.value;
            filterCategoria.innerHTML = '<option value="todos">🏷️ Categoría: Todas</option>';
            [...todasLasCategorias]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
                .forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.nombre;
                    opt.textContent = c.nombre;
                    filterCategoria.appendChild(opt);
                });
            filterCategoria.value = valorActual;
        }

        if (filterProveedor && todosLosProductos.length > 0) {
            const valorActual = filterProveedor.value;
            filterProveedor.innerHTML = '<option value="todos">🚚 Proveedor: Todos</option>';
            const proveedoresSet = new Set();
            let haySinProveedor = false;
            todosLosProductos.forEach(p => {
                if (p.proveedorNombre) proveedoresSet.add(p.proveedorNombre);
                else haySinProveedor = true;
                if (p.otrosProveedores) p.otrosProveedores.forEach(n => proveedoresSet.add(n));
            });
            if (haySinProveedor) {
                const opt = document.createElement('option');
                opt.value = 'sin-proveedor';
                opt.textContent = '— Sin proveedor';
                filterProveedor.appendChild(opt);
            }
            [...proveedoresSet]
                .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
                .forEach(nombre => {
                    const opt = document.createElement('option');
                    opt.value = nombre;
                    opt.textContent = nombre;
                    filterProveedor.appendChild(opt);
                });
            filterProveedor.value = valorActual;
        }
    }

    // =====================
    // FILTROS Y SORTING
    // =====================
    function aplicarFiltros(productos) {
        let resultado = productos || todosLosProductos;
        if (!resultado) return [];

        const filtroToEstado = { 'agotado': 'AGOTADO', 'bajo': 'BAJO', 'optimo': 'BUENO' };
        if (filtroStockEstado !== 'todos' && filtroToEstado[filtroStockEstado]) {
            resultado = resultado.filter(p => p.estadoStock === filtroToEstado[filtroStockEstado]);
        }
        if (filtroCategoria !== 'todos') {
            resultado = resultado.filter(p => p.categoria && p.categoria.toLowerCase() === filtroCategoria.toLowerCase());
        }
        if (filtroProveedor !== 'todos') {
            if (filtroProveedor === 'sin-proveedor') {
                resultado = resultado.filter(p => !p.proveedorNombre);
            } else {
                resultado = resultado.filter(p => p.proveedorNombre && p.proveedorNombre.toLowerCase() === filtroProveedor.toLowerCase());
            }
        }
        return resultado;
    }

    function clientSideSort(productos) {
        if (!sortField || productos.length === 0) return productos;

        if (sortField === 'estadoStock') {
            const prioridad = { 'AGOTADO': 0, 'BAJO': 1, 'BUENO': 2 };
            return [...productos].sort((a, b) => {
                const aP = prioridad[a.estadoStock] ?? 3;
                const bP = prioridad[b.estadoStock] ?? 3;
                if (aP !== bP) return sortDirection === 'asc' ? aP - bP : bP - aP;
                return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
            });
        }

        const fieldMap = { 'stock': 'stockActual' };
        const actualField = fieldMap[sortField] || sortField;

        return [...productos].sort((a, b) => {
            let aVal = a[actualField];
            let bVal = b[actualField];
            if (actualField === 'proveedorNombre') {
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
            }
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const cmp = String(aVal).localeCompare(String(bVal), 'es', { sensitivity: 'base' });
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }

    function updateSortIndicators() {
        document.querySelectorAll('#productos-section .data-table th[data-sort-by]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';
            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });

        document.querySelectorAll('#productos-section [id^="sort-btn-"]').forEach(btn => {
            const field = btn.getAttribute('data-sort-field');
            const icon = btn.querySelector('i');
            if (field === sortField) {
                btn.style.background = '#e8f0fe';
                btn.style.borderColor = '#4285f4';
                btn.style.color = '#1a73e8';
                btn.style.fontWeight = '600';
                if (icon) icon.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
            } else {
                btn.style.background = 'white';
                btn.style.borderColor = '#ddd';
                btn.style.color = '#333';
                btn.style.fontWeight = 'normal';
                if (icon) icon.className = 'fas fa-sort';
            }
        });
    }

    function actualizarColorColumnaStock() {
        const thStock = document.getElementById('th-stock');
        if (!thStock) return;
        thStock.classList.remove('sort-asc', 'sort-desc');
        thStock.style.backgroundColor = '';
        thStock.style.color = '';
        if (filtroStockEstado !== 'todos') thStock.classList.add('sort-asc');
    }

    // =====================
    // RENDERIZAR TABLA
    // =====================
    function getStockBadge(stockActual, estadoStock) {
        const clases = { 'BUENO': 'good', 'BAJO': 'low', 'AGOTADO': 'empty' };
        const badgeClass = clases[estadoStock] || 'good';
        return `<span class="stock-badge ${badgeClass}">${stockActual}</span>`;
    }

    function renderProductTable(products) {
        if (!productTableBody) return;
        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6">No hay productos registrados.</td></tr>';
            return;
        }
        products.forEach(product => {
            const stockBadge = getStockBadge(product.stockActual, product.estadoStock);
            let proveedorCell = '<span style="color: #94a3b8; font-style: italic;">Sin proveedor</span>';
            if (product.proveedorNombre) {
                proveedorCell = product.proveedorNombre;
                if (product.totalProveedores > 1) {
                    const extras = product.totalProveedores - 1;
                    const nombres = (product.otrosProveedores && product.otrosProveedores.length > 0)
                        ? product.otrosProveedores.join(', ')
                        : `${extras} proveedor(es) más`;
                    proveedorCell += ` <div class="proveedor-badge-wrapper" data-id="${product.idProducto}" style="cursor: pointer;" title="Ver proveedores">` +
                        `<span class="proveedor-badge">+${extras} ${extras === 1 ? 'opción' : 'opciones'}</span>` +
                        `<div class="proveedor-popover">` +
                        `<div class="popover-label">También suministrado por:</div>` +
                        `<div class="popover-names">${nombres}</div>` +
                        `</div></div>`;
                }
            }
            productTableBody.innerHTML += `
                <tr>
                    <td style="text-align: left; font-weight: 500;">${product.nombre || 'N/A'}</td>
                    <td style="text-align: left;">${product.categoria || 'N/A'}</td>
                    <td style="text-align: center;">${proveedorCell}</td>
                    <td style="text-align: center;">${stockBadge}</td>
                    <td style="text-align: right; font-weight: 600;">$${product.precio != null ? product.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                    <td style="text-align: right;">
                        <div class="action-buttons" style="justify-content: flex-end;">
                            <button class="btn-action view" title="Ver detalles" data-id="${product.idProducto}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });
        attachActionListeners();
    }

    function attachActionListeners() {
        document.querySelectorAll('.btn-action.view').forEach(btn => {
            btn.addEventListener('click', (e) => openDetailModal(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.proveedor-badge-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                openDetailModal(e.currentTarget.getAttribute('data-id'), 'product-detail-tab-proveedores');
            });
        });
    }

    // =====================
    // PAGINACIÓN
    // =====================
    function updatePaginationControls() {
        if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
        pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 0);
        nextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 0) { currentPage--; loadProducts(); }
        });
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage + 1 < totalPages) { currentPage++; loadProducts(); }
        });
    }

    // =====================
    // SUBSECCIONES
    // =====================
    const productosSection = document.getElementById('productos-section');
    const subsectionContainers = productosSection ? productosSection.querySelectorAll('.subsection-container') : [];

    function showSubsection(subsectionId) {
        subsectionContainers.forEach(c => c.style.display = 'none');
        const target = document.getElementById(`${subsectionId}-container`);
        if (target) target.style.display = 'block';
    }

    window.showProductSubsection = showSubsection;

    // =====================
    // MODAL DETALLE
    // =====================
    const detailModal = document.getElementById('product-detail-modal');
    const detailCloseBtn = document.getElementById('product-detail-close');
    const detailCloseBtnFooter = document.getElementById('product-detail-close-btn');

    // --- Lógica de Pestañas ---
    const detailTabs = document.querySelectorAll('#product-detail-modal .product-detail-tab');
    detailTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            detailTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#product-detail-modal .product-detail-tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.style.display = 'block';
        });
    });

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
            resetDetailTabs();

            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);
            if (!product) { alert('Producto no encontrado'); return; }

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
            document.getElementById('detail-stock-actual').textContent = product.stockActual;
            document.getElementById('detail-stock-min').textContent = product.stockMinimo;
            document.getElementById('detail-stock-max').textContent = product.stockMaximo;

            let estadoTexto = 'N/A', estadoClase = '';
            let badgeBg = 'rgba(16,185,129,0.25)', badgeBorder = 'rgba(16,185,129,0.3)';

            if (product.estadoStock === 'AGOTADO' || product.stockActual === 0) {
                estadoTexto = 'Agotado'; estadoClase = 'empty';
                badgeBg = 'rgba(239,68,68,0.25)'; badgeBorder = 'rgba(239,68,68,0.3)';
            } else if (product.estadoStock === 'BAJO' || (product.stockMinimo && product.stockActual < product.stockMinimo)) {
                estadoTexto = 'Bajo'; estadoClase = 'low';
                badgeBg = 'rgba(245,158,11,0.25)'; badgeBorder = 'rgba(245,158,11,0.3)';
            } else if (product.estadoStock === 'BUENO' || product.stockActual >= product.stockMinimo) {
                estadoTexto = 'Óptimo'; estadoClase = 'good';
            } else {
                estadoTexto = 'N/A';
            }

            document.getElementById('detail-stock-estado').textContent = estadoTexto;
            const estadoBadgeEl = document.getElementById('detail-stock-estado-badge');
            if (estadoBadgeEl) {
                estadoBadgeEl.style.background = badgeBg;
                estadoBadgeEl.style.borderColor = badgeBorder;
            }

            const estadoTextEl = document.getElementById('detail-stock-estado-text');
            if (estadoTextEl) {
                estadoTextEl.innerHTML = `<span class="stock-badge ${estadoClase}" style="padding-left: 6px; padding-right: 8px;">${estadoTexto}</span>`;
            }

            const proveedoresBody = document.getElementById('detail-proveedores-body');
            if (proveedoresBody) {
                proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

                try {
                    const provResponse = await fetch(`${API_PRODUCTOS_URL}/${productId}/proveedores`, { cache: 'no-store' });
                    if (provResponse.ok) {
                        const proveedores = await provResponse.json();
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
                                </tr>`).join('');
                        }
                    } else {
                        proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
                    }
                } catch (e) {
                    proveedoresBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
                }
            }

            if (targetTabId) {
                const targetTab = document.querySelector(`#product-detail-modal .product-detail-tab[data-tab="${targetTabId}"]`);
                if (targetTab) targetTab.click();
            }

            detailModal.style.display = 'flex';
            const handleEsc = (e) => { if (e.key === 'Escape') closeDetailModal(); };
            document.addEventListener('keydown', handleEsc);
            detailModal._escHandler = handleEsc;

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
    if (detailModal) detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

    // =====================
    // BÚSQUEDA Y FILTROS
    // =====================
    function removeAccents(str) {
        return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function filtrarProductosPorBusqueda() {
        if (!productTableBody) return;
        const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());
        productosBuscados = textoBusqueda === '' ? null : todosLosProductos.filter(p =>
            (p.nombre && removeAccents(p.nombre.toLowerCase()).includes(textoBusqueda)) ||
            (p.categoria && removeAccents(p.categoria.toLowerCase()).includes(textoBusqueda)) ||
            (p.descripcion && removeAccents(p.descripcion.toLowerCase()).includes(textoBusqueda))
        );
        currentPage = 0;
        loadProducts();
    }

    function limpiarBusqueda() {
        if (productSearchInputElement) productSearchInputElement.value = '';
        productosBuscados = null;
        filtroStockEstado = 'todos';
        if (filterStockEstado) filterStockEstado.value = 'todos';
        filtroCategoria = 'todos';
        if (filterCategoria) filterCategoria.value = 'todos';
        filtroProveedor = 'todos';
        if (filterProveedor) filterProveedor.value = 'todos';
        sortField = 'estadoStock';
        sortDirection = 'asc';
        currentPage = 0;
        loadProducts();
    }

    if (filterStockEstado) filterStockEstado.addEventListener('change', (e) => { filtroStockEstado = e.target.value; currentPage = 0; loadProducts(); });
    if (filterCategoria) filterCategoria.addEventListener('change', (e) => { filtroCategoria = e.target.value; currentPage = 0; loadProducts(); });
    if (filterProveedor) filterProveedor.addEventListener('change', (e) => { filtroProveedor = e.target.value; currentPage = 0; loadProducts(); });

    if (productSearchInputElement) {
        productSearchInputElement.addEventListener('input', () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(filtrarProductosPorBusqueda, 100);
        });
    }
    if (productBtnLimpiar) productBtnLimpiar.addEventListener('click', limpiarBusqueda);

    // =====================
    // SORT BUTTONS
    // =====================
    function handleSortButtonClick(field) {
        if (sortField === field) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        else { sortField = field; sortDirection = 'asc'; }
        currentPage = 0;
        loadProducts();
    }

    if (sortBtnNombre) sortBtnNombre.addEventListener('click', () => handleSortButtonClick('nombre'));
    if (sortBtnPrecio) sortBtnPrecio.addEventListener('click', () => handleSortButtonClick('precio'));

    // =====================
    // FILTRAR POR ESTADO (llamado desde principal)
    // =====================
    window.filtrarPorEstado = function(valor) {
        filtroStockEstado = valor;
        if (filterStockEstado) filterStockEstado.value = valor;
        filtroCategoria = 'todos';
        if (filterCategoria) filterCategoria.value = 'todos';
        filtroProveedor = 'todos';
        if (filterProveedor) filterProveedor.value = 'todos';
        sortField = 'estadoStock';
        sortDirection = 'asc';
        currentPage = 0;
        loadProducts();
    };

    // =====================
    // CARGA INICIAL
    // =====================
    async function loadCategoriasParaProductos() {
        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/select`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasLasCategorias = await response.json();
            poblarDropdownsFiltro();
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    loadProducts();
    loadCategoriasParaProductos();
});
