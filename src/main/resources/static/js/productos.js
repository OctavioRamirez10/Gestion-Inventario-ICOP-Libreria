/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista de productos (paginada y ordenada).
 * - Validar y enviar el formulario para registrar nuevos productos.
 * - Controlar la paginación y ordenamiento de la tabla.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // ESTADO PARA INTEGRACIÓN CON ORDEN DE COMPRA
    // ==========================================
    window.selectedProductsForOC = new Set();
    window.activeProviderForOC = null;
    window.selectedProductsDetailsForOC = {};

    window.updateOCCheckboxesState = function() {
        const buttons = document.querySelectorAll('.btn-oc-toggle');
        buttons.forEach(btn => {
            const providerName = btn.getAttribute('data-provider-name');
            const productId = btn.getAttribute('data-product-id');
            
            // 1. Sincronizar clases visuales de activo/inactivo
            const isChecked = window.selectedProductsForOC && window.selectedProductsForOC.has(productId.toString());
            if (isChecked) {
                btn.classList.add('btn-oc-active');
                btn.classList.remove('btn-oc-inactive');
                btn.innerHTML = '<i class="fas fa-check"></i> En Orden';
            } else {
                btn.classList.add('btn-oc-inactive');
                btn.classList.remove('btn-oc-active');
                btn.innerHTML = '<i class="fas fa-file-invoice"></i> Añadir';
            }

            // 2. Controlar si está deshabilitado por proveedor
            if (!providerName) {
                btn.disabled = true;
                btn.title = "Este producto no tiene un proveedor asignado";
                return;
            }

            if (window.activeProviderForOC && window.activeProviderForOC !== providerName) {
                btn.disabled = true;
                btn.title = `Solo se pueden seleccionar productos del proveedor: ${window.activeProviderForOC}`;
            } else {
                btn.disabled = false;
                btn.title = "";
            }
        });

        if (filterProveedor) {
            filterProveedor.disabled = !!window.activeProviderForOC;
        }
    };

    window.updateOCActionBar = function() {
        const bar = document.getElementById('stock-oc-action-bar');
        const countSpan = document.getElementById('stock-oc-selected-count');
        const providerSpan = document.getElementById('stock-oc-selected-provider');

        if (!bar) return;

        const count = window.selectedProductsForOC.size;
        if (count > 0) {
            countSpan.textContent = `${count} producto${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;
            providerSpan.textContent = `Proveedor: ${window.activeProviderForOC}`;
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }
    };

    window.clearOCSelection = function() {
        window.selectedProductsForOC.clear();
        window.activeProviderForOC = null;
        window.selectedProductsDetailsForOC = {};
        
        if (filterProveedor) {
            filterProveedor.value = 'todos';
            filtroProveedor = 'todos';
            filterProveedor.disabled = false;
        }

        currentPage = 0;
        window.updateOCActionBar();
        loadProducts();
    };

    // Bind clean selection on cancel button click
    const btnClearOC = document.getElementById('btn-clear-oc-selection');
    if (btnClearOC) {
        btnClearOC.addEventListener('click', window.clearOCSelection);
    }

    // ===============================
    // SELECTORES DE ELEMENTOS DEL DOM
    // ===============================
    const productForm = document.getElementById('product-form');
    const productTableBody = document.getElementById('product-table-body');
    const nameInput = document.getElementById('product-name');
    const categorySearchInput = document.getElementById('product-category-search');
    const categoryHiddenInput = document.getElementById('product-category-id-hidden');
    const categoryResultsContainer = document.getElementById('product-category-results');
    const descriptionInput = document.getElementById('product-description');
    const stockMinInput = document.getElementById('product-stock-min');
    const stockMaxInput = document.getElementById('product-stock-max');
    const generalMessage = document.getElementById('form-general-message-producto');

    // Selectores de error
    const nameError = document.getElementById('error-product-name');
    const categoryError = document.getElementById('error-product-category-search');
    const descriptionError = document.getElementById('error-product-description');
    const stockMinError = document.getElementById('error-product-stock-min');
    const stockMaxError = document.getElementById('error-product-stock-max');

    // Selectores del modal de categoría
    const addCategoriaModal = document.getElementById('modal-add-categoria-overlay');
    const addCategoriaBtn = document.getElementById('btn-add-categoria');
    const addCategoriaCloseBtn = document.getElementById('modal-add-categoria-close');
    const addCategoriaForm = document.getElementById('add-categoria-form');
    const addCategoriaMessage = document.getElementById('form-general-message-add-categoria');

    // --- Selectores de Paginación y Estabilidad ---
    const prevPageBtn = document.getElementById('product-prev-page');
    const nextPageBtn = document.getElementById('product-next-page');
    const pageInfo = document.getElementById('product-page-info');

    // CORRECCIÓN: Para el control de scroll y foco
    const mainContent = document.querySelector('.main-content');

    // --- Selectores de Búsqueda ---
    const productSearchInputElement = document.getElementById('product-search-input');
    const productBtnBuscar = document.getElementById('product-btn-buscar');
    const productBtnLimpiar = document.getElementById('product-btn-limpiar-busqueda');
    const productSearchError = document.getElementById('product-search-error');

    // --- Botón de limpiar formulario ---
    const btnLimpiarFormulario = document.getElementById('btn-limpiar-producto');

    // --- Selectores de Modal de Edición ---
    const editModal = document.getElementById('product-edit-modal');
    const editForm = document.getElementById('product-edit-form');
    const editCloseBtn = document.getElementById('product-edit-close');
    const editCancelBtn = document.getElementById('product-edit-cancel');
    const editSaveBtn = document.getElementById('product-edit-save');
    const editProductId = document.getElementById('edit-product-id');
    const editNameInput = document.getElementById('edit-product-name');
    const editCategorySearchInput = document.getElementById('edit-product-category-search');
    const editCategoryHiddenInput = document.getElementById('edit-product-category-id-hidden');
    const editCategoryResultsContainer = document.getElementById('edit-product-category-results');
    const editDescriptionInput = document.getElementById('edit-product-description');
    const editPriceInput = document.getElementById('edit-product-price');
    const editStockMinInput = document.getElementById('edit-product-stock-min');
    const editStockMaxInput = document.getElementById('edit-product-stock-max');
    const editFormMessage = document.getElementById('edit-form-message');

    // --- Selectores de Modal de Eliminación (modal genérico) ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteModalMessage = document.getElementById('delete-modal-message');
    const deleteCancelBtn = document.getElementById('cancel-delete-btn');
    const deleteConfirmBtn = document.getElementById('confirm-delete-btn');
    let deleteProductId = null;  // Variable para guardar el ID del producto a eliminar





    // ===============================
    // RESTRICCIONES DE TECLADO (NÚMEROS)
    // ===============================
    function restrictToNumbers(inputEl, allowDecimals = false) {
        if (!inputEl) return;
        ['keydown', 'paste', 'drop'].forEach(eventType => {
            inputEl.addEventListener(eventType, function(e) {
                if (e.type === 'keydown') {
                    const invalidKeys = ['e', 'E', '-', '+'];
                    if (!allowDecimals) { invalidKeys.push('.', ','); }
                    if (invalidKeys.includes(e.key)) {
                        e.preventDefault();
                    }
                } else if (e.type === 'paste' || e.type === 'drop') {
                    e.preventDefault();
                }
            });
        });
    }

    restrictToNumbers(stockMinInput, false);
    restrictToNumbers(stockMaxInput, false);
    restrictToNumbers(editStockMinInput, false);
    restrictToNumbers(editStockMaxInput, false);
    restrictToNumbers(editPriceInput, true);

    // ===============================
    // VALIDACIÓN DE DECIMALES (STOCK)
    // ===============================
    function validateStockInputRealTime(inputEl, errorEl) {
        if (!inputEl || !errorEl) return;
        let previousValue = inputEl.value || '';
        inputEl.addEventListener('input', () => {
            const val = inputEl.value;
            if (val.includes(',') || /\.\d{1,2}$/.test(val)) {
                if (window.mostrarErrorInline) window.mostrarErrorInline(inputEl.id, 'Solo se permiten números enteros');
                else errorEl.textContent = 'Solo se permiten números enteros';
                previousValue = val; // Guardamos el valor para no trabar el borrado
            } else if (val.replace(/\./g, '').length > 9) {
                if (window.mostrarErrorInline) window.mostrarErrorInline(inputEl.id, 'El límite máximo es de 9 dígitos (999.999.999)');
                else errorEl.textContent = 'El límite máximo es de 9 dígitos (999.999.999)';
                inputEl.value = previousValue; // Revertir al último valor válido
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline(inputEl.id);
                else errorEl.textContent = '';
                previousValue = val;
            }
        });
    }

    // validateStockInputRealTime(stockMinInput, stockMinError);
    // validateStockInputRealTime(stockMaxInput, stockMaxError);
    // if (editStockMinInput) validateStockInputRealTime(editStockMinInput, document.getElementById('error-edit-product-stock-min'));
    // if (editStockMaxInput) validateStockInputRealTime(editStockMaxInput, document.getElementById('error-edit-product-stock-max'));

    // ===============================
    // URLs DE LA API Y ESTADO
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos';
    const API_CATEGORIAS_URL = '/api/categorias';

    // --- Estado de Paginación y Ordenamiento ---
    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 10;
    let sortField = 'estadoStock'; // Campo de ordenamiento inicial (prioridad: Agotado → Bajo → Óptimo)
    let sortDirection = 'asc'; // Dirección inicial

    // --- Estado de Categorías ---
    let todasLasCategorias = [];

    // --- Estado de Búsqueda ---
    let todosLosProductos = []; // Cache de todos los productos
    let productosBuscados = null; // Productos filtrados por búsqueda
    let searchTimeout = null; // Timer para búsqueda con debounce
    let isLoadingProducts = false; // Guard contra llamadas concurrentes

    // --- Estado de Filtros ---
    const filterStockEstado = document.getElementById('filter-stock-estado');
    const filterCategoria = document.getElementById('filter-categoria');
    const filterProveedor = document.getElementById('filter-proveedor');
    let filtroStockEstado = 'todos'; // 'todos', 'agotado', 'bajo', 'optimo'
    let filtroCategoria = 'todos';
    let filtroProveedor = 'todos';


    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS (FINAL)
    // ===============================
    async function loadProducts() {
        if (!productTableBody || !mainContent) {
            return;
        }

        // Guard contra llamadas concurrentes
        if (isLoadingProducts) {
            return;
        }
        isLoadingProducts = true;

        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        productTableBody.classList.add('loading');

        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // 2. Cargar TODOS los productos (sin paginación) para búsqueda global
            const url = `${API_PRODUCTOS_URL}/inventario?page=0&size=1000`;

            const response = await fetch(url, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const pageData = await response.json();
            todosLosProductos = pageData.content; // Guardar TODOS los productos

            // Poblar los dropdowns de filtro con datos reales
            poblarDropdownsFiltro();

            // Si hay una búsqueda activa, reaplicarla con los nuevos datos
            let productosParaFiltrar = todosLosProductos;
            if (productSearchInputElement && productSearchInputElement.value.trim() !== '') {
                const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());
                productosBuscados = todosLosProductos.filter(producto => {
                    const coincideNombre = producto.nombre &&
                        removeAccents(producto.nombre.toLowerCase()).includes(textoBusqueda);
                    const coincideCategoria = producto.categoria &&
                        removeAccents(producto.categoria.toLowerCase()).includes(textoBusqueda);
                    const coincideDescripcion = producto.descripcion &&
                        removeAccents(producto.descripcion.toLowerCase()).includes(textoBusqueda);
                    const coincideProveedor = producto.proveedorNombre &&
                        removeAccents(producto.proveedorNombre.toLowerCase()).includes(textoBusqueda);
                    return coincideNombre || coincideCategoria || coincideDescripcion || coincideProveedor;
                });
                productosParaFiltrar = productosBuscados;
            }

            // 3. Aplicar sorting y filtros en el frontend
            const productosAMostrar = aplicarFiltros(productosParaFiltrar);
            const productosSorted = clientSideSort(productosAMostrar);

            // 4. Calcular paginación en frontend
            totalPages = Math.ceil(productosSorted.length / itemsPerPage);
            if (currentPage >= totalPages && totalPages > 0) currentPage = totalPages - 1;
            if (currentPage < 0) currentPage = 0;

            const startIndex = currentPage * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const productosPaginados = productosSorted.slice(startIndex, endIndex);

            // 5. Renderizar
            renderProductTable(productosPaginados);
            updatePaginationControls();
            updateSortIndicators(); // Actualizar indicadores visuales

            // 6. Actualizar color de columna Stock según filtro
            actualizarColorColumnaStock();

            requestAnimationFrame(() => {
                // Restaurar scroll
                window.scrollTo(0, scrollPosition);
                // INICIAR FADE-IN
                productTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="7">Error al cargar productos.</td></tr>`;
            productTableBody.classList.remove('loading');
        } finally {
            isLoadingProducts = false;
        }
    }

    window.loadProducts = loadProducts;

    // ===============================
    // FUNCIÓN PARA POBLAR DROPDOWNS DE FILTRO
    // ===============================
    function poblarDropdownsFiltro() {
        // Poblar dropdown de Categorías
        if (filterCategoria && todasLasCategorias.length > 0) {
            const valorActual = filterCategoria.value;
            filterCategoria.innerHTML = '<option value="todos">🏷️ Categoría: Todas</option>';
            const categoriasOrdenadas = [...todasLasCategorias].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            );
            categoriasOrdenadas.forEach(c => {
                const option = document.createElement('option');
                option.value = c.nombre;
                option.textContent = c.nombre;
                filterCategoria.appendChild(option);
            });
            filterCategoria.value = valorActual; // Restaurar selección
        }

        // Poblar dropdown de Proveedores (desde los productos cargados)
        if (filterProveedor && todosLosProductos.length > 0) {
            const valorActual = filterProveedor.value;
            filterProveedor.innerHTML = '<option value="todos">🚚 Proveedor: Todos</option>';

            // Extraer proveedores únicos (incluyendo los de otrosProveedores)
            const proveedoresSet = new Set();
            let haySinProveedor = false;
            todosLosProductos.forEach(p => {
                if (p.proveedorNombre) {
                    proveedoresSet.add(p.proveedorNombre);
                } else {
                    haySinProveedor = true;
                }
                if (p.otrosProveedores) {
                    p.otrosProveedores.forEach(nombre => proveedoresSet.add(nombre));
                }
            });

            // Opción "Sin proveedor"
            if (haySinProveedor) {
                const optSin = document.createElement('option');
                optSin.value = 'sin-proveedor';
                optSin.textContent = '— Sin proveedor';
                filterProveedor.appendChild(optSin);
            }

            // Proveedores ordenados alfabéticamente
            const proveedoresOrdenados = [...proveedoresSet].sort((a, b) =>
                a.localeCompare(b, 'es', { sensitivity: 'base' })
            );
            proveedoresOrdenados.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                filterProveedor.appendChild(option);
            });
            filterProveedor.value = valorActual; // Restaurar selección
        }
    }

    // ===============================
    // FUNCIONES AUXILIARES PARA FILTROS Y SORTING
    // ===============================

    /**
     * Aplica filtros de búsqueda y estado de stock sobre los productos
     */
    function aplicarFiltros(productos) {
        let resultado = productos || todosLosProductos;

        if (!resultado) {
            return [];
        }

        // Filtro 1: Estado de stock
        const filtroToEstado = {
            'agotado': 'AGOTADO',
            'bajo': 'BAJO',
            'optimo': 'BUENO'
        };
        if (filtroStockEstado !== 'todos' && filtroToEstado[filtroStockEstado]) {
            const estadoBuscado = filtroToEstado[filtroStockEstado];
            resultado = resultado.filter(p => p.estadoStock === estadoBuscado);
        }

        // Filtro 2: Categoría
        if (filtroCategoria !== 'todos') {
            resultado = resultado.filter(p =>
                p.categoria && p.categoria.toLowerCase() === filtroCategoria.toLowerCase()
            );
        }

        // Filtro 3: Proveedor
        if (filtroProveedor !== 'todos') {
            if (filtroProveedor === 'sin-proveedor') {
                resultado = resultado.filter(p => !p.proveedorNombre);
            } else {
                resultado = resultado.filter(p =>
                    p.proveedorNombre && p.proveedorNombre.toLowerCase() === filtroProveedor.toLowerCase()
                );
            }
        }

        return resultado;
    }

    /**
     * Ordena los productos en el frontend según sortField y sortDirection
     */
    function clientSideSort(productos) {
        if (!sortField || productos.length === 0) return productos;

        // Ordenamiento especial por estado de stock (AGOTADO → BAJO → BUENO)
        if (sortField === 'estadoStock') {
            const prioridad = { 'AGOTADO': 0, 'BAJO': 1, 'BUENO': 2 };
            const sorted = [...productos].sort((a, b) => {
                const aP = prioridad[a.estadoStock] ?? 3;
                const bP = prioridad[b.estadoStock] ?? 3;
                if (aP !== bP) {
                    return sortDirection === 'asc' ? aP - bP : bP - aP;
                }
                // Desempate por nombre
                return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
            });
            return sorted;
        }

        // Mapear nombres de campo del HTML a nombres de campo del DTO
        const fieldMap = {
            'stock': 'stockActual'
        };

        const actualField = fieldMap[sortField] || sortField;

        const sorted = [...productos].sort((a, b) => {
            let aVal = a[actualField];
            let bVal = b[actualField];

            // Productos sin proveedor siempre al final
            if (actualField === 'proveedorNombre') {
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
            }

            // Handle null/undefined
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Comparación numérica vs string
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Comparación string (con soporte de acentos español)
            const comparison = String(aVal).localeCompare(String(bVal), 'es', { sensitivity: 'base' });
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    // ===============================
    // FUNCIONES DE ORDENAMIENTO
    // ===============================
    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur(); // Evita que el encabezado mantenga el foco

        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');

        if (!newSortField) return;

        if (sortField === newSortField) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = newSortField;
            sortDirection = 'asc';
        }

        currentPage = 0;
        loadProducts();
    }

    function updateSortIndicators() {
        // Actualizar encabezados de tabla
        const headers = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
        headers.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');

            const icon = th.querySelector('.sort-icon');
            if (icon) {
                icon.className = 'sort-icon fas fa-sort';
            }

            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);

                if (icon) {
                    icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
                }
            }
        });

        // Actualizar botones de ordenamiento en la barra de filtros
        const sortButtons = document.querySelectorAll('#productos-section [id^="sort-btn-"]');
        sortButtons.forEach(btn => {
            const field = btn.getAttribute('data-sort-field');
            const icon = btn.querySelector('i');

            if (field === sortField) {
                // Botón activo
                btn.style.background = '#e8f0fe';
                btn.style.borderColor = '#4285f4';
                btn.style.color = '#1a73e8';
                btn.style.fontWeight = '600';
                if (icon) {
                    icon.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
                }
            } else {
                // Botón inactivo
                btn.style.background = 'white';
                btn.style.borderColor = '#ddd';
                btn.style.color = '#333';
                btn.style.fontWeight = 'normal';
                if (icon) {
                    icon.className = 'fas fa-sort';
                }
            }
        });
    }

    function actualizarColorColumnaStock() {
        const thStock = document.getElementById('th-stock');
        if (!thStock) return;

        thStock.classList.remove('sort-asc', 'sort-desc');
        thStock.style.backgroundColor = '';
        thStock.style.color = '';

        if (filtroStockEstado !== 'todos') {
            thStock.classList.add('sort-asc');
        }
    }

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================

    // ==========================================================
    // LÓGICA DE CATEGORÍAS
    // ==========================================================

    let categorySelectedIndex = -1;
    let editCategorySelectedIndex = -1;

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

    function handleSearchKeyboard(e, resultsContainer, selectedIndexRef, onSelect) {
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
                if (onSelect) onSelect();
            }
        }
    }

    async function loadCategoriasParaProductos() {
        if (!categorySearchInput) return;
        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/select`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasLasCategorias = await response.json();
            poblarDropdownsFiltro(); // Actualizar dropdown de categorías
        } catch (error) {
            console.error(error);
            categorySearchInput.placeholder = "Error al cargar categorías";
        }
    }

    // Función auxiliar para eliminar acentos (búsqueda insensible a acentos)
    function removeAccents(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function filtrarCategorias() {
        const query = removeAccents(categorySearchInput.value.toLowerCase());
        const categoriasFiltradas = todasLasCategorias.filter(c =>
            removeAccents(c.nombre.toLowerCase()).includes(query)
        );
        categorySelectedIndex = -1;
        renderResultadosCategorias(categoriasFiltradas);
    }

    function renderResultadosCategorias(categorias) {
        if (categorias.length === 0) {
            categoryResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            // Ordenar alfabéticamente y capitalizar cada palabra
            const categoriasOrdenadas = [...categorias].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            );
            const capitalizarPalabras = (texto) =>
                texto.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            categoryResultsContainer.innerHTML = categoriasOrdenadas.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${capitalizarPalabras(c.nombre)}</div>`
            ).join('');
        }
        categoryResultsContainer.style.display = 'block';
    }

    function seleccionarCategoria(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const categoriaId = parseInt(target.dataset.id, 10);
        const categoria = todasLasCategorias.find(c => c.id === categoriaId);

        if (categoria) {
            categorySearchInput.value = categoria.nombre;
            categoryHiddenInput.value = categoria.id;
            categoryResultsContainer.style.display = 'none';
            if (categoryError) categoryError.textContent = '';
        }
    }

    // Modal de categoría
    const handleAddCategoriaEsc = (e) => {
        if (e.key === 'Escape') closeAddCategoriaModal();
    };

    function resetAddCategoriaModal() {
        if (addCategoriaForm) addCategoriaForm.reset();
        if (addCategoriaMessage) {
            addCategoriaMessage.textContent = '';
            addCategoriaMessage.className = 'form-message';
        }
        if (window.limpiarErroresInline) window.limpiarErroresInline('addCategoriaNombre');
    }

    function openAddCategoriaModal() {
        if (!addCategoriaModal) return;
        resetAddCategoriaModal();
        addCategoriaModal.style.display = 'flex';
        document.getElementById('addCategoriaNombre').focus();
        window.addEventListener('keydown', handleAddCategoriaEsc);
    }

    function closeAddCategoriaModal() {
        if (!addCategoriaModal) return;
        addCategoriaModal.style.display = 'none';
        window.removeEventListener('keydown', handleAddCategoriaEsc);
    }

    async function handleAddCategoriaSubmit(event) {
        event.preventDefault();

        if (window.limpiarErroresInline) window.limpiarErroresInline('addCategoriaNombre');
        if (addCategoriaMessage) {
            addCategoriaMessage.textContent = '';
            addCategoriaMessage.classList.remove('error', 'success');
        }

        const nombre = document.getElementById('addCategoriaNombre').value.trim();

        if (!nombre) {
            if (window.mostrarErrorInline) window.mostrarErrorInline('addCategoriaNombre', 'El nombre es obligatorio.');
            return;
        }

        const categoriaRequestDTO = { nombre: nombre };

        try {
            const response = await fetch(API_CATEGORIAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoriaRequestDTO)
            });

            if (!response.ok) {
                // Leer como texto primero para evitar consumir el stream dos veces
                const errorText = await response.text();
                let errorMessage;

                try {
                    // Intentar parsear como JSON
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorText;
                } catch {
                    // Si no es JSON válido, usar el texto tal cual
                    errorMessage = errorText;
                }

                throw new Error(errorMessage);
            }

            const nuevaCategoria = await response.json();
            closeAddCategoriaModal();

            categorySearchInput.value = nuevaCategoria.nombre;
            categoryHiddenInput.value = nuevaCategoria.idCategoria;
            if (categoryError) categoryError.textContent = '';

            loadCategoriasParaProductos();

        } catch (error) {
            console.error('Error al crear categoría:', error);
            if (window.mostrarErrorInline) {
                window.mostrarErrorInline('addCategoriaNombre', error.message);
            }
        }
    }

    // Listeners de categorías
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', function () {
            filtrarCategorias();
            // Limpiar el campo oculto si el usuario borra el texto
            if (categorySearchInput.value.trim() === '') {
                categoryHiddenInput.value = '';
            }
        });
        categorySearchInput.addEventListener('focus', filtrarCategorias);
        categorySearchInput.addEventListener('keydown', (e) => {
            const indexRef = { current: categorySelectedIndex };
            handleSearchKeyboard(e, categoryResultsContainer, indexRef, () => {
                categorySelectedIndex = -1;
            });
            categorySelectedIndex = indexRef.current;
        });
    }

    if (categoryResultsContainer) {
        categoryResultsContainer.addEventListener('click', seleccionarCategoria);
    }

    if (addCategoriaBtn) {
        addCategoriaBtn.addEventListener('click', openAddCategoriaModal);
    }

    if (addCategoriaCloseBtn) {
        addCategoriaCloseBtn.addEventListener('click', closeAddCategoriaModal);
    }

    if (addCategoriaModal) {
        addCategoriaModal.addEventListener('click', function (e) {
            if (e.target === addCategoriaModal) closeAddCategoriaModal();
        });
    }

    if (addCategoriaForm) {
        addCategoriaForm.addEventListener('submit', handleAddCategoriaSubmit);
    }

    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!categorySearchInput.contains(e.target) && !categoryResultsContainer.contains(e.target)) {
            categoryResultsContainer.style.display = 'none';
        }
        // Para el modal de edición
        if (editCategorySearchInput && !editCategorySearchInput.contains(e.target) &&
            editCategoryResultsContainer && !editCategoryResultsContainer.contains(e.target)) {
            editCategoryResultsContainer.style.display = 'none';
        }
    });

    // ===========================================================

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    /**
     * Genera el HTML del badge de stock según el estado
     */
    function getStockBadge(stockActual, estadoStock) {
        let badgeClass = '';

        switch (estadoStock) {
            case 'BUENO':
                badgeClass = 'good';
                break;
            case 'BAJO':
                badgeClass = 'low';
                break;
            case 'AGOTADO':
                badgeClass = 'empty';
                break;
            default:
                badgeClass = 'good';
        }

        // Retorna solo el número con el badge de color, sin texto ni icono
        return `<span class="stock-badge ${badgeClass}">${stockActual}</span>`;
    }

    /**
     * Renderiza la tabla de productos con información de inventario
     */
    function renderProductTable(products) {
        if (!productTableBody) return;

        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="7">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            const stockBadge = getStockBadge(product.stockActual, product.estadoStock);

            // Construir celda de proveedor
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

            // Checkbox logic for Purchase Order (rendered as Toggle Button for better UX)
            let buttonDisabled = !product.proveedorNombre ? 'disabled title="Este producto no tiene un proveedor asignado"' : '';
            if (product.proveedorNombre && window.activeProviderForOC && window.activeProviderForOC !== product.proveedorNombre) {
                buttonDisabled = 'disabled title="Solo se pueden seleccionar productos del proveedor: ' + window.activeProviderForOC + '"';
            }
            const isChecked = window.selectedProductsForOC && window.selectedProductsForOC.has(product.idProducto.toString());
            const btnClass = isChecked ? 'btn-oc-active' : 'btn-oc-inactive';
            const btnContent = isChecked 
                ? '<i class="fas fa-check"></i> En Orden' 
                : '<i class="fas fa-file-invoice"></i> Añadir';

            const row = `
                <tr>
                    <td class="oc-checkbox-col" style="text-align: center; vertical-align: middle;">
                        <button type="button" class="btn-oc-toggle ${btnClass}" 
                                data-product-id="${product.idProducto}" 
                                data-product-name="${product.nombre || ''}"
                                data-product-cost="${product.precioCosto || 0}"
                                data-provider-name="${product.proveedorNombre || ''}"
                                ${buttonDisabled}>
                            ${btnContent}
                        </button>
                    </td>
                    <td style="text-align: left; font-weight: 500;">${product.nombre || 'N/A'}</td>
                    <td style="text-align: left;">${product.categoria || 'N/A'}</td>
                    <td style="text-align: left;">${proveedorCell}</td>
                    <td style="text-align: center;">${stockBadge}</td>
                    <td style="text-align: right; font-weight: 600;">$${product.precio != null ? product.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                    <td style="text-align: center;">
                        <div class="action-buttons" style="justify-content: center;">
                            <button class="btn-action view" title="Ver detalles" data-id="${product.idProducto}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action edit" title="Editar" data-id="${product.idProducto}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" title="Eliminar" data-id="${product.idProducto}" data-name="${product.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });

        // Filas fantasmas para mantener la altura exacta de la tabla
        const itemsPerPage = 10;
        const ghostRowsNeeded = itemsPerPage - products.length;
        if (ghostRowsNeeded > 0) {
            for (let i = 0; i < ghostRowsNeeded; i++) {
                // Fila invisible con estructura idéntica para forzar al navegador a calcular la misma altura
                productTableBody.innerHTML += `
                    <tr style="visibility: hidden; border-bottom: none;">
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td style="text-align: right;">
                            <div class="action-buttons" style="justify-content: flex-end;">
                                <button class="btn-action"><i class="fas fa-eye"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        // Agregar event listeners para los botones de acción
        attachActionListeners();
    }

    /**
     * Adjunta event listeners a los botones de acción
     */
    function attachActionListeners() {
        // Botones "Ver detalles"
        document.querySelectorAll('.btn-action.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                openDetailModal(productId);
            });
        });

        // Click en badge de proveedores
        document.querySelectorAll('.proveedor-badge-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                openDetailModal(productId, 'product-detail-tab-proveedores');
            });
        });

        // Botones "Editar"
        document.querySelectorAll('.btn-action.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                openEditModal(productId);
            });
        });

        // Botones "Eliminar"
        document.querySelectorAll('.btn-action.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                const productName = e.currentTarget.getAttribute('data-name');
                openDeleteModal(productId, productName);
            });
        });

        // Listeners para botones de selección de orden de compra
        document.querySelectorAll('.btn-oc-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const productId = target.getAttribute('data-product-id');
                const productName = target.getAttribute('data-product-name');
                const productCost = parseFloat(target.getAttribute('data-product-cost')) || 0;
                const providerName = target.getAttribute('data-provider-name');

                const isCurrentlyChecked = window.selectedProductsForOC && window.selectedProductsForOC.has(productId.toString());

                if (!isCurrentlyChecked) {
                    const isFirstSelection = !window.activeProviderForOC;
                    if (isFirstSelection) {
                        window.activeProviderForOC = providerName;
                    }
                    window.selectedProductsForOC.add(productId);
                    window.selectedProductsDetailsForOC[productId] = {
                        idProducto: productId,
                        nombre: productName,
                        costoUnitario: productCost,
                        proveedorNombre: providerName
                    };

                    if (isFirstSelection && filterProveedor && filterProveedor.value !== providerName) {
                        filterProveedor.value = providerName;
                        filtroProveedor = providerName;
                        currentPage = 0;
                        window.updateOCActionBar();
                        loadProducts();
                        return;
                    }
                } else {
                    window.selectedProductsForOC.delete(productId);
                    delete window.selectedProductsDetailsForOC[productId];
                    if (window.selectedProductsForOC.size === 0) {
                        window.activeProviderForOC = null;
                        if (filterProveedor) {
                            filterProveedor.value = 'todos';
                            filtroProveedor = 'todos';
                            currentPage = 0;
                            window.updateOCActionBar();
                            loadProducts();
                            return;
                        }
                    }
                }

                window.updateOCCheckboxesState();
                window.updateOCActionBar();
            });
        });
    }

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    if (productForm) {
        productForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('product-');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            // 2. Obtener valores
            const nombre = nameInput.value.trim();
            const idCategoria = categoryHiddenInput.value ? parseInt(categoryHiddenInput.value, 10) : null;
            const descripcion = descriptionInput.value.trim();
            const stockMinimoRaw = stockMinInput.value;
            const stockMaximoRaw = stockMaxInput.value;

            // 3. Validaciones
            let isValid = true;
            if (!nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-name', 'El nombre del producto es obligatorio'); isValid = false; }
            else if (nombre.length > 150) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-name', 'Máximo 150 caracteres'); isValid = false; }
            if (!idCategoria) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-category-search', 'Debe seleccionar una categoría'); isValid = false; }
            if (!descripcion) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-description', 'La descripcion del producto es obligatoria'); isValid = false; }
            else if (descripcion.length > 650) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-description', 'Máximo 650 caracteres'); isValid = false; }
            
            if (stockMinimoRaw.includes(',') || /\.\d{1,2}$/.test(stockMinimoRaw)) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-stock-min', 'Solo se permiten números enteros'); isValid = false; }
            if (stockMaximoRaw.includes(',') || /\.\d{1,2}$/.test(stockMaximoRaw)) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-stock-max', 'Solo se permiten números enteros'); isValid = false; }
            const stockMinimo = parseInt(stockMinimoRaw.replace(/\./g, ''), 10);
            const stockMaximo = parseInt(stockMaximoRaw.replace(/\./g, ''), 10);

            if (isNaN(stockMinimo) || stockMinimo < 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-stock-min', 'Debe ser un número positivo.'); isValid = false; }
            if (isNaN(stockMaximo) || stockMaximo <= 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('product-stock-max', 'Debe ser un número mayor a 0.'); isValid = false; }
            
            // Validar relación entre stock mínimo y máximo (solo si ambos son números válidos)
            if (!isNaN(stockMinimo) && !isNaN(stockMaximo) && stockMinimo >= stockMaximo) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('product-stock-max', 'El máximo debe ser mayor que el mínimo.');
                isValid = false;
            }
            if (!isValid) { return; }

            // 4. Construir DTO
            const productoDTO = {
                nombre: nombre,
                idCategoria: idCategoria,
                descripcion: descripcion,
                stockMinimo: stockMinimo,
                stockMaximo: stockMaximo
            };

            // 5. Confirmar y Enviar
            showConfirmationModal("¿Estás seguro de que deseas registrar este producto?", async () => {
                try {
                    const response = await fetch(API_PRODUCTOS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productoDTO)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || `Error: ${response.status}`);
                    }

                    generalMessage.textContent = "¡Producto registrado con éxito!";
                    generalMessage.classList.add('success');
                    productForm.reset();
                    categoryHiddenInput.value = '';

                    // Reseteamos a la página 0 y recargamos la tabla
                    currentPage = 0;
                    loadProducts();

                    // El mensaje desaparece automáticamente después de 4 segundos
                    setTimeout(() => {
                        generalMessage.textContent = '';
                        generalMessage.classList.remove('success');
                    }, 4000);

                    document.dispatchEvent(new Event('productosActualizados'));

                } catch (error) {
                    console.error('Error al registrar el producto:', error);
                    generalMessage.textContent = `${error.message}`;
                    generalMessage.classList.add('error');
                }
            });
        });
    }

    // ===============================
    // FUNCIONES DE PAGINACIÓN
    // ===============================
    function updatePaginationControls() {
        if (!pageInfo || !prevPageBtn || !nextPageBtn) return;

        pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 0);
        nextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                loadProducts();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadProducts();
            }
        });
    }

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const productosSection = document.getElementById('productos-section');
    const subsectionContainers = productosSection ? productosSection.querySelectorAll('.subsection-container') : [];

    function showSubsection(subsectionId) {
        // 1. Ocultar solo los contenedores de Productos
        subsectionContainers.forEach(container => {
            container.style.display = 'none';
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente para ser llamado desde admin.js
    window.showProductSubsection = showSubsection;

    // ===============================
    // MODAL DE DETALLES
    // ===============================
    const detailModal = document.getElementById('product-detail-modal');
    const detailCloseBtn = document.getElementById('product-detail-close');
    const detailCloseBtnFooter = document.getElementById('product-detail-close-btn');

    // Tab switching en el modal de detalle
    document.querySelectorAll('.product-detail-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.product-detail-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.product-detail-tab-content').forEach(c => c.style.display = 'none');
            const target = document.getElementById(this.getAttribute('data-tab'));
            if (target) target.style.display = 'block';
        });
    });

    /**
     * Abre el modal y carga los detalles del producto
     */
    async function openDetailModal(productId, targetTabId = null) {
        try {
            // Cargar datos del producto desde el endpoint de inventario
            // Cargar datos del producto desde el endpoint de inventario
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);

            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            // Llenar el modal con los datos
            document.getElementById('detail-nombre').textContent = product.nombre || 'N/A';
            document.getElementById('detail-categoria').textContent = product.categoria || 'N/A';
            document.getElementById('detail-descripcion').textContent = product.descripcion || 'N/A';
            document.getElementById('detail-precio').textContent = product.precio > 0 ? `$${product.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No establecido';

            // Fecha formateada
            let fechaFormateada = "N/A";
            if (product.fechaCreacion) {
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            document.getElementById('detail-fecha').textContent = fechaFormateada;

            // Información de stock
            document.getElementById('detail-stock-actual').textContent = product.stockActual;
            document.getElementById('detail-stock-min').textContent = product.stockMinimo;
            document.getElementById('detail-stock-max').textContent = product.stockMaximo;

            // Mostrar estado como texto con badge
            let estadoTexto = 'N/A';
            let estadoClase = '';
            let badgeBg = 'rgba(16,185,129,0.25)';
            let badgeBorder = 'rgba(16,185,129,0.3)';

            if (product.estadoStock === 'AGOTADO' || product.stockActual === 0) {
                estadoTexto = 'Agotado';
                estadoClase = 'empty';
                badgeBg = 'rgba(239,68,68,0.25)';
                badgeBorder = 'rgba(239,68,68,0.3)';
            } else if (product.estadoStock === 'BAJO' || (product.stockMinimo && product.stockActual < product.stockMinimo)) {
                estadoTexto = 'Bajo';
                estadoClase = 'low';
                badgeBg = 'rgba(245,158,11,0.25)';
                badgeBorder = 'rgba(245,158,11,0.3)';
            } else if (product.estadoStock === 'BUENO' || product.stockActual >= product.stockMinimo) {
                estadoTexto = 'Óptimo';
                estadoClase = 'good';
            } else {
                estadoTexto = 'N/A';
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
            proveedoresBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
            document.getElementById('detail-costo-minimo').textContent = '...';

            try {
                const provResponse = await fetch(`${API_PRODUCTOS_URL}/${productId}/proveedores`, { cache: 'no-store' });
                if (provResponse.ok) {
                    const proveedores = await provResponse.json();
                    document.getElementById('product-detail-tab-proveedores-badge').textContent = proveedores.length;
                    const costoMinimoEl = document.getElementById('detail-costo-minimo');
                    const costos = proveedores.map(p => p.ultimoCosto).filter(c => c != null);
                    if (costos.length > 0) {
                        const min = Math.min(...costos);
                        costoMinimoEl.textContent = '$' + min.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    } else {
                        costoMinimoEl.textContent = 'Sin datos';
                    }

                    if (proveedores.length === 0) {
                        proveedoresBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">Sin proveedores asociados</td></tr>';
                    } else {
                        proveedoresBody.innerHTML = proveedores.map(prov => `
                            <tr>
                                <td style="font-weight: 500;">${prov.nombre || 'N/A'}</td>
                                <td>${prov.telefono || '<span style="color: #94a3b8;">—</span>'}</td>
                                <td>${prov.email || '<span style="color: #94a3b8;">—</span>'}</td>
                                <td style="text-align: right; font-weight: 600;">${prov.ultimoCosto != null ? '$' + prov.ultimoCosto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '<span style="color: #94a3b8;">—</span>'}</td>
                            </tr>
                        `).join('');
                    }
                } else {
                    proveedoresBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
                }
            } catch (provErr) {
                console.error('Error al cargar proveedores:', provErr);
                proveedoresBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar proveedores</td></tr>';
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

            // Resetear a Tab 1 al abrir
            document.querySelectorAll('.product-detail-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.product-detail-tab[data-tab="product-detail-tab-info"]').classList.add('active');
            document.querySelectorAll('.product-detail-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById('product-detail-tab-info').style.display = 'block';

            // Mostrar modal
            if (targetTabId) {
                const targetTab = document.querySelector(`#product-detail-modal .product-detail-tab[data-tab="${targetTabId}"]`);
                if (targetTab) targetTab.click();
            }
            detailModal.style.display = 'flex';

            // Cerrar modal con ESC
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeDetailModal();
                }
            };

            document.addEventListener('keydown', handleEscKey);
            detailModal._escHandler = handleEscKey;
        } catch (error) {
            console.error('Error al abrir modal de detalles:', error);
            alert('Error al cargar los detalles del producto');
        }
    }

    /**
     * Cierra el modal de detalles
     */
    function closeDetailModal() {
        detailModal.style.display = 'none';

        // Remover listener de ESC
        if (detailModal._escHandler) {
            document.removeEventListener('keydown', detailModal._escHandler);
            detailModal._escHandler = null;
        }
    }

    // Event listeners del modal
    if (detailCloseBtn) {
        detailCloseBtn.addEventListener('click', closeDetailModal);
    }
    if (detailCloseBtnFooter) {
        detailCloseBtnFooter.addEventListener('click', closeDetailModal);
    }

    // Cerrar modal al hacer clic fuera
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDetailModal();
            }
        });
    }

    // Botón editar removido del modal

    // ===============================
    // FILTROS DE STOCK
    // ===============================
    let currentFilter = 'all'; // Filtro activo
    let allProducts = []; // Cache de todos los productos

    /**
     * Aplica filtro de stock
     */
    async function applyStockFilter(filter) {
        currentFilter = filter;

        try {
            // Cargar TODOS los productos (sin paginación para filtros)
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar productos');

            const pageData = await response.json();
            allProducts = pageData.content;

            // Filtrar según el criterio
            let filteredProducts = allProducts;

            switch (filter) {
                case 'low':
                    filteredProducts = allProducts.filter(p => p.estadoStock === 'BAJO');
                    break;
                case 'empty':
                    filteredProducts = allProducts.filter(p => p.estadoStock === 'AGOTADO');
                    break;
                case 'all':
                default:
                    filteredProducts = allProducts;
            }

            // Renderizar productos filtrados
            renderProductTable(filteredProducts);

            // Actualizar botones activos
            document.querySelectorAll('.btn-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`.btn-filter[data-filter="${filter}"]`).classList.add('active');

        } catch (error) {
            console.error('Error al aplicar filtro:', error);
            productTableBody.innerHTML = `<tr><td colspan="5">Error al filtrar productos.</td></tr>`;
        }
    }

    // Event listeners para filtros
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            applyStockFilter(filter);
        });
    });

    // ==========================================================
    // FUNCIONALIDAD DE MODAL DE EDICIÓN
    // ==========================================================

    // Autocomplete de categoría para el modal de edición
    if (editCategorySearchInput) {
        editCategorySearchInput.addEventListener('input', () => {
            const query = removeAccents(editCategorySearchInput.value.toLowerCase());
            const categoriasFiltradas = todasLasCategorias.filter(c =>
                removeAccents(c.nombre.toLowerCase()).includes(query)
            );
            renderEditCategoryResults(categoriasFiltradas);
            if (editCategorySearchInput.value.trim() === '') {
                editCategoryHiddenInput.value = '';
            }
        });
        editCategorySearchInput.addEventListener('click', () => {
            // Toggle: si el dropdown ya está visible, cerrarlo
            if (editCategoryResultsContainer && editCategoryResultsContainer.style.display === 'block') {
                editCategoryResultsContainer.style.display = 'none';
                return;
            }
            const query = removeAccents(editCategorySearchInput.value.toLowerCase());
            const categoriasFiltradas = todasLasCategorias.filter(c =>
                removeAccents(c.nombre.toLowerCase()).includes(query)
            );
            renderEditCategoryResults(categoriasFiltradas);
        });
        editCategorySearchInput.addEventListener('keydown', (e) => {
            const indexRef = { current: editCategorySelectedIndex };
            handleSearchKeyboard(e, editCategoryResultsContainer, indexRef, () => {
                editCategorySelectedIndex = -1;
            });
            editCategorySelectedIndex = indexRef.current;
        });
    }

    function renderEditCategoryResults(categorias) {
        editCategorySelectedIndex = -1;
        if (!editCategoryResultsContainer) return;
        if (categorias.length === 0) {
            editCategoryResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            editCategoryResultsContainer.innerHTML = categorias.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${c.nombre}</div>`
            ).join('');
        }
        editCategoryResultsContainer.style.display = 'block';
    }

    if (editCategoryResultsContainer) {
        editCategoryResultsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.product-result-item');
            if (!target || !target.dataset.id) return;
            const categoriaId = parseInt(target.dataset.id, 10);
            const categoria = todasLasCategorias.find(c => c.id === categoriaId);
            if (categoria) {
                editCategorySearchInput.value = categoria.nombre;
                editCategoryHiddenInput.value = categoria.id;
                editCategoryResultsContainer.style.display = 'none';
                if (document.getElementById('edit-category-error')) {
                    document.getElementById('edit-category-error').textContent = '';
                }
            }
        });
    }

    // Función para abrir modal de edición
    async function openEditModal(productId) {
        try {
            // Cargar datos del producto
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);

            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            // Llenar formulario con datos actuales
            editProductId.value = product.idProducto;
            editNameInput.value = product.nombre || '';
            
            // Actualizar el badge del header premium
            const badgeName = document.getElementById('edit-product-badge-name');
            if (badgeName) {
                badgeName.textContent = product.nombre || 'Desconocido';
            }

            editCategorySearchInput.value = product.categoria || '';
            // Buscar ID de categoría
            const categoriaEncontrada = todasLasCategorias.find(c => c.nombre === product.categoria);
            editCategoryHiddenInput.value = categoriaEncontrada ? categoriaEncontrada.id : '';
            editDescriptionInput.value = product.descripcion || '';
            editPriceInput.value = product.precio || 0;
            editStockMinInput.value = product.stockMinimo || 0;
            editStockMaxInput.value = product.stockMaximo || 0;

            // Limpiar mensajes de error
            document.querySelectorAll('#product-edit-form .error-message').forEach(el => el.textContent = '');
            if (editFormMessage) {
                editFormMessage.textContent = '';
                editFormMessage.className = 'form-message';
            }

            // Mostrar modal
            editModal.style.display = 'flex';
            editNameInput.focus();

            // Cerrar con ESC
            const escHandler = (e) => { if (e.key === 'Escape') closeEditModal(); };
            document.addEventListener('keydown', escHandler);
            editModal._escHandler = escHandler;
        } catch (error) {
            console.error('Error al abrir modal de edición:', error);
            alert('Error al cargar los datos del producto');
        }
    }

    // Función para cerrar modal de edición
    function closeEditModal() {
        editModal.style.display = 'none';
        if (editForm) editForm.reset();
        if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('edit-product-');
        if (editFormMessage) {
            editFormMessage.textContent = '';
            editFormMessage.className = 'form-message';
        }
        if (editModal._escHandler) {
            document.removeEventListener('keydown', editModal._escHandler);
            editModal._escHandler = null;
        }
    }

    // Event listeners para cerrar modal
    if (editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    // Manejar guardado de cambios
    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', async () => {
            // Limpiar mensajes de error
            if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('edit-product-');
            if (editFormMessage) {
                editFormMessage.textContent = '';
                editFormMessage.className = 'form-message';
            }

            // Obtener valores
            const productId = editProductId.value;
            const nombre = editNameInput.value.trim();
            const idCategoria = editCategoryHiddenInput.value ? parseInt(editCategoryHiddenInput.value, 10) : null;
            const descripcion = editDescriptionInput.value.trim();
            const precio = parseFloat(editPriceInput.value);
            
            const stockMinimoRaw = editStockMinInput.value;
            const stockMaximoRaw = editStockMaxInput.value;

            // Validaciones
            let isValid = true;

            if (stockMinimoRaw.includes(',') || /\.\d{1,2}$/.test(stockMinimoRaw)) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-stock-min', 'Solo se permiten enteros'); isValid = false; }
            if (stockMaximoRaw.includes(',') || /\.\d{1,2}$/.test(stockMaximoRaw)) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-stock-max', 'Solo se permiten enteros'); isValid = false; }

            const stockMinimo = parseInt(stockMinimoRaw.replace(/\./g, ''), 10);
            const stockMaximo = parseInt(stockMaximoRaw.replace(/\./g, ''), 10);

            if (!nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-name', 'El nombre es obligatorio'); isValid = false; }
            else if (nombre.length > 150) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-name', 'Máximo 150 caracteres'); isValid = false; }
            else {
                try {
                    const checkResponse = await fetch(`/api/productos/existe/nombre/${encodeURIComponent(nombre)}?excludeId=${productId}`);
                    if (checkResponse.ok) {
                        const existe = await checkResponse.json();
                        if (existe) {
                            if (window.mostrarErrorInline) window.mostrarErrorInline('edit-product-name', 'Ya existe un producto con este nombre');
                            isValid = false;
                        }
                    }
                } catch (error) {
                    console.error("Error validando nombre:", error);
                }
            }
            if (!idCategoria) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-category-search', 'Debe seleccionar una categoría'); isValid = false; }
            if (!descripcion) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-description', 'La descripción es obligatoria'); isValid = false; }
            else if (descripcion.length > 650) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-description', 'Máximo 650 caracteres'); isValid = false; }
            if (isNaN(precio) || precio < 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-price', 'El precio debe ser un número válido'); isValid = false; }
            if (isNaN(stockMinimo) || stockMinimo < 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-stock-min', 'Número inválido'); isValid = false; }
            if (isNaN(stockMaximo) || stockMaximo < 0) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-stock-max', 'Número inválido'); isValid = false; }
            if (!isNaN(stockMinimo) && !isNaN(stockMaximo) && stockMaximo < stockMinimo) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('edit-product-stock-max', 'El stock máximo debe ser mayor o igual al mínimo');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            // Construir DTO
            const actualizarDTO = {
                nombre,
                idCategoria,
                descripcion,
                precio,
                cantidadExtraStock: 0,  // No se modifica stock actual desde edición
                stockMinimo,
                stockMaximo
            };

            try {
                // Enviar PUT request
                const response = await fetch(`/api/stock/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actualizarDTO)
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(errorData || 'Error al actualizar el producto');
                }

                // Éxito
                editFormMessage.textContent = 'Producto actualizado correctamente';
                editFormMessage.classList.add('success');

                setTimeout(() => {
                    closeEditModal();
                    // Recargar productos manteniendo filtros
                    loadProducts();
                }, 1500);

            } catch (error) {
                console.error('Error al actualizar producto:', error);
                editFormMessage.textContent = `Error: ${error.message}`;
                editFormMessage.classList.add('error');
            }
        });
    }

    // ===============================
    // LISTENERS Y EJECUCIÓN INICIAL
    // ===============================

    // LISTENERS DE ORDENAMIENTO (solo botones en la barra de filtros)

    // Event listeners para botones de ordenamiento en la barra de filtros
    const sortBtnNombre = document.getElementById('sort-btn-nombre');
    const sortBtnPrecio = document.getElementById('sort-btn-precio');

    function handleSortButtonClick(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        currentPage = 0;
        loadProducts();
    }

    if (sortBtnNombre) {
        sortBtnNombre.addEventListener('click', () => handleSortButtonClick('nombre'));
    }
    if (sortBtnPrecio) {
        sortBtnPrecio.addEventListener('click', () => handleSortButtonClick('precio'));
    }

    // ==========================================================
    // EXPORTAR A PDF
    // ==========================================================
    const btnExportarPdf = document.getElementById('btn-exportar-inventario-pdf');
    if (btnExportarPdf) {
        btnExportarPdf.addEventListener('click', async () => {
            try {
                // Deshabilitar botón y mostrar carga
                const originalText = btnExportarPdf.innerHTML;
                btnExportarPdf.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                btnExportarPdf.disabled = true;

                // Construir descripción de filtros
                let filtrosDesc = [];
                if (filterStockEstado && filterStockEstado.value !== 'todos') {
                    filtrosDesc.push(`Estado: ${filterStockEstado.options[filterStockEstado.selectedIndex].text.replace(/^[^\w]*/, '')}`);
                }
                if (filterCategoria && filterCategoria.value !== 'todos') {
                    filtrosDesc.push(`Categoría: ${filterCategoria.value}`);
                }
                if (filterProveedor && filterProveedor.value !== 'todos') {
                    filtrosDesc.push(`Proveedor: ${filterProveedor.options[filterProveedor.selectedIndex].text.replace(/^[^\w]*\s*/, '')}`);
                }
                if (productSearchInputElement && productSearchInputElement.value.trim() !== '') {
                    filtrosDesc.push(`Búsqueda: "${productSearchInputElement.value.trim()}"`);
                }
                const filtrosAplicados = filtrosDesc.length > 0 ? filtrosDesc.join(' | ') : 'Todos';

                const sortLabels = { estadoStock: 'Estado', nombre: 'Nombre', stock: 'Stock Actual', stockMinimo: 'Stock Mínimo', categoria: 'Categoría', proveedorNombre: 'Proveedor', precio: 'Precio' };
                const sortDescripcion = sortField ? `Ordenado por: ${sortLabels[sortField] || sortField} (${sortDirection === 'asc' ? 'ascendente' : 'descendente'})` : '';

                const payload = {
                    estadoStock: filtroStockEstado,
                    categoria: filtroCategoria,
                    proveedor: filtroProveedor,
                    busqueda: productSearchInputElement?.value.trim() || '',
                    sortField: sortField || '',
                    sortDirection: sortDirection || 'asc',
                    filtrosAplicados: filtrosAplicados,
                    sortDescripcion: sortDescripcion
                };

                const response = await fetch('/api/productos/inventario/exportar-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error('Error al generar el PDF');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
                const partsFiltro = [];
                if (filtroStockEstado !== 'todos') partsFiltro.push(filtroStockEstado);
                if (filtroCategoria !== 'todos') partsFiltro.push(filtroCategoria.replace(/\s+/g, '_'));
                if (filtroProveedor !== 'todos' && filtroProveedor !== 'sin-proveedor') partsFiltro.push(filtroProveedor.replace(/\s+/g, '_'));
                else if (filtroProveedor === 'sin-proveedor') partsFiltro.push('sin_proveedor');
                if (productSearchInputElement?.value.trim()) partsFiltro.push(productSearchInputElement.value.trim().replace(/\s+/g, '_'));
                const sufijo = partsFiltro.length > 0 ? `_${partsFiltro.join('-')}` : '';
                a.download = `reporte_inventario_${fecha}${sufijo}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

            } catch (error) {
                console.error('Error al exportar a PDF:', error);
                alert('No se pudo generar el reporte PDF.');
            } finally {
                // Restaurar botón
                btnExportarPdf.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar a PDF';
                btnExportarPdf.disabled = false;
            }
        });
    }

    // ==========================================================
    // FILTRO POR BÚSQUEDA
    // ==========================================================

    function filtrarProductosPorBusqueda() {
        if (!productTableBody) return;

        const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());

        if (textoBusqueda === '') {
            productosBuscados = null;
        } else {
            productosBuscados = todosLosProductos.filter(producto => {
                const coincideNombre = producto.nombre &&
                    removeAccents(producto.nombre.toLowerCase()).includes(textoBusqueda);
                const coincideCategoria = producto.categoria &&
                    removeAccents(producto.categoria.toLowerCase()).includes(textoBusqueda);
                const coincideDescripcion = producto.descripcion &&
                    removeAccents(producto.descripcion.toLowerCase()).includes(textoBusqueda);
                return coincideNombre || coincideCategoria || coincideDescripcion;
            });
        }

        currentPage = 0; // Resetear a primera página
        loadProducts(); // Recargar con paginación correcta
    }

    // NOTA: aplicarFiltros ya está definida arriba con la lógica completa de filtrado por estado de stock.
    // No redefinir aquí para evitar sobreescribirla.

    function limpiarBusqueda() {
        if (productSearchInputElement) {
            productSearchInputElement.value = '';
        }
        if (window.limpiarErroresInline) {
            window.limpiarErroresInline('product-search-input');
        }
        productosBuscados = null;

        // Limpiar todos los filtros
        if (filterStockEstado) {
            filterStockEstado.value = 'todos';
            filtroStockEstado = 'todos';
        }
        if (filterCategoria) {
            filterCategoria.value = 'todos';
            filtroCategoria = 'todos';
        }
        if (filterProveedor) {
            filterProveedor.value = 'todos';
            filtroProveedor = 'todos';
            filterProveedor.disabled = false;
        }

        // Limpiar selección de orden de compra
        if (window.selectedProductsForOC) {
            window.selectedProductsForOC.clear();
            window.activeProviderForOC = null;
            window.selectedProductsDetailsForOC = {};
            window.updateOCActionBar();
        }

        // Restaurar ordenamiento por defecto (estado de stock)
        sortField = 'estadoStock';
        sortDirection = 'asc';

        currentPage = 0;
        loadProducts();
    }

    // Event listeners para los filtros
    if (filterStockEstado) {
        filterStockEstado.addEventListener('change', (e) => {
            filtroStockEstado = e.target.value;
            currentPage = 0;
            loadProducts();
        });
    }
    if (filterCategoria) {
        filterCategoria.addEventListener('change', (e) => {
            filtroCategoria = e.target.value;
            currentPage = 0;
            loadProducts();
        });
    }
    if (filterProveedor) {
        filterProveedor.addEventListener('change', (e) => {
            filtroProveedor = e.target.value;
            currentPage = 0;
            loadProducts();
        });
    }

    // Event listeners para búsqueda en tiempo real con debounce
    if (productSearchInputElement) {
        productSearchInputElement.addEventListener('input', () => {
            // Cancelar búsqueda anterior si existe
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // Esperar 200ms después de que el usuario deja de escribir
            searchTimeout = setTimeout(() => {
                filtrarProductosPorBusqueda();
            }, 100);
        });
    }

    if (productBtnLimpiar) {
        productBtnLimpiar.addEventListener('click', limpiarBusqueda);
    }

    // ==========================================================
    // FUNCIONALIDAD DE MODAL DE ELIMINACIÓN
    // ==========================================================

    // Función para abrir modal de eliminación
    function openDeleteModal(productId, productName) {
        deleteProductId = productId;
        deleteModalMessage.textContent = `¿Estás seguro de que deseas eliminar "${productName}"?`;
        deleteModal.style.display = 'flex';

        // Cerrar con ESC
        const escHandler = (e) => { if (e.key === 'Escape') closeDeleteModal(); };
        document.addEventListener('keydown', escHandler);
        deleteModal._escHandler = escHandler;
    }

    // Función para cerrar modal de eliminación
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        deleteProductId = null;
        if (deleteModal._escHandler) {
            document.removeEventListener('keydown', deleteModal._escHandler);
            deleteModal._escHandler = null;
        }
    }

    // Event listener para cerrar modal
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // Manejar confirmación de eliminación
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async () => {
            if (!deleteProductId) {
                return; // El modal está siendo usado por otro módulo (ej: proveedor)
            }

            try {
                // Deshabilitar botón para evitar clics múltiples
                deleteConfirmBtn.disabled = true;
                deleteConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

                // Enviar DELETE request
                const response = await fetch(`${API_PRODUCTOS_URL}/${deleteProductId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el producto');
                }

                // \u00c9xito - mostrar mensaje y cerrar

                closeDeleteModal();
                // Recargar productos manteniendo filtros
                loadProducts();

                // Restaurar botón
                deleteConfirmBtn.disabled = false;
                deleteConfirmBtn.textContent = 'Aceptar';
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                alert(`Error al eliminar: ${error.message}`);

                // Rehabilitar botón
                deleteConfirmBtn.disabled = false;
                deleteConfirmBtn.textContent = 'Aceptar';
            }
        });
    }

    // ==========================================================
    // LIMPIAR FORMULARIO DE PRODUCTO
    // ==========================================================

    function limpiarFormularioProducto() {
        // Limpiar campos de texto
        if (nameInput) nameInput.value = '';
        if (categorySearchInput) categorySearchInput.value = '';
        if (categoryHiddenInput) categoryHiddenInput.value = '';
        if (descriptionInput) descriptionInput.value = '';

        // Limpiar resultados de búsqueda de categoría
        if (categoryResultsContainer) categoryResultsContainer.innerHTML = '';

        // Resetear valores de stock a defaults
        if (stockMinInput) stockMinInput.value = '5';
        if (stockMaxInput) stockMaxInput.value = '100';

        // Limpiar mensajes de error
        if (window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('product-');
        if (generalMessage) {
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
        }
    }

    // Event listener para el botón de limpiar
    if (btnLimpiarFormulario) {
        btnLimpiarFormulario.addEventListener('click', limpiarFormularioProducto);
    }

    // ==========================================================
    // FILTRO POR ESTADO DE STOCK (Dropdown)
    // ==========================================================
    window.filtrarPorEstado = function(valor) {
        filtroStockEstado = valor;
        if (filterStockEstado) {
            filterStockEstado.value = valor;
        }
        
        // Resetear otros filtros
        filtroCategoria = 'todos';
        if (filterCategoria) filterCategoria.value = 'todos';
        filtroProveedor = 'todos';
        if (filterProveedor) filterProveedor.value = 'todos';

        // Asegurar que el ordenamiento sea por estado de stock
        sortField = 'estadoStock';
        sortDirection = 'asc';
        
        currentPage = 0;
        loadProducts();
    };

    // ==========================================================
    // CARGA INICIAL
    // ==========================================================
    loadProducts();
    loadCategoriasParaProductos();
});