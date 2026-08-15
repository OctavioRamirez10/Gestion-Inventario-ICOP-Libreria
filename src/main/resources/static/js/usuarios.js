/**
 * Este archivo maneja toda la lógica para la sección de "Usuarios":
 * - Cargar la lista de usuarios (paginada y ordenada).
 * - Cargar roles en los formularios.
 * - Validar y enviar el formulario para registrar nuevos usuarios.
 * - Manejar el modal de edición de usuarios.
 * - Manejar el modal de eliminación.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_USUARIOS_URL = '/api/usuarios';
    const API_ROLES_URL = '/api/roles';

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let currentDeleteUserId = null;
    let itemsPerPage = 10;

    // ===============================
    // SELECTORES - TABLA Y PAGINACIÓN
    // ===============================
    const userTableBody = document.getElementById('user-table-body');
    const prevPageBtn = document.getElementById('user-prev-page');
    const nextPageBtn = document.getElementById('user-next-page');
    const pageInfo = document.getElementById('user-page-info');

    // ¡NUEVO! Selector para estabilidad de scroll/foco
    const mainContent = document.querySelector('.main-content');

    // ===============================
    // ESTADO DE PAGINACIÓN
    // ===============================
    let currentPage = 0;
    let totalPages = 1;

    // ===============================
    // VARIABLES DE BÚSQUEDA
    // ===============================
    const searchInput = document.getElementById('user-search-input');
    const clearSearchBtn = document.getElementById('user-clear-search');
    let todosLosUsuarios = []; // Guardar todos los usuarios de la página actual
    let usuariosFiltrados = null; // Para guardar resultados filtrados

    // ===============================
    // ESTADO Y SELECTORES DE ORDENAMIENTO
    // ===============================
    let sortField = 'apellido';
    let sortDirection = 'asc';
    const btnSortNombre = document.getElementById('user-sort-nombre');
    const selectFiltroRol = document.getElementById('user-filtro-rol');


    // ===============================
    // SELECTORES - FORMULARIO DE REGISTRO
    // ===============================
    const userForm = document.getElementById('user-form');
    const nombreInput = document.getElementById('user-nombre');
    const apellidoInput = document.getElementById('user-apellido');
    const emailInput = document.getElementById('user-email');
    const rolSelect = document.getElementById('user-rol');
    const passwordInput = document.getElementById('user-password');
    const confirmPasswordInput = document.getElementById('user-confirm-password');
    const generalMessage = document.getElementById('form-general-message-usuario');

    // ===============================
    // SELECTORES - MODAL DE EDICIÓN
    // ===============================
    const modalEdit = document.getElementById('modal-edit-usuario-overlay');
    const modalEditCloseBtn = document.getElementById('modal-edit-usuario-close');
    const editForm = document.getElementById('edit-usuario-form');
    const editIdInput = document.getElementById('editUsuarioId');
    const editNombreInput = document.getElementById('editUsuarioNombre');
    const editApellidoInput = document.getElementById('editUsuarioApellido');
    const editEmailInput = document.getElementById('editUsuarioEmail');
    const editRolSelect = document.getElementById('editUsuarioRol');
    const editGeneralMessage = document.getElementById('form-general-message-edit-usuario');


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

    bindLimit(nombreInput,         document.getElementById('error-user-nombre'),          70);
    bindLimit(apellidoInput,       document.getElementById('error-user-apellido'),         70);
    bindLimit(emailInput,          document.getElementById('error-user-email'),            80);
    bindLimit(passwordInput,       document.getElementById('error-user-password'),         50);
    bindLimit(confirmPasswordInput,document.getElementById('error-user-confirm-password'), 50);

    bindLimit(editNombreInput,   document.getElementById('error-editUsuarioNombre'),   70);
    bindLimit(editApellidoInput, document.getElementById('error-editUsuarioApellido'), 70);
    bindLimit(editEmailInput,    document.getElementById('error-editUsuarioEmail'),    255);

    // Limpiar error al seleccionar un rol
    if (rolSelect) {
        rolSelect.addEventListener('change', function() {
            if (this.value) {
                if(window.limpiarErroresInline) window.limpiarErroresInline(this.id);
            }
        });
    }

    if (editRolSelect) {
        editRolSelect.addEventListener('change', function() {
            if (this.value) {
                if(window.limpiarErroresInline) window.limpiarErroresInline(this.id);
            }
        });
    }

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (TABLA Y ROLES)
    // ==========================================================

    /**
     * Carga los roles desde la API y los popula en los <select>
     */
    async function loadRoles() {
        try {
            const response = await fetch(API_ROLES_URL);
            if (!response.ok) throw new Error('Error al cargar roles.');
            allRoles = await response.json(); // <-- Esto trae [{"idRol": 1, "descripcion": "ADMIN"}, ...]

            const rolesOrdenados = [...allRoles].sort((a, b) =>
                a.descripcion.localeCompare(b.descripcion)
            );

            if (rolSelect) {
                rolSelect.innerHTML = '<option value="">Selecciona rol</option>';
                rolesOrdenados.forEach(rol => {
                    const option = document.createElement('option');
                    option.value = rol.idRol;
                    const desc = rol.descripcion.toLowerCase();
                    option.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
                    rolSelect.appendChild(option);
                });
            }

            if (selectFiltroRol) {
                const opcionTodos = selectFiltroRol.querySelector('option[value=""]');
                selectFiltroRol.innerHTML = '';
                if (opcionTodos) selectFiltroRol.appendChild(opcionTodos);
                rolesOrdenados.forEach(rol => {
                    const option = document.createElement('option');
                    option.value = rol.idRol;
                    const desc = rol.descripcion.toLowerCase();
                    option.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
                    selectFiltroRol.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar roles:', error);
            if (rolSelect) rolSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    /**
     * ¡MODIFICADO! Carga la tabla de usuarios con paginación, ordenamiento y animación.
     */
    async function loadUsuarios() {
        if (!userTableBody || !mainContent) return;

        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        userTableBody.classList.add('loading');

        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // 2. Construir URL con paginación, ordenamiento y búsqueda
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            const searchParam = searchInput && searchInput.value.trim() ? `&search=${encodeURIComponent(searchInput.value.trim())}` : '';
            const rolParam = selectFiltroRol && selectFiltroRol.value ? `&idRol=${selectFiltroRol.value}` : '';
            const url = `${API_USUARIOS_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}${searchParam}${rolParam}`;

            const response = await fetch(url);
            if (!response.ok) {
                // Manejo de error si el token expiró o es inválido
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/index.html'; // Redirigir al login
                }
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const pageData = await response.json();
            totalPages = pageData.totalPages;
            todosLosUsuarios = pageData.content;

            // 3. Renderizar resultados (la búsqueda ya se hizo en el backend)
            renderUserTable(todosLosUsuarios);

            updatePaginationControls();
            updateSortIndicators(); // ¡NUEVO!

            // 4. Restaurar scroll y aplicar Fade-In
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                userTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los usuarios:', error);
            userTableBody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios.</td></tr>`;
            userTableBody.classList.remove('loading');
        }
    }

    /**
     * Renderiza las filas de la tabla de usuarios.
     */
    function renderUserTable(usuarios) {
        userTableBody.innerHTML = '';
        if (usuarios.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay usuarios registrados.</td></tr>';
            return;
        }

        usuarios.forEach(user => {
            const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'N/A';
            let rolDisplay = user.descripcionRol || 'Sin Rol';
            rolDisplay = rolDisplay.charAt(0).toUpperCase() + rolDisplay.slice(1).toLowerCase();

            const row = `
                <tr>
                    <td style="font-weight: 600; color: #0f172a;">${nombreCompleto}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${rolDisplay}</td>
                    <td style="text-align: center;">
                        <button class="btn-icon btn-edit-usuario" data-id="${user.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete-usuario" data-id="${user.id}" data-nombre="${user.nombre}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            userTableBody.innerHTML += row;
        });
    }

    // ===============================================
    // LÓGICA DE PAGINACIÓN
    // ===============================================

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
                loadUsuarios();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadUsuarios();
            }
        });
    }

    // ===============================================
    // ¡NUEVO! LÓGICA DE ORDENAMIENTO
    // ===============================================

    function handleSortBtn(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        currentPage = 0;
        loadUsuarios();
    }

    function updateSortIndicators() {
        if (!btnSortNombre) return;
        btnSortNombre.classList.remove('active');
        const arrow = btnSortNombre.querySelector('.sort-arrow');
        if (arrow) arrow.className = 'fas fa-sort sort-arrow';
        
        if (sortField === 'nombre') {
            btnSortNombre.classList.add('active');
            if (arrow) arrow.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} sort-arrow`;
        }
    }


    // ===============================================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================================

    if (userForm) {
        userForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('user');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            // 2. Obtener valores
            const nombre = nombreInput.value.trim();
            const apellido = apellidoInput.value.trim();
            const email = emailInput.value.trim();
            const idRol = rolSelect.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // 3. Validaciones
            let isValid = true;

            // Validación de nombre
            if (!nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('user-nombre', 'El nombre es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('user-nombre'); }

            // Validación de apellido
            if (!apellido) { if(window.mostrarErrorInline) window.mostrarErrorInline('user-apellido', 'El apellido es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('user-apellido'); }

            // Validación de email
            if (!email) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-email', 'El email es obligatorio');
                isValid = false;
            } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-email', 'El formato del email no es válido');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('user-email');
            }

            // Validación de rol
            if (!idRol) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-rol', 'Debe seleccionar un rol');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('user-rol');
            }

            // Validación de contraseña
            if (!password) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-password', 'La contraseña es obligatoria');
                isValid = false;
            } else {
                const hasNumber = /\d/.test(password);
                const isCorrectLength = password.length >= 8;

                if (!isCorrectLength || !hasNumber) {
                    if(window.mostrarErrorInline) window.mostrarErrorInline('user-password', 'La contraseña no cumple los requisitos');
                    isValid = false;
                } else {
                    if(window.limpiarErroresInline) window.limpiarErroresInline('user-password');
                }
            }

            // Validación de confirmación de contraseña
            if (!confirmPassword) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-confirm-password', 'Debe confirmar la contraseña');
                isValid = false;
            } else if (password !== confirmPassword) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('user-confirm-password', 'Las contraseñas no coinciden');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('user-confirm-password');
            }

            if (!isValid) {
                return;
            }

            // 4. Construir DTO
            const usuarioDTO = {
                nombre: nombre,
                apellido: apellido,
                email: email,
                contrasena: password, // Cambiamos 'password' por 'contrasena'
                confirmacionContrasena: confirmPassword, // Agregamos este campo que espera el DTO
                idRol: parseInt(idRol)
            };
            // 5. Confirmar y Enviar
            showConfirmationModal("¿Estás seguro de que deseas registrar este usuario?", async () => {
                try {
                    const response = await fetch(API_USUARIOS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(usuarioDTO)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || `Error: ${response.status}`);
                    }

                    generalMessage.textContent = "¡Usuario registrado con éxito!";
                    generalMessage.classList.add('success');
                    userForm.reset();

                    // Resetear checklist de contraseña
                    ['check-length', 'check-number'].forEach(id => {
                        const li = document.getElementById(id);
                        if (li) li.classList.remove('valid');
                    });

                    // Auto-ocultar mensaje de éxito después de 4 segundos
                    setTimeout(() => {
                        generalMessage.textContent = '';
                        generalMessage.className = 'form-message';
                    }, 4000);

                    currentPage = 0;
                    loadUsuarios();

                } catch (error) {
                    console.error('Error al registrar el usuario:', error);
                    generalMessage.textContent = `${error.message}`;
                    generalMessage.classList.add('error');
                }
            });
        });
    }

    // --- Botón Limpiar Formulario ---
    const btnLimpiarFormUsuario = document.getElementById('limpiar-form-usuario');
    if (btnLimpiarFormUsuario) {
        btnLimpiarFormUsuario.addEventListener('click', function () {
            if (userForm) userForm.reset();
            // Limpiar mensajes de error
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('user');
            if (generalMessage) {
                generalMessage.textContent = '';
                generalMessage.className = 'form-message';
            }
            // Resetear checklist de contraseña
            ['check-length', 'check-number'].forEach(id => {
                const li = document.getElementById(id);
                if (li) {
                    li.classList.remove('valid');
                    li.querySelector('i').className = 'fas fa-circle';
                }
            });
        });
    }

    // --- Validación de email duplicado en tiempo real ---
    if (emailInput) {
        emailInput.addEventListener('blur', async function () {
            const email = emailInput.value.trim();
            const errorEl = document.getElementById('error-user-email');
            if (!errorEl) return;

            // Solo validar si el email tiene formato válido
            if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return;

            try {
                const response = await fetch(`${API_USUARIOS_URL}/check-email?email=${encodeURIComponent(email)}`);
                if (response.ok) {
                    const existe = await response.json();
                    if (existe) {
                        errorEl.textContent = 'Ya existe un usuario con este correo';
                    } else {
                        errorEl.textContent = '';
                    }
                }
            } catch (error) {
                console.error('Error al verificar email:', error);
            }
        });
    }

    // --- Checklist de contraseña en tiempo real ---
    if (passwordInput) {
        const checkLength = document.getElementById('check-length');
        const checkNumber = document.getElementById('check-number');

        passwordInput.addEventListener('input', function () {
            const val = this.value;

            // Longitud mínima
            if (val.length >= 8) {
                checkLength.classList.add('valid');
                checkLength.querySelector('i').className = 'fas fa-check-circle';
            } else {
                checkLength.classList.remove('valid');
                checkLength.querySelector('i').className = 'fas fa-circle';
            }

            // Al menos un número
            if (/\d/.test(val)) {
                checkNumber.classList.add('valid');
                checkNumber.querySelector('i').className = 'fas fa-check-circle';
            } else {
                checkNumber.classList.remove('valid');
                checkNumber.querySelector('i').className = 'fas fa-circle';
            }
        });
    }

    // --- Mostrar/Ocultar Contraseña ---
    document.querySelectorAll('#user-form .password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.innerHTML = type === 'password'
                ? '<i class="fas fa-eye"></i>'
                : '<i class="fas fa-eye-slash"></i>';
        });
    });

    // ==========================================================
    // LÓGICA DEL MODAL DE EDICIÓN
    // ==========================================================

    const handleEditEsc = (e) => { if (e.key === 'Escape') closeEditModal(); };
    const handleDeleteEsc = (e) => { if (e.key === 'Escape') closeDeleteModal(); };

    // --- Abrir el modal ---
    function openEditModal(user) {
        // Popular datos en el form
        editIdInput.value = user.id;
        editNombreInput.value = user.nombre;
        editApellidoInput.value = user.apellido;
        editEmailInput.value = user.email;

        // Populate Premium Header
        const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Desconocido';
        const inicial = user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U';
        const avatarEl = document.getElementById('edit-usuario-avatar');
        const badgeNombreEl = document.getElementById('edit-usuario-badge-nombre');
        
        if (avatarEl) avatarEl.textContent = inicial;
        if (badgeNombreEl) badgeNombreEl.textContent = nombreCompleto;

        // Seleccionar el rol correcto
        editRolSelect.innerHTML = '';
        const rolesOrdenadosEdit = [...allRoles].sort((a, b) =>
            a.descripcion.localeCompare(b.descripcion)
        );
        rolesOrdenadosEdit.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRol;
            const desc = rol.descripcion.toLowerCase();
            option.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);

            if (rol.idRol == user.idRol) {
                option.selected = true;
            }
            editRolSelect.appendChild(option);
        });

        // ¡NUEVO! Mostrar el modal
        // Usamos flex para centrar el modal
        if (modalEdit) {
            modalEdit.style.display = 'flex';
            window.addEventListener('keydown', handleEditEsc); // Agregamos evento
        }
    }

    // --- Cerrar el modal ---
    function closeEditModal() {
        if (modalEdit) {
            modalEdit.style.display = 'none';
            window.removeEventListener('keydown', handleEditEsc); // Quitamos evento
        }

        // Limpiar todos los mensajes de error
        if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('editUsuario');

        // Limpiar mensaje general
        if (editGeneralMessage) {
            editGeneralMessage.textContent = '';
            editGeneralMessage.className = 'form-message';
        }
    }

    // --- Manejar el envío (submit) del formulario de EDICIÓN ---
    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const id = editIdInput.value;
            const dto = {
                nombre: editNombreInput.value.trim(),
                apellido: editApellidoInput.value.trim(),
                email: editEmailInput.value.trim(),
                idRol: parseInt(editRolSelect.value)
            };

            // Limpiar mensajes previos
            if(window.limpiarTodosErroresInline) window.limpiarTodosErroresInline('editUsuario');
            editGeneralMessage.textContent = '';
            editGeneralMessage.className = 'form-message';

            // Validaciones
            let isValid = true;

            if (!dto.nombre) { if(window.mostrarErrorInline) window.mostrarErrorInline('editUsuarioNombre', 'El nombre es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('editUsuarioNombre'); }

            if (!dto.apellido) { if(window.mostrarErrorInline) window.mostrarErrorInline('editUsuarioApellido', 'El apellido es obligatorio'); isValid = false; }
            else { if(window.limpiarErroresInline) window.limpiarErroresInline('editUsuarioApellido'); }

            if (!dto.email) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('editUsuarioEmail', 'El email es obligatorio');
                isValid = false;
            } else if (!dto.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('editUsuarioEmail', 'El formato del email no es válido');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('editUsuarioEmail');
            }

            if (!dto.idRol) {
                if(window.mostrarErrorInline) window.mostrarErrorInline('editUsuarioRol', 'Debe seleccionar un rol');
                isValid = false;
            } else {
                if(window.limpiarErroresInline) window.limpiarErroresInline('editUsuarioRol');
            }

            if (!isValid) {
                return;
            }


            try {
                const response = await fetch(`${API_USUARIOS_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }

                editGeneralMessage.textContent = "Usuario actualizado con éxito.";
                editGeneralMessage.classList.add('success');

                setTimeout(() => {
                    closeEditModal();
                    loadUsuarios(); // Recargar la tabla
                }, 1000);

            } catch (error) {
                console.error('Error al actualizar usuario:', error);
                editGeneralMessage.textContent = error.message;
                editGeneralMessage.classList.add('error');
            }
        });
    }




    // ===============================================
    // LISTENERS DE EVENTOS DE TABLA Y MODALES
    // ===============================================

    // --- Clics en botones de la tabla ---
    if (userTableBody) {
        userTableBody.addEventListener('click', async function (e) {
            const editButton = e.target.closest('.btn-edit-usuario');
            const deleteButton = e.target.closest('.btn-delete-usuario');

            // --- Clic en EDITAR ---
            if (editButton) {
                const id = editButton.dataset.id;
                try {
                    // Hacemos un fetch para obtener los datos más frescos del usuario
                    // (El DTO de la tabla puede no tener el idRol, solo el nombre)
                    const response = await fetch(`${API_USUARIOS_URL}/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el usuario');
                    const userData = await response.json();
                    openEditModal(userData);
                } catch (error) {
                    console.error('Error al abrir el modal de edición:', error);
                    alert('Error: ' + error.message);
                }
            }

            // --- Clic en BORRAR ---
            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const nombre = deleteButton.dataset.nombre;

                // Usar el mismo modal estilizado que productos y proveedores
                const deleteModal = document.getElementById('delete-confirm-modal');
                const deleteModalMessage = document.getElementById('delete-modal-message');
                const cancelBtn = document.getElementById('cancel-delete-btn');
                const confirmBtn = document.getElementById('confirm-delete-btn');

                deleteModalMessage.textContent = `¿Estás seguro de que quieres eliminar al usuario "${nombre}"?`;
                deleteModal.style.display = 'flex';

                const escHandler = (e) => { if (e.key === 'Escape') closeUsuarioDeleteModal(); };
                document.addEventListener('keydown', escHandler);

                function closeUsuarioDeleteModal() {
                    deleteModal.style.display = 'none';
                    cancelBtn.onclick = null;
                    confirmBtn.onclick = null;
                    document.removeEventListener('keydown', escHandler);
                }

                cancelBtn.onclick = closeUsuarioDeleteModal;

                confirmBtn.onclick = async () => {
                    closeUsuarioDeleteModal();
                    try {
                        const response = await fetch(`${API_USUARIOS_URL}/${id}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(errorText || 'No se pudo eliminar el usuario');
                        }
                        loadUsuarios();
                    } catch (error) {
                        alert('Error al eliminar: ' + error.message);
                    }
                };
            }
        });
    }


    if (modalEditCloseBtn) {
        modalEditCloseBtn.addEventListener('click', closeEditModal);
    }

    // Event listener para el botón Cancelar del modal de edición
    const modalEditCancelBtn = document.getElementById('modal-edit-usuario-cancel');
    if (modalEditCancelBtn) {
        modalEditCancelBtn.addEventListener('click', closeEditModal);
    }

    if (modalEdit) {
        modalEdit.addEventListener('click', (e) => {
            if (e.target === modalEdit) closeEditModal();
        });
    }

    // ==========================================================
    // BÚSQUEDA GLOBAL (BACKEND) CON DEBOUNCE
    // ==========================================================
    let searchTimeout = null;

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 0; // Volver a la primera página al buscar
                loadUsuarios();
            }, 300); // Debounce de 300ms
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline('user-search-input');
            }
            if (selectFiltroRol) selectFiltroRol.value = '';
            sortField = 'apellido';
            sortDirection = 'asc';
            currentPage = 0;
            loadUsuarios();
        });
    }

    // ===============================
    // CARGA INICIAL
    // ===============================

    if (btnSortNombre) btnSortNombre.addEventListener('click', () => handleSortBtn('nombre'));
    if (selectFiltroRol) selectFiltroRol.addEventListener('change', () => { currentPage = 0; loadUsuarios(); });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de usuarios
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('usuarios-')) {
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
    window.showUsuariosSubsection = showSubsection;

    loadRoles();
    loadUsuarios();
});