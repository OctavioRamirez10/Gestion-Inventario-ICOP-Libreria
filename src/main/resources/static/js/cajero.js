// Validación de sesión robusta contra el backend
async function checkSession(requiredRole) {
    try {
        const response = await fetch('/api/auth/perfil');
        if (!response.ok) throw new Error('No autenticado');
        const data = await response.json();
        if (data.rol !== requiredRole) throw new Error('Rol incorrecto');
    } catch (error) {
        localStorage.removeItem('isAuthenticated');
        window.location.replace('index.html');
    }
}
checkSession('CAJERO');

if (localStorage.getItem('isAuthenticated') !== 'true') {
    window.location.replace('index.html');
}

document.addEventListener('DOMContentLoaded', function () {
    // Selectores
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('.spa-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionIcon = document.getElementById('section-icon');

    // Mapa de sección → ícono
    const sectionIcons = {
        'principal': 'fas fa-home',
        'caja': 'fas fa-cash-register',
        
    };

    let currentSectionId = 'principal';
    let currentSubsectionId = null;

    function clearSection(sectionId) {
        const section = document.getElementById(`${sectionId}-section`);
        if (!section) return;
        section.querySelectorAll('form').forEach(f => f.reset());
        section.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        section.querySelectorAll('.form-message').forEach(el => {
            el.textContent = '';
            el.className = 'form-message';
        });
    }

    // Mostrar sección y ocultar las demás
    function showSection(sectionId) {
        sections.forEach(s => s.style.display = 'none');
        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) activeSection.style.display = 'block';
        if (sectionIcon && sectionIcons[sectionId]) {
            sectionIcon.className = sectionIcons[sectionId];
        }
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {

            // Submenú Toggle: solo abre/cierra, no navega
            if (this.classList.contains('submenu-toggle')) {
                e.preventDefault();
                this.parentElement.classList.toggle('open');
                return;
            }

            // Logout tiene su propio handler
            if (this.id === 'logout-btn') return;

            e.preventDefault();

            // Cerrar submenús que no contienen el link clickeado
            document.querySelectorAll('.sidebar-menu li.open').forEach(openLi => {
                if (!openLi.contains(this)) openLi.classList.remove('open');
            });

            // Limpiar formularios al cambiar de sección o subsección
            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');
            if (sectionId !== currentSectionId || subsectionId !== currentSubsectionId) {
                clearSection(currentSectionId);
                currentSectionId = sectionId;
                currentSubsectionId = subsectionId;
            }

            // Marcar activo: quitar de todos y poner en el clickeado
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            showSection(sectionId);

            // Actualizar título del header con el texto del link
            if (sectionTitle) sectionTitle.textContent = this.textContent.trim();



            if (sectionId === 'caja') {
                if (typeof window.showCajaSubsection === 'function') {
                    window.showCajaSubsection('caja-operaciones');
                }
            }

            localStorage.setItem('lastSectionCajero', sectionId);
        });
    });

    // Inicialización: abrir sección Caja directamente
    setTimeout(() => {
        const cajaLink = document.querySelector('.sidebar-menu a[data-section="caja"]');
        if (cajaLink) cajaLink.click();
    }, 500);

    // =========================================
    // USER INFO Y SIDEBAR TOGGLE
    // =========================================
    async function loadUserInfo() {
        const userNameEl = document.getElementById('header-user-name');
        const userRoleEl = document.getElementById('header-user-role');
        if (!userNameEl || !userRoleEl) return;
        try {
            const response = await fetch('/api/auth/perfil');
            if (response.status === 401) { window.location.href = 'index.html'; return; }
            if (!response.ok) throw new Error('Error al cargar perfil');
            const perfil = await response.json();
            userNameEl.textContent = perfil.nombreCompleto;
            userRoleEl.textContent = perfil.rol;
        } catch (error) {
            console.error(error);
        }
    }
    loadUserInfo();

    const sidebar = document.querySelector('.sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    if (localStorage.getItem('sidebarCollapsed') === 'true' && sidebar) {
        sidebar.classList.add('collapsed');
    }
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed') ? 'true' : 'false');
        });
    }
    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                localStorage.setItem('sidebarCollapsed', 'false');
            }
        });
    });

    // =========================================
    // LOGOUT
    // =========================================
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });

        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });

        confirmLogoutBtn.addEventListener('click', () => {
            // Si no está abierta o la validación pasó, cerrar sesión
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem('lastSectionCajero');
            localStorage.removeItem('isAuthenticated');
            window.location.href = 'index.html';
        });

        // Cerrar al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Cargar fecha actual en ventas al iniciar
    const fechaInput = document.getElementById('fecha-venta');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    // =========================================
    // MODAL DE CONFIRMACIÓN
    // =========================================
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationMessage = document.getElementById('confirmation-message');
    const btnConfirmYes = document.getElementById('btn-confirm-yes');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const closeConfirmModal = document.getElementById('btn-confirm-close');

    let pendingConfirmAction = null;
    let pendingCancelAction = null;

    window.showConfirmationModal = function (message, onConfirm, onCancel) {
        if (!confirmationModal) return;
        if (confirmationMessage) confirmationMessage.textContent = message;
        pendingConfirmAction = onConfirm || null;
        pendingCancelAction = onCancel || null;
        confirmationModal.style.display = 'flex';
    };

    function closeConfirmationModal() {
        if (confirmationModal) confirmationModal.style.display = 'none';
        pendingConfirmAction = null;
        pendingCancelAction = null;
    }

    if (btnConfirmYes) {
        btnConfirmYes.addEventListener('click', () => {
            if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
            closeConfirmationModal();
        });
    }

    if (btnConfirmCancel) {
        btnConfirmCancel.addEventListener('click', () => {
            if (typeof pendingCancelAction === 'function') pendingCancelAction();
            closeConfirmationModal();
        });
    }

    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', () => {
            if (typeof pendingCancelAction === 'function') pendingCancelAction();
            closeConfirmationModal();
        });
    }

    // Cerrar al hacer clic fuera del modal
    if (confirmationModal) {
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                if (typeof pendingCancelAction === 'function') pendingCancelAction();
                closeConfirmationModal();
            }
        });
    }
});