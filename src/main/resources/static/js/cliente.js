// === cliente.js ===
document.addEventListener('DOMContentLoaded', function () {

    const API_CLIENTES_URL = '/api/clientes';

    // Estado global
    let allClientes = [];       // Dataset completo en memoria
    let filteredClientes = [];  // Dataset filtrado
    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 8;

    // Estado de ordenamiento
    let sortField = 'apellido';
    let sortDirection = 'asc';

    // Referencias a la UI principal
    const tbody = document.getElementById('tabla-clientes-body');
    const tableContainer = document.querySelector('.table-container-cliente');
    const paginationInfo = document.getElementById('clientes-page-info');
    const btnPrevPage = document.getElementById('clientes-prev-page');
    const btnNextPage = document.getElementById('clientes-next-page');
    const inputSearch = document.getElementById('clientes-search-input');
    const btnClearSearch = document.getElementById('clientes-btn-limpiar');
    const btnSortApellido = document.getElementById('clientes-sort-apellido');
    const btnSortNombre = document.getElementById('clientes-sort-nombre');

    // Modales y formularios
    const detailModal = document.getElementById('cliente-detail-modal');
    const editModal = document.getElementById('cliente-edit-modal');
    const deleteModal = document.getElementById('cliente-delete-modal');

    const isAdmin = editModal !== null;

    if (!tbody) return;

    // Helper: quitar acentos y pasar a minúsculas
    const quitarAcentos = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
    };

    // ==========================================
    // CARGA DE DATOS (una sola vez desde la API)
    // ==========================================
    async function fetchAllClientes() {
        const response = await fetch(`${API_CLIENTES_URL}/all?page=0&size=10000&sort=apellido,asc`);
        if (!response.ok) throw new Error('Error al obtener clientes');
        const data = await response.json();
        allClientes = data.content || [];
    }

    // ==========================================
    // FILTRADO + PAGINACIÓN LOCAL
    // ==========================================
    async function loadClientes(forceFetch = false) {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tbody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // Solo traemos datos del backend si no los tenemos o si se fuerza
            if (allClientes.length === 0 || forceFetch) {
                await fetchAllClientes();
            }

            // Filtrado local (case + accent insensitive)
            const query = quitarAcentos(inputSearch ? inputSearch.value.trim() : '');
            const queryDigits = query.replace(/\D/g, ''); // Solo dígitos para teléfono
            if (query !== '') {
                filteredClientes = allClientes.filter(c => {
                    const telDigits = (c.telefono || '').replace(/\D/g, '');
                    return (
                        quitarAcentos(c.nombre).includes(query) ||
                        quitarAcentos(c.apellido).includes(query) ||
                        quitarAcentos(c.dni).includes(query) ||
                        quitarAcentos(c.telefono).includes(query) ||
                        (queryDigits.length > 0 && telDigits.includes(queryDigits)) ||
                        quitarAcentos(c.email).includes(query)
                    );
                });
            } else {
                filteredClientes = [...allClientes];
            }

            // Ordenamiento local
            sortClientes();

            // Paginación local
            totalPages = Math.max(1, Math.ceil(filteredClientes.length / itemsPerPage));
            if (currentPage >= totalPages) currentPage = 0;
            const pageSlice = filteredClientes.slice(
                currentPage * itemsPerPage,
                (currentPage + 1) * itemsPerPage
            );

            renderTable(pageSlice);
            updatePagination();
            updateSortIndicators();

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                tbody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar datos.</td></tr>`;
            tbody.classList.remove('loading');
        }
    }

    function renderTable(clientes) {
        tbody.innerHTML = '';
        if (clientes.length === 0) {
            const msg = (inputSearch && inputSearch.value.trim() !== '')
                ? 'No se encontraron clientes que coincidan con la búsqueda.'
                : 'No se encontraron clientes.';
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${msg}</td></tr>`;
            return;
        }

        clientes.forEach(cliente => {
            let tr = document.createElement('tr');

            let accionesHtml = `
                <button class="btn-icon btn-view-cliente" data-id="${cliente.idCliente}" title="Ver Detalles">
                    <i class="fas fa-eye"></i>
                </button>
            `;

            if (isAdmin) {
                accionesHtml += `
                    <button class="btn-icon btn-edit-cliente" data-id="${cliente.idCliente}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete-cliente" data-id="${cliente.idCliente}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>${cliente.nombre || '-'}</td>
                <td>${cliente.apellido || '-'}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>${accionesHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updatePagination() {
        if (!paginationInfo) return;
        paginationInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`;

        btnPrevPage.disabled = (currentPage === 0);
        btnNextPage.disabled = (currentPage + 1 >= totalPages);
    }

    // ==========================================
    // ORDENAMIENTO LOCAL
    // ==========================================
    function sortClientes() {
        const tiebreaker = sortField === 'apellido' ? 'nombre' : 'apellido';
        filteredClientes.sort((a, b) => {
            const valA = quitarAcentos(a[sortField] || '');
            const valB = quitarAcentos(b[sortField] || '');
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            const tieA = quitarAcentos(a[tiebreaker] || '');
            const tieB = quitarAcentos(b[tiebreaker] || '');
            return tieA < tieB ? -1 : tieA > tieB ? 1 : 0;
        });
    }

    function updateSortIndicators() {
        [btnSortApellido, btnSortNombre].forEach(btn => {
            if (!btn) return;
            btn.classList.remove('active');
            const arrow = btn.querySelector('.sort-arrow');
            if (arrow) arrow.className = 'fas fa-sort sort-arrow';
        });
        const activeBtn = sortField === 'apellido' ? btnSortApellido : btnSortNombre;
        if (activeBtn) {
            activeBtn.classList.add('active');
            const arrow = activeBtn.querySelector('.sort-arrow');
            if (arrow) arrow.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} sort-arrow`;
        }
    }

    function handleSortBtn(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        currentPage = 0;
        loadClientes();
    }

    if (btnSortApellido) btnSortApellido.addEventListener('click', () => handleSortBtn('apellido'));
    if (btnSortNombre) btnSortNombre.addEventListener('click', () => handleSortBtn('nombre'));

    // ==========================================
    // EVENTOS DE NAVEGACION Y BUSQUEDA
    // ==========================================
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                loadClientes();
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadClientes();
            }
        });
    }

    // Búsqueda en tiempo real con debounce
    let searchTimeout;
    if (inputSearch) {
        inputSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 0;
                loadClientes();
            }, 300);
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            if (inputSearch) {
                inputSearch.value = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline('clientes-search-input');
            }
            currentPage = 0;
            loadClientes();
        });
    }

    // ==========================================
    // DELEGACIÓN DE EVENTOS PARA BOTONES DE ACCIÓN
    // ==========================================
    tbody.addEventListener('click', async (e) => {
        const btnView = e.target.closest('.btn-view-cliente');
        const btnEdit = e.target.closest('.btn-edit-cliente');
        const btnDelete = e.target.closest('.btn-delete-cliente');

        if (btnView) handleView(btnView.dataset.id);
        if (btnEdit) handleEdit(btnEdit.dataset.id);
        if (btnDelete) handleDelete(btnDelete.dataset.id);
    });

    // ==========================================
    // ACCIONES (VER) — con paginación de ventas
    // ==========================================
    let detailVentas = [];
    let detailVentasPage = 0;
    const detailVentasPerPage = 5;

    function renderVentasPage() {
        const ventasBody = document.getElementById('detail-cliente-ventas-body');
        if (detailVentas.length === 0) {
            ventasBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Este cliente no tiene ventas registradas.</td></tr>';
            return;
        }

        ventasBody.innerHTML = detailVentas.map(v => {
            const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
            const productos = v.productos && v.productos.length > 0
                ? v.productos.map(p => `${p.nombreProducto} (x${p.cantidad})`).join(', ')
                : '-';
            const total = v.total != null ? `$${v.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-';
            const metodo = v.metodoPago || '-';
            return `<tr>
                <td>${fecha}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${productos}">${productos}</td>
                <td style="text-align:right;">${total}</td>
                <td>${metodo}</td>
            </tr>`;
        }).join('');
    }

    async function handleView(id) {
        const ventasBody = document.getElementById('detail-cliente-ventas-body');
        const ventasCount = document.getElementById('detail-cliente-ventas-count');

        try {
            const [resCliente, resVentas] = await Promise.all([
                fetch(`${API_CLIENTES_URL}/${id}`),
                fetch(`${API_CLIENTES_URL}/${id}/ventas`)
            ]);

            if (!resCliente.ok) throw new Error('Cliente no encontrado');
            const data = await resCliente.json();

            document.getElementById('detail-cliente-nombre').textContent = data.nombre || '-';
            document.getElementById('detail-cliente-apellido').textContent = data.apellido || '-';
            document.getElementById('detail-cliente-dni').textContent = data.dni || '-';
            document.getElementById('detail-cliente-telefono').textContent = data.telefono || '-';
            document.getElementById('detail-cliente-email').textContent = data.email || '-';
            document.getElementById('detail-cliente-direccion').textContent = data.direccion || '-';

            const avatarEl = document.getElementById('detail-cliente-avatar');
            if (avatarEl) {
                avatarEl.textContent = data.nombre ? data.nombre.charAt(0).toUpperCase() : 'C';
            }

            if (resVentas.ok) {
                detailVentas = await resVentas.json();
                ventasCount.textContent = `(${detailVentas.length} ${detailVentas.length === 1 ? 'venta' : 'ventas'})`;
                const badgeEl = document.getElementById('detail-cliente-ventas-count-badge');
                if (badgeEl) badgeEl.textContent = detailVentas.length;
                renderVentasPage();
            } else {
                detailVentas = [];
                ventasBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar ventas.</td></tr>';
                ventasCount.textContent = '';
                const badgeEl = document.getElementById('detail-cliente-ventas-count-badge');
                if (badgeEl) badgeEl.textContent = '0';
            }

            detailModal.style.display = 'block';
        } catch (error) {
            alert(error.message);
        }
    }

    if (detailModal) {
        document.getElementById('cliente-detail-close').addEventListener('click', () => detailModal.style.display = 'none');
        document.getElementById('cliente-detail-close-btn').addEventListener('click', () => detailModal.style.display = 'none');
    }

    // Si no es admin, la lógica se acaba acá
    if (!isAdmin) {
        // Escuchar clics en el sidebar para cargar datos al activar la sección
        document.querySelectorAll('.sidebar-menu a[data-section="clientes"]').forEach(link => {
            link.addEventListener('click', () => setTimeout(() => loadClientes(true), 50));
        });
        return;
    }

    // ==========================================
    // ACCIONES (EDITAR)
    // ==========================================
    const editForm = document.getElementById('edit-cliente-form');
    const editMsg = document.getElementById('edit-cliente-form-msg');
    let clienteActualEditando = null;

    async function handleEdit(id) {
        editMsg.textContent = '';
        editMsg.className = 'form-message';

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${id}`);
            if (!res.ok) throw new Error('Cliente no encontrado');
            const data = await res.json();
            clienteActualEditando = data;

            document.getElementById('edit-cliente-id').value = data.idCliente;
            document.getElementById('edit-cliente-nombre').value = data.nombre || '';
            document.getElementById('edit-cliente-apellido').value = data.apellido || '';
            document.getElementById('edit-cliente-dni').value = data.dni || '';
            document.getElementById('edit-cliente-telefono').value = data.telefono || '';
            document.getElementById('edit-cliente-email').value = data.email || '';
            document.getElementById('edit-cliente-direccion').value = data.direccion || '';

            editModal.style.display = 'flex';
        } catch (error) {
            alert(error.message);
        }
    }

    function clearEditErrors() {
        if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('edit-cliente');
        if (editMsg) {
            editMsg.textContent = '';
            editMsg.className = 'form-message';
        }
    }

    const closeEditModal = () => {
        editModal.style.display = 'none';
        clearEditErrors();
    };

    const editCloseBtn = document.getElementById('cliente-edit-close');
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', closeEditModal);
    }

    const editResetBtn = document.getElementById('cliente-edit-reset');
    if (editResetBtn) {
        editResetBtn.addEventListener('click', () => {
            if (clienteActualEditando) {
                document.getElementById('edit-cliente-id').value = clienteActualEditando.idCliente;
                document.getElementById('edit-cliente-nombre').value = clienteActualEditando.nombre || '';
                document.getElementById('edit-cliente-apellido').value = clienteActualEditando.apellido || '';
                document.getElementById('edit-cliente-dni').value = clienteActualEditando.dni || '';
                document.getElementById('edit-cliente-telefono').value = clienteActualEditando.telefono || '';
                document.getElementById('edit-cliente-email').value = clienteActualEditando.email || '';
                document.getElementById('edit-cliente-direccion').value = clienteActualEditando.direccion || '';
                
                clearEditErrors();
                if (editMsg) {
                    editMsg.textContent = 'Valores originales restablecidos.';
                    editMsg.className = 'form-message success';
                    setTimeout(() => { editMsg.textContent = ''; editMsg.className = 'form-message'; }, 3000);
                }
            }
        });
    }

    // Cerrar al hacer clic fuera
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal && editModal.style.display === 'flex') {
            closeEditModal();
        }
    });

    document.getElementById('cliente-edit-save').addEventListener('click', async () => {
        clearEditErrors();

        const id = document.getElementById('edit-cliente-id').value;
        const dto = {
            nombre: document.getElementById('edit-cliente-nombre').value.trim(),
            apellido: document.getElementById('edit-cliente-apellido').value.trim(),
            dni: document.getElementById('edit-cliente-dni').value.trim(),
            telefono: document.getElementById('edit-cliente-telefono').value.trim(),
            email: document.getElementById('edit-cliente-email').value.trim(),
            direccion: document.getElementById('edit-cliente-direccion').value.trim()
        };

        // ====== Validaciones Inline ======
        let isValid = true;
        if (!dto.nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-nombre', 'El nombre es obligatorio'); isValid = false; }
        else { if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-nombre'); }
        
        if (!dto.apellido) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-apellido', 'El apellido es obligatorio'); isValid = false; }
        else { if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-apellido'); }
        
        if (!dto.dni) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-dni', 'El DNI es obligatorio'); isValid = false; }
        else { if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-dni'); }
        
        if (!dto.telefono) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-telefono', 'El teléfono es obligatorio'); isValid = false; }
        else { if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-telefono'); }
        
        if (!dto.direccion) { if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-direccion', 'La dirección es obligatoria'); isValid = false; }
        else { if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-direccion'); }
        
        if (!dto.email) {
            if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-email', 'El email es obligatorio');
            isValid = false;
        } else if (!dto.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            if(window.mostrarErrorInline) window.mostrarErrorInline('edit-cliente-email', 'El formato del email no es válido');
            isValid = false;
        } else {
            if(window.limpiarErroresInline) window.limpiarErroresInline('edit-cliente-email');
        }

        if (!isValid) {
            return;
        }

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                if (errorData && errorData.message) {
                    throw new Error(errorData.message);
                } else {
                    const errorText = await res.text();
                    throw new Error(errorText || 'Error al actualizar el cliente');
                }
            }

            editModal.style.display = 'none';
            loadClientes(true);
        } catch (error) {
            editMsg.textContent = error.message;
            editMsg.className = 'form-message error';
        }
    });

    // ==========================================
    // ACCIONES (ELIMINAR)
    // ==========================================
    let clienteToDelete = null;

    function handleDelete(id) {
        clienteToDelete = id;
        const cliente = allClientes.find(c => String(c.idCliente) === String(id));
        const nombre = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : 'este cliente';
        document.getElementById('delete-cliente-message').textContent = `¿Estás seguro de que quieres eliminar al cliente "${nombre}"?`;
        deleteModal.style.display = 'flex';
    }

    document.getElementById('cliente-delete-close').addEventListener('click', () => deleteModal.style.display = 'none');
    document.getElementById('cliente-delete-cancel').addEventListener('click', () => deleteModal.style.display = 'none');

    document.getElementById('cliente-delete-confirm').addEventListener('click', async () => {
        if (!clienteToDelete) return;

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${clienteToDelete}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorMsg = await res.text();
                throw new Error(errorMsg || 'No se puede eliminar un cliente con ventas.');
            }
            deleteModal.style.display = 'none';
            loadClientes(true);
        } catch (error) {
            alert(error.message);
            deleteModal.style.display = 'none';
        } finally {
            clienteToDelete = null;
        }
    });

    // Escuchar clics en el sidebar para cargar datos al activar la sección
    document.querySelectorAll('.sidebar-menu a[data-section="clientes"]').forEach(link => {
        link.addEventListener('click', () => setTimeout(() => loadClientes(true), 50));
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const clientesSection = document.getElementById('clientes-section');
    const subsectionContainers = clientesSection ? clientesSection.querySelectorAll('.subsection-container') : [];

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores de clientes
        subsectionContainers.forEach(container => {
            container.style.display = 'none';
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }

        // Si entramos a la lista de clientes, recargamos los datos
        if (subsectionId === 'clientes-list') {
            loadClientes(true);
        }
    }

    // Exponer globalmente
    window.showClientesSubsection = showSubsection;

    // ===============================
    // RESTRICCIÓN DE CAMPO TELÉFONO
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
            const maxLen = parseInt(this.getAttribute('maxlength')) || Infinity;
            const newValue = (this.value.slice(0, start) + sanitized + this.value.slice(end)).slice(0, maxLen);
            this.value = newValue;
            const cursor = Math.min(start + sanitized.length, maxLen);
            this.selectionStart = this.selectionEnd = cursor;
            this.dispatchEvent(new Event('input'));
        });
    }

    // ===============================
    // RESTRICCIÓN Y AUTO-FORMATO DNI (XX.XXX.XXX)
    // ===============================
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

    // ===============================
    // LÍMITES DE CARACTERES EN TIEMPO REAL
    // ===============================
    function bindLimit(input, errorEl, max) {
        if (!input) return;
        input.addEventListener('input', () => {
            if (input.value.length >= max) {
                if(window.mostrarErrorInline) window.mostrarErrorInline(input.id, `Límite de ${max} caracteres alcanzado.`);
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline(input.id);
            }
        });
    }

    restrictTelefonoInput(document.getElementById('crearClienteTelefono'));
    restrictDniInput(document.getElementById('crearClienteDNI'));
    bindLimit(document.getElementById('crearClienteNombre'), document.getElementById('error-crearClienteNombre'), 70);
    bindLimit(document.getElementById('crearClienteApellido'), document.getElementById('error-crearClienteApellido'), 70);
    bindLimit(document.getElementById('crearClienteTelefono'), document.getElementById('error-crearClienteTelefono'), 20);
    bindLimit(document.getElementById('crearClienteDireccion'), document.getElementById('error-crearClienteDireccion'), 100);
    bindLimit(document.getElementById('crearClienteEmail'), document.getElementById('error-crearClienteEmail'), 80);
    bindLimit(document.getElementById('crearClienteDNI'), document.getElementById('error-crearClienteDNI'), 11);

    restrictTelefonoInput(document.getElementById('edit-cliente-telefono'));
    restrictDniInput(document.getElementById('edit-cliente-dni'));
    bindLimit(document.getElementById('edit-cliente-nombre'), document.getElementById('error-edit-cliente-nombre'), 70);
    bindLimit(document.getElementById('edit-cliente-apellido'), document.getElementById('error-edit-cliente-apellido'), 70);
    bindLimit(document.getElementById('edit-cliente-telefono'), document.getElementById('error-edit-cliente-telefono'), 20);
    bindLimit(document.getElementById('edit-cliente-direccion'), document.getElementById('error-edit-cliente-direccion'), 100);
    bindLimit(document.getElementById('edit-cliente-email'), document.getElementById('error-edit-cliente-email'), 80);
    bindLimit(document.getElementById('edit-cliente-dni'), document.getElementById('error-edit-cliente-dni'), 11);

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    const crearClienteForm = document.getElementById('crear-cliente-form');
    const crearGeneralMessage = document.getElementById('form-general-message-crear-cliente');

    if (crearClienteForm) {
        crearClienteForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('crearCliente');
            if (crearGeneralMessage) {
                crearGeneralMessage.textContent = '';
                crearGeneralMessage.className = 'form-message';
            }

            // 2. Obtener valores
            const dto = {
                nombre: document.getElementById('crearClienteNombre').value.trim(),
                apellido: document.getElementById('crearClienteApellido').value.trim(),
                dni: document.getElementById('crearClienteDNI').value.trim(),
                telefono: document.getElementById('crearClienteTelefono').value.trim(),
                email: document.getElementById('crearClienteEmail').value.trim(),
                direccion: document.getElementById('crearClienteDireccion').value.trim()
            };

            // 3. Validaciones
            let isValid = true;
            if (!dto.nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteNombre', 'El nombre es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteNombre'); }
            
            if (!dto.apellido) { if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteApellido', 'El apellido es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteApellido'); }
            
            if (!dto.dni) { if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteDNI', 'El DNI es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteDNI'); }
            
            if (!dto.telefono) { if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteTelefono', 'El teléfono es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteTelefono'); }
            
            if (!dto.direccion) { if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteDireccion', 'La dirección es obligatoria'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteDireccion'); }
            
            if (!dto.email) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteEmail', 'El email es obligatorio');
                isValid = false;
            } else if (!dto.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('crearClienteEmail', 'El formato del email no es válido');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('crearClienteEmail');
            }

            if (!isValid) {
                return;
            }

            // 4. Confirmar y Enviar
            showConfirmationModal("¿Estás seguro de que deseas registrar este cliente?", async () => {
                try {
                    const response = await fetch(API_CLIENTES_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dto)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || `Error: ${response.status}`);
                    }

                    if (crearGeneralMessage) {
                        crearGeneralMessage.textContent = "¡Cliente registrado con éxito!";
                        crearGeneralMessage.classList.add('success');
                    }
                    crearClienteForm.reset();

                    // Disparar evento para que otras pantallas (ej. ventas) escuchen la actualización
                    document.dispatchEvent(new Event('clientesActualizados'));

                    // Mantener el mensaje de éxito unos segundos y luego limpiarlo
                    setTimeout(() => {
                        if (crearGeneralMessage) {
                            crearGeneralMessage.textContent = '';
                            crearGeneralMessage.className = 'form-message';
                        }
                    }, 4000);

                } catch (error) {
                    console.error('Error al registrar el cliente:', error);
                    if (crearGeneralMessage) {
                        crearGeneralMessage.textContent = `${error.message}`;
                        crearGeneralMessage.classList.add('error');
                    }
                }
            });
        });
    }

    const btnLimpiarCrear = document.getElementById('btn-limpiar-crear-cliente');
    if (btnLimpiarCrear) {
        btnLimpiarCrear.addEventListener('click', () => {
            if (crearClienteForm) crearClienteForm.reset();
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('crearCliente');
            if (crearGeneralMessage) {
                crearGeneralMessage.textContent = '';
                crearGeneralMessage.className = 'form-message';
            }
        });
    }

});
