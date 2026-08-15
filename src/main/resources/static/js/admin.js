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
checkSession('ADMINISTRADOR');

if (localStorage.getItem('isAuthenticated') !== 'true') {
    window.location.replace('index.html');
}

document.addEventListener('DOMContentLoaded', function () {

    // Selectores
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('.spa-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionIcon = document.getElementById('section-icon');
    const subsectionTitle = document.getElementById('subsection-title');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    const sectionIcons = {
        'principal': 'fas fa-home',
        'productos': 'fas fa-box',
        'proveedores': 'fas fa-user',
        'compras': 'fas fa-shopping-bag',
        'usuarios': 'fas fa-users',
        'ventas': 'fas fa-shopping-cart',
        'informes': 'fas fa-chart-bar',
        'caja': 'fas fa-cash-register'
    };

    function updateHeaderIcon(sectionId) {
        if (sectionIcon && sectionIcons[sectionId]) {
            sectionIcon.className = sectionIcons[sectionId];
        }
    }

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

    // Función para mostrar una sección y ocultar las demás
    function showSection(sectionId) {
        sections.forEach(section => {
            section.style.display = 'none';
        });

        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) {
            activeSection.style.display = 'block';
        }

        // Título se actualiza directamente desde el event listener del link
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {

            // Lógica para Submenú Toggle
            if (this.classList.contains('submenu-toggle')) {
                e.preventDefault();
                const parentLi = this.parentElement;
                parentLi.classList.toggle('open');
                return; // No navegar, solo abrir/cerrar
            }

            // Si es el botón de logout, no hacer nada aquí (tiene su propio handler)
            if (this.id === 'logout-btn') {
                return;
            }

            e.preventDefault();

            // Cerrar submenús que no contienen el link clickeado
            document.querySelectorAll('.sidebar-menu li.open').forEach(openLi => {
                if (!openLi.contains(this)) openLi.classList.remove('open');
            });

            // Remover active de todos los links (incluyendo submenús)
            document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');

            // Limpiar formularios al cambiar de sección o subsección
            if (sectionId !== currentSectionId || subsectionId !== currentSubsectionId) {
                clearSection(currentSectionId);
                currentSectionId = sectionId;
                currentSubsectionId = subsectionId;
            }

            showSection(sectionId);

            // Actualizar AMBOS títulos basándose en el texto del link clickeado
            const linkText = this.textContent.trim();
            sectionTitle.textContent = linkText;
            if (subsectionTitle) {
                subsectionTitle.textContent = linkText;
            }

            // Actualizar ícono del header con el de la sección
            updateHeaderIcon(sectionId);

            // Manejo de Subsecciones (Productos)
            if (sectionId === 'productos' && subsectionId) {
                if (typeof window.showProductSubsection === 'function') {
                    window.showProductSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Proveedores)
            else if (sectionId === 'proveedores' && subsectionId) {
                if (typeof window.showProveedorSubsection === 'function') {
                    window.showProveedorSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Compras)
            else if (sectionId === 'compras' && subsectionId) {
                if (typeof window.showComprasSubsection === 'function') {
                    window.showComprasSubsection(subsectionId);
                }
                if (subsectionId === 'compras-orden' && typeof window.setFechaActualOC === 'function') {
                    window.setFechaActualOC();
                }
            }
            // Manejo de Subsecciones (Usuarios)
            else if (sectionId === 'usuarios' && subsectionId) {
                if (typeof window.showUsuariosSubsection === 'function') {
                    window.showUsuariosSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Ventas)
            else if (sectionId === 'ventas' && subsectionId) {
                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Categorías)
            else if (sectionId === 'categorias' && subsectionId) {
                if (typeof window.showCategoriaSubsection === 'function') {
                    window.showCategoriaSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Clientes)
            else if (sectionId === 'clientes' && subsectionId) {
                if (typeof window.showClientesSubsection === 'function') {
                    window.showClientesSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Caja)
            else if (sectionId === 'caja' && subsectionId) {
                if (typeof window.showCajaSubsection === 'function') {
                    window.showCajaSubsection(subsectionId);
                }
            }

            // ACTUALIZACIÓN: Agregar los casos que faltan
            if (sectionId === 'principal' && typeof window.loadPrincipalData === 'function') {
                window.loadPrincipalData();
            } else if (sectionId === 'productos' && typeof window.loadProducts === 'function') {
                if (typeof window.filtrarPorEstado === 'function') {
                    window.filtrarPorEstado('todos');
                } else {
                    window.loadProducts();
                }
            }
            // AGREGA ESTO:
            else if (sectionId === 'ventas' && typeof window.cargarDatosVentas === 'function') {
                // Asumo que en ventas.js tienes una función para cargar los selects
                window.cargarDatosVentas();
            }
            else if (sectionId === 'proveedores' && typeof window.cargarDatosProveedores === 'function') {
                window.cargarDatosProveedores();
            }
            else if (sectionId === 'compras' && typeof window.cargarDatosCompras === 'function') {
                window.cargarDatosCompras();
            }
            else if (sectionId === 'stock' && typeof window.cargarDatosStock === 'function') {
                window.cargarDatosStock();
            }
            else if (sectionId === 'caja' && typeof window.cargarDatosCaja === 'function') {
                window.cargarDatosCaja();
            }
            // Repite para compras, stock, etc.
        });
    });

    // Lógica de Logout
    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });

        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });

        confirmLogoutBtn.addEventListener('click', () => {

            // Borrar cookie de sesión (token JWT)
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem('isAuthenticated');
            window.location.href = 'index.html';
        });

        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Inicialización: Mostrar la sección principal y cargar sus datos
    showSection('principal');
    if (typeof window.loadPrincipalData === 'function') {
        window.loadPrincipalData();
    }



});
