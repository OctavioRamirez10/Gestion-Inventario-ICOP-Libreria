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
checkSession('EMPLEADO');

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
        'ventas': 'fas fa-shopping-cart',
        'caja': 'fas fa-cash-register',
        'productos': 'fas fa-box',
        'clientes': 'fas fa-address-book'
    };

    let currentSectionId = 'principal';
    let currentSubsectionId = null;
    let cajaEstaAbierta = false;

    window.isCajaAbierta = () => cajaEstaAbierta;

    async function checkCajaEstado() {
        try {
            const res = await fetch('/api/caja/estado/0');
            if (res.ok) {
                const data = await res.json();
                cajaEstaAbierta = data.abierta;
            }
        } catch (e) {
            console.error("Error al verificar estado de la caja:", e);
        }
    }
    checkCajaEstado();

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
        link.addEventListener('click', async function (e) {

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

            if (sectionId === 'ventas') {
                const targetSubsection = subsectionId || localStorage.getItem('lastSubsectionEmpleado') || 'ventas-create';

                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(targetSubsection);
                }
                if (subsectionId) localStorage.setItem('lastSubsectionEmpleado', subsectionId);
                if (typeof window.cargarDatosVentas === 'function') window.cargarDatosVentas();
            }

            if (sectionId === 'caja') {
                if (typeof window.showCajaSubsection === 'function') {
                    window.showCajaSubsection('caja-operaciones');
                }
            }

            if (sectionId === 'productos') {
                if (typeof window.showProductSubsection === 'function') {
                    window.showProductSubsection('productos-list');
                } else {
                    if (typeof window.filtrarPorEstado === 'function') {
                        window.filtrarPorEstado('todos');
                    } else if (typeof window.loadProducts === 'function') {
                        window.loadProducts();
                    }
                }
            }

            if (sectionId === 'clientes') {
                const targetSubsection = subsectionId || 'clientes-list';
                if (typeof window.showClientesSubsection === 'function') {
                    window.showClientesSubsection(targetSubsection);
                }
            }

            if (sectionId === 'principal') {
                if (typeof window.loadPrincipalData === 'function') window.loadPrincipalData();
            }

            localStorage.setItem('lastSectionEmpleado', sectionId);
        });
    });

    // Inicialización: mostrar principal y marcar su link como activo
    showSection('principal');
    const principalLink = document.querySelector('.sidebar-menu a[data-section="principal"]');
    if (principalLink) principalLink.classList.add('active');

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

            // Limpiar sesión
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem('lastSectionEmpleado');
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