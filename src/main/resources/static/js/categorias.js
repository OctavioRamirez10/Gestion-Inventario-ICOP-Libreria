/**
 * Este archivo maneja toda la lógica para la sección de "Categorías":
 * - Cargar lista de categorías con conteo de productos
 * - Crear nuevas categorías
 * - Editar categorías existentes
 * - Eliminar categorías (con validación)
 * - Búsqueda y paginación
 */
document.addEventListener('DOMContentLoaded', function () {

    // =================================================================
    // CONSTANTES Y SELECTORES DEL DOM
    // =================================================================

    const API_CATEGORIAS_URL = '/api/categorias';

    // Formulario de creación
    const categoriaForm = document.getElementById('categoria-form');
    const categoriaNombreInput = document.getElementById('categoria-nombre');
    const errorCategoriaNombre = document.getElementById('error-categoria-nombre');
    const formGeneralMessage = document.getElementById('form-general-message-categoria');

    // Tabla y búsqueda
    const searchInput = document.getElementById('categorias-search-input');
    const tableBody = document.getElementById('categorias-table-body');
    const mainContent = document.querySelector('.main-content');

    // Paginación
    const prevPageBtn = document.getElementById('categorias-prev-page');
    const nextPageBtn = document.getElementById('categorias-next-page');
    const pageInfo = document.getElementById('categorias-page-info');

    // Modal de edición
    const editModal = document.getElementById('edit-categoria-modal');
    const editModalCloseBtn = document.getElementById('edit-categoria-modal-close-btn');
    const editForm = document.getElementById('edit-categoria-form');
    const editCategoriaId = document.getElementById('edit-categoria-id');
    const editCategoriaNombre = document.getElementById('edit-categoria-nombre');
    const errorEditCategoriaNombre = document.getElementById('error-edit-categoria-nombre');
    const editFormGeneralMessage = document.getElementById('edit-categoria-form-general-message');

    // Modal de eliminación
    const deleteModal = document.getElementById('delete-categoria-confirm-modal');
    const deleteModalMessage = document.getElementById('delete-categoria-modal-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-categoria-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-categoria-btn');

    // Modal de productos
    const productosModal = document.getElementById('productos-categoria-modal');
    const productosModalClose = document.getElementById('productos-categoria-modal-close');
    const categoriaNombreModal = document.getElementById('categoria-nombre-modal');
    const productosTableBody = document.getElementById('productos-categoria-body');
    const productosPageInfo = document.getElementById('productos-page-info');
    const productosPrevBtn = document.getElementById('productos-prev-page');
    const productosNextBtn = document.getElementById('productos-next-page');

    // =================================================================
    // VARIABLES DE ESTADO
    // =================================================================

    let todasLasCategorias = [];
    let currentPage = 1;
    const itemsPerPage = 7;
    let currentListForPagination = [];
    let sortField = 'nombre';
    let sortDirection = 'asc';
    let categoriaIdParaBorrar = null;

    // Variables para paginación del modal de productos
    let todosLosProductosModal = [];
    let currentProductosPage = 1;
    const productosPerPage = 10;

    // =================================================================
    // FUNCIÓN HELPER PARA NORMALIZACIÓN
    // =================================================================

    /**
     * Normaliza un string para comparación (sin acentos, minúsculas, sin espacios extra)
     */
    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .trim()
            .replace(/\s+/g, ' '); // Espacios múltiples a uno solo
    }

    // =================================================================
    // FUNCIONES DE CARGA Y RENDERIZADO
    // =================================================================

    async function cargarCategorias() {
        if (!tableBody) return;

        try {
            const response = await fetch(API_CATEGORIAS_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            todasLasCategorias = await response.json();
            filtrarCategorias();

        } catch (error) {
            console.error('Error al cargar categorías:', error);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="3">Error: ${error.message}</td></tr>`;
        }
    }

    function filtrarCategorias() {
        if (!searchInput) {
            currentListForPagination = todasLasCategorias;
        } else {
            const textoBusqueda = searchInput.value.toLowerCase();
            currentListForPagination = todasLasCategorias.filter(categoria => {
                return categoria.nombre.toLowerCase().includes(textoBusqueda);
            });
        }
        clientSideSort();
        currentPage = 1;
        renderizarTablaCategorias();
    }

    function clientSideSort() {
        currentListForPagination.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            return (sortDirection === 'desc') ? (comparison * -1) : comparison;
        });
    }

    async function renderizarTablaCategorias() {
        if (!tableBody || !mainContent) return;

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
            tableBody.innerHTML = `<tr><td colspan="3">No se encontraron categorías.</td></tr>`;
        } else {
            paginatedItems.forEach(categoria => {
                const cantidadProductos = categoria.cantidadProductos || 0;
                const row = `
                    <tr>
                        <td>${categoria.nombre}</td>
                        <td>${cantidadProductos} producto(s)</td>
                        <td>
                            <button class="btn-icon btn-view-productos" data-id="${categoria.idCategoria}" data-nombre="${categoria.nombre}" title="Ver productos">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon btn-edit-categoria" data-id="${categoria.idCategoria}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon btn-delete-categoria" data-id="${categoria.idCategoria}"><i class="fas fa-trash"></i></button>
                        </td>
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

    function updateSortIndicators() {
        const tableHeaders = document.querySelectorAll('#categorias-section .data-table th[data-sort-by]');
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
        filtrarCategorias();
    }

    // =================================================================
    // FUNCIONES CREAR CATEGORÍA
    // =================================================================

    async function handleCreateSubmit(event) {
        event.preventDefault();

        // Limpiar mensajes
        errorCategoriaNombre.textContent = '';
        formGeneralMessage.textContent = '';
        formGeneralMessage.className = 'form-message';

        const nombre = categoriaNombreInput.value.trim();

        // Validación: campo vacío
        if (!nombre) {
            errorCategoriaNombre.textContent = 'El nombre es obligatorio';
            return;
        }

        // Validación: duplicados (insensible a mayúsculas/minúsuclas y acentos)
        const nombreNormalizado = normalizarTexto(nombre);
        const duplicado = todasLasCategorias.find(cat =>
            normalizarTexto(cat.nombre) === nombreNormalizado
        );

        if (duplicado) {
            errorCategoriaNombre.textContent = `Ya existe una categoría con el nombre "${duplicado.nombre}"`;
            return;
        }

        const categoriaDTO = { nombre: nombre };

        try {
            const response = await fetch(API_CATEGORIAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoriaDTO)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error: ${response.status}`);
            }

            formGeneralMessage.textContent = '¡Categoría creada con éxito!';
            formGeneralMessage.classList.add('success');
            categoriaForm.reset();

            cargarCategorias();

            // Recargar categorías en otros módulos
            document.dispatchEvent(new Event('categoriasActualizadas'));

            // Volver a la vista de lista
            showSubsection('categorias-list');

        } catch (error) {
            console.error('Error al crear categoría:', error);
            formGeneralMessage.textContent = `${error.message}`;
            formGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // FUNCIONES EDITAR CATEGORÍA
    // =================================================================

    function openEditModal(id) {
        const categoria = todasLasCategorias.find(c => c.idCategoria == id);
        if (!categoria) return;

        document.querySelectorAll('#edit-categoria-form .error-message').forEach(el => el.textContent = '');
        if (editFormGeneralMessage) {
            editFormGeneralMessage.textContent = '';
            editFormGeneralMessage.className = 'form-message';
        }

        editCategoriaId.value = categoria.idCategoria;
        editCategoriaNombre.value = categoria.nombre;

        if (editModal) editModal.style.display = 'flex';
    }

    async function handleEditSubmit(event) {
        event.preventDefault();

        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';

        const id = editCategoriaId.value;
        const nombre = editCategoriaNombre.value.trim();

        // Validación: campo vacío
        if (!nombre) {
            errorEditCategoriaNombre.textContent = 'El nombre es obligatorio';
            return;
        }

        // Validación: duplicados (excluyendo la categoría actual)
        const nombreNormalizado = normalizarTexto(nombre);
        const duplicado = todasLasCategorias.find(cat =>
            cat.idCategoria != id && // Excluir la categoría actual
            normalizarTexto(cat.nombre) === nombreNormalizado
        );

        if (duplicado) {
            errorEditCategoriaNombre.textContent = `Ya existe una categoría con el nombre "${duplicado.nombre}"`;
            return;
        }

        const categoriaDTO = { nombre: nombre };

        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoriaDTO)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error HTTP: ${response.status}`);
            }

            closeEditModal();
            cargarCategorias();
            document.dispatchEvent(new Event('categoriasActualizadas'));

        } catch (error) {
            console.error('Error al actualizar:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // FUNCIONES ELIMINAR CATEGORÍA
    // =================================================================

    function confirmarEliminacion(id) {
        const categoria = todasLasCategorias.find(c => c.idCategoria == id);
        if (!categoria) return;

        const cantidadProductos = categoria.cantidadProductos || 0;
        if (cantidadProductos > 0) {
            deleteModalMessage.textContent = `Esta categoría tiene ${cantidadProductos} producto(s) asociado(s). ¿Estás seguro de que querés eliminarla?`;
        } else {
            deleteModalMessage.textContent = `¿Estás seguro de que querés eliminar la categoría "${categoria.nombre}"?`;
        }

        categoriaIdParaBorrar = id;
        deleteModal.style.display = 'flex';
    }

    async function eliminarCategoria() {
        if (!categoriaIdParaBorrar) return;

        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/${categoriaIdParaBorrar}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error HTTP: ${response.status}`);
            }

            deleteModal.style.display = 'none';
            categoriaIdParaBorrar = null;

            cargarCategorias();
            document.dispatchEvent(new Event('categoriasActualizadas'));

        } catch (error) {
            console.error('Error al eliminar:', error);
            alert(`Error: ${error.message}`);
            deleteModal.style.display = 'none';
            categoriaIdParaBorrar = null;
        }
    }

    // =================================================================
    // FUNCIONES VER PRODUCTOS DE CATEGORÍA
    // =================================================================

    async function abrirModalProductos(idCategoria, nombreCategoria) {
        if (!productosModal) return;

        // Mostrar nombre de categoría en el modal
        if (categoriaNombreModal) categoriaNombreModal.textContent = nombreCategoria;

        // Mostrar modal
        productosModal.style.display = 'block';

        // Cargar productos
        await cargarProductosCategoria(idCategoria);
    }

    async function cargarProductosCategoria(idCategoria) {
        if (!productosTableBody) return;

        try {
            productosTableBody.innerHTML = '<tr><td colspan="4">Cargando productos...</td></tr>';

            const response = await fetch(`${API_CATEGORIAS_URL}/${idCategoria}/productos`);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const productos = await response.json();
            renderizarProductosModal(productos);

        } catch (error) {
            console.error('Error al cargar productos:', error);
            productosTableBody.innerHTML = `<tr><td colspan="4">Error: ${error.message}</td></tr>`;
        }
    }

    function renderizarProductosModal(productos) {
        if (!productosTableBody) return;

        todosLosProductosModal = productos;
        currentProductosPage = 1;

        if (productos.length === 0) {
            productosTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Esta categoría no tiene productos asociados</td></tr>';
            if (productosPageInfo) productosPageInfo.textContent = 'Página 0 de 0';
            if (productosPrevBtn) productosPrevBtn.disabled = true;
            if (productosNextBtn) productosNextBtn.disabled = true;
            return;
        }

        renderizarPaginaProductos();
    }

    function renderizarPaginaProductos() {
        if (!productosTableBody) return;

        const totalPages = Math.ceil(todosLosProductosModal.length / productosPerPage);
        const startIndex = (currentProductosPage - 1) * productosPerPage;
        const endIndex = startIndex + productosPerPage;
        const paginatedProducts = todosLosProductosModal.slice(startIndex, endIndex);

        const formatoMoneda = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        productosTableBody.innerHTML = '';
        paginatedProducts.forEach(p => {
            let stockClass = 'good';
            if (p.stock <= 0) stockClass = 'empty';
            else if (p.stock <= 5) stockClass = 'low';

            const row = `
                <tr>
                    <td>${p.nombreProducto}</td>
                    <td>${p.descripcion || '-'}</td>
                    <td>$${formatoMoneda.format(p.precio)}</td>
                    <td><span class="stock-badge ${stockClass}">${p.stock}</span></td>
                </tr>
            `;
            productosTableBody.innerHTML += row;
        });

        // Actualizar controles de paginación
        if (productosPageInfo) productosPageInfo.textContent = `Página ${currentProductosPage} de ${totalPages}`;
        if (productosPrevBtn) productosPrevBtn.disabled = (currentProductosPage === 1);
        if (productosNextBtn) productosNextBtn.disabled = (currentProductosPage === totalPages);
    }

    // =================================================================
    // EVENT LISTENERS
    // =================================================================

    // Búsqueda
    if (searchInput) searchInput.addEventListener('input', filtrarCategorias);

    // Botón limpiar búsqueda
    const clearSearchBtn = document.getElementById('categorias-clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async () => {
            // Añadir animación de loading
            if (tableBody) {
                tableBody.classList.add('loading');
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (searchInput) searchInput.value = '';
            filtrarCategorias();

            // Remover animación después de filtrar
            if (tableBody) {
                tableBody.classList.remove('loading');
            }
        });
    }

    // Ordenamiento
    const tableHeaders = document.querySelectorAll('#categorias-section .data-table th[data-sort-by]');
    tableHeaders.forEach(th => th.addEventListener('click', handleSortClick));

    // Formularios
    if (categoriaForm) categoriaForm.addEventListener('submit', handleCreateSubmit);
    if (editForm) editForm.addEventListener('submit', handleEditSubmit);

    // Función para cerrar modal de edición y limpiar mensajes
    function closeEditModal() {
        // Limpiar mensajes de error
        document.querySelectorAll('#edit-categoria-form .error-message').forEach(el => el.textContent = '');

        // Limpiar mensaje general
        if (editFormGeneralMessage) {
            editFormGeneralMessage.textContent = '';
            editFormGeneralMessage.className = 'form-message';
        }

        // Cerrar modal
        if (editModal) editModal.style.display = 'none';
    }

    // Modales
    if (editModalCloseBtn) editModalCloseBtn.addEventListener('click', closeEditModal);

    // Delete modal - close button (X)
    const closeDeleteModalBtn = document.getElementById('close-delete-categoria-modal');
    if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        categoriaIdParaBorrar = null;
    });

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { deleteModal.style.display = 'none'; categoriaIdParaBorrar = null; });
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', eliminarCategoria);
    if (productosModalClose) productosModalClose.addEventListener('click', () => { productosModal.style.display = 'none'; });

    // Botones de tabla (delegación de eventos)
    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            const target = event.target;

            const viewButton = target.closest('.btn-view-productos');
            if (viewButton) {
                abrirModalProductos(viewButton.dataset.id, viewButton.dataset.nombre);
            }

            const editButton = target.closest('.btn-edit-categoria');
            if (editButton) {
                openEditModal(editButton.dataset.id);
            }
            const deleteButton = target.closest('.btn-delete-categoria');
            if (deleteButton) {
                confirmarEliminacion(deleteButton.dataset.id);
            }
        });
    }

    // Paginación
    if (prevPageBtn) prevPageBtn.addEventListener('click', async () => { if (currentPage > 1) { currentPage--; await renderizarTablaCategorias(); } });
    if (nextPageBtn) nextPageBtn.addEventListener('click', async () => {
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; await renderizarTablaCategorias(); }
    });

    // Paginación del modal de productos
    if (productosPrevBtn) productosPrevBtn.addEventListener('click', () => {
        if (currentProductosPage > 1) {
            currentProductosPage--;
            renderizarPaginaProductos();
        }
    });
    if (productosNextBtn) productosNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(todosLosProductosModal.length / productosPerPage);
        if (currentProductosPage < totalPages) {
            currentProductosPage++;
            renderizarPaginaProductos();
        }
    });

    // Tecla ESC para cerrar modales
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editModal && editModal.style.display === 'block') editModal.style.display = 'none';
            if (deleteModal && deleteModal.style.display === 'block') { deleteModal.style.display = 'none'; categoriaIdParaBorrar = null; }
            if (productosModal && productosModal.style.display === 'block') productosModal.style.display = 'none';
        }
    });

    // =================================================================
    // SUBSECCIONES
    // =================================================================

    function showSubsection(subsectionId) {
        const subsectionContainers = document.querySelectorAll('#categorias-section .subsection-container');
        subsectionContainers.forEach(container => {
            container.style.display = 'none';
        });

        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente
    window.showCategoriaSubsection = showSubsection;

    // =================================================================
    // CARGA INICIAL
    // =================================================================

    cargarCategorias();
});
