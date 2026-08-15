document.addEventListener('DOMContentLoaded', function () {

    const API_KPI_URL = '/api/informes/kpis';
    const API_AGOTADOS_URL = '/api/informes/agotados';
    const API_STOCK_RESUMEN_URL = '/api/informes/resumen-stock';

    const dashboardFecha = document.getElementById('dashboard-fecha');
    const btnRefreshDashboard = document.getElementById('btn-refresh-dashboard');
    const kpiTusVentas = document.getElementById('kpi-tus-ventas');

    let currentUserId = null;
    const kpiStockBajo = document.getElementById('kpi-stock-bajo');
    const kpiAgotados = document.getElementById('kpi-agotados');

    function formatDateForApi(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function calculateChange(current, previous) {
        if (!previous || previous === 0) return { value: 0, direction: 'neutral' };
        const change = ((current - previous) / previous) * 100;
        return { value: Math.abs(change).toFixed(1), direction: change >= 0 ? 'up' : 'down' };
    }

    function renderCompare(elementId, change) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (change.direction === 'neutral') {
            el.innerHTML = '<span style="color: #999;">-</span>';
        } else if (change.direction === 'up') {
            el.innerHTML = `<span style="color: #28a745;"><i class="fas fa-caret-up"></i> ${change.value}%</span> vs. ayer`;
        } else {
            el.innerHTML = `<span style="color: #dc3545;"><i class="fas fa-caret-down"></i> ${change.value}%</span> vs. ayer`;
        }
    }

    async function loadDashboardKPIs() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const fechaHoy = formatDateForApi(today);
        const fechaAyer = formatDateForApi(yesterday);

        if (dashboardFecha) {
            const fechaFormateada = today.toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
            dashboardFecha.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        }

        try {
            const [resHoy, resAyer, resAgotados, resStock] = await Promise.all([
                fetch(`${API_KPI_URL}?inicio=${fechaHoy}&fin=${fechaHoy}`),
                fetch(`${API_KPI_URL}?inicio=${fechaAyer}&fin=${fechaAyer}`),
                fetch(`${API_AGOTADOS_URL}?page=0&size=1`),
                fetch(API_STOCK_RESUMEN_URL)
            ]);

            const dataHoy = resHoy.ok ? await resHoy.json() : { totalVentas: 0, totalCompras: 0 };
            const dataAyer = resAyer.ok ? await resAyer.json() : { totalVentas: 0, totalCompras: 0 };
            const agotadosData = resAgotados.ok ? await resAgotados.json() : { totalElements: 0 };
            const stockData = resStock.ok ? await resStock.json() : { productosBajoStock: 0 };

            let countVentasHoy = 0;
            if (currentUserId) {
                try {
                    const resVentas = await fetch(`/api/ventas?inicio=${fechaHoy}&fin=${fechaHoy}&vendedorId=${currentUserId}&size=1`);
                    if (resVentas.ok) {
                        const dataVentas = await resVentas.json();
                        countVentasHoy = dataVentas.totalElements || 0;
                    }
                } catch (e) { console.error('Error obteniendo tus ventas', e); }
            }

            if (kpiTusVentas) kpiTusVentas.textContent = countVentasHoy;
            if (kpiStockBajo) kpiStockBajo.textContent = stockData.productosBajoStock || 0;
            if (kpiAgotados) kpiAgotados.textContent = agotadosData.totalElements || 0;

        } catch (error) {
            console.error('Error cargando KPIs:', error);
        }
    }

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
            currentUserId = perfil.idUsuario;
        } catch (error) {
            console.error(error);
        }
    }

    // Sidebar colapsable
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

    // Botón refresh
    if (btnRefreshDashboard) {
        btnRefreshDashboard.addEventListener('click', async () => {
            const icon = btnRefreshDashboard.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            await loadDashboardKPIs();
            if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
        });
    }

    document.addEventListener('ventaRegistrada', loadDashboardKPIs);

    // Navegación desde KPI cards (onclick en HTML llama a esta función global)
    window.navigateToStockManagement = function (estado) {
        document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
        const productosLink = document.querySelector('[data-section="productos"]');
        if (productosLink) productosLink.classList.add('active');

        const sectionTitle = document.getElementById('section-title');
        const sectionIcon = document.getElementById('section-icon');
        if (sectionTitle) sectionTitle.textContent = 'Gestión de Stock';
        if (sectionIcon) sectionIcon.className = 'fas fa-box';

        document.querySelectorAll('.spa-section').forEach(s => s.style.display = 'none');
        const productosSection = document.getElementById('productos-section');
        if (productosSection) productosSection.style.display = 'block';

        if (estado && typeof window.filtrarPorEstado === 'function') {
            window.filtrarPorEstado(estado);
        } else if (typeof window.loadProducts === 'function') {
            window.loadProducts();
        }
    };

    window.loadPrincipalData = async function () {
        await loadDashboardKPIs();
    };

    async function init() {
        await loadUserInfo();
        await loadDashboardKPIs();
    }

    init();
});
