// informes.js - Dashboard de Informes (Rediseñado)
document.addEventListener('DOMContentLoaded', () => {
    const informesSection = document.getElementById('informes-section');
    if (!informesSection) return;

    // Variable global para el gráfico
    let ventasComprasChart = null;

    // Fechas por defecto: mes actual
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Formatear fecha para inputs (YYYY-MM-DD)
    const formatFechaInput = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Formatear fecha para mostrar (DD/MM/YYYY)
    const formatFechaDisplay = (fechaStr) => {
        const fecha = new Date(fechaStr + 'T00:00:00');
        const day = String(fecha.getDate()).padStart(2, '0');
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const year = fecha.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Formatear números con separador de miles
    const formatNumber = (num) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Elementos del DOM
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const buscarBtn = document.getElementById('buscar-filtros');
    const limpiarBtn = document.getElementById('limpiar-filtros');
    const periodoTexto = document.getElementById('periodo-texto');


    // Inicializar fechas por defecto
    fechaInicioInput.value = formatFechaInput(primerDiaMes);
    fechaFinInput.value = formatFechaInput(hoy);

    // Función para mostrar errores de validación
    const mostrarErrorFecha = (mensaje) => {
        const errorContainer = document.getElementById('fecha-error-message');
        const errorText = document.getElementById('fecha-error-text');
        if (errorContainer && errorText) {
            errorText.textContent = mensaje;
            errorContainer.style.display = 'block';
        }
    };

    // Función para ocultar errores
    const ocultarErrorFecha = () => {
        const errorContainer = document.getElementById('fecha-error-message');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    };

    // Función para validar fechas
    const validarFechas = (inicio, fin) => {
        if (!inicio || !fin) {
            mostrarErrorFecha('Por favor selecciona un rango de fechas válido');
            return false;
        }

        const fechaInicio = new Date(inicio);
        const fechaFin = new Date(fin);

        if (fechaInicio > fechaFin) {
            mostrarErrorFecha('La fecha de inicio no puede ser posterior a la fecha de fin');
            return false;
        }

        ocultarErrorFecha();
        return true;
    };



    // Cargar datos al entrar a la sección
    const cargarDashboard = async () => {
        const inicio = fechaInicioInput.value;
        const fin = fechaFinInput.value;

        if (!validarFechas(inicio, fin)) {
            return;
        }

        // Actualizar texto del período
        periodoTexto.textContent = `Mostrando datos del ${formatFechaDisplay(inicio)} al ${formatFechaDisplay(fin)}`;

        try {
            // Cargar todos los datos en paralelo
            await Promise.all([
                cargarKPIs(inicio, fin),
                cargarGraficoVentasCompras(inicio, fin),
                cargarTopProductos(inicio, fin),
                cargarTopProveedores(inicio, fin)
            ]);
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        }
    };

    // 1. Cargar KPIs (3 tarjetas: Valor Inventario, Ganancia Proyectada, Ventas del Período)
    const cargarKPIs = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/kpis?inicio=${inicio}&fin=${fin}`);
            if (!response.ok) throw new Error('Error al obtener KPIs');

            const data = await response.json();

            // Valor del Inventario
            document.getElementById('kpi-valor-inventario').textContent = `$${formatNumber(data.valorInventario || 0)}`;

            // Ganancia Proyectada
            const gananciaProyEl = document.getElementById('kpi-ganancia-proyectada');
            gananciaProyEl.textContent = `$${formatNumber(data.gananciaProyectada || 0)}`;
            if (data.gananciaProyectada >= 0) {
                gananciaProyEl.style.color = '#28a745';
            } else {
                gananciaProyEl.style.color = '#dc3545';
            }

            // Ganancia Real
            const gananciaRealEl = document.getElementById('kpi-ganancia-real');
            if (gananciaRealEl) {
                gananciaRealEl.textContent = `$${formatNumber(data.gananciaReal || 0)}`;
                if (data.gananciaReal >= 0) {
                    gananciaRealEl.style.color = '#10b981';
                } else {
                    gananciaRealEl.style.color = '#dc3545';
                }
            }

            // Ventas del Período
            document.getElementById('kpi-ventas-periodo').textContent = `$${formatNumber(data.totalVentas || 0)}`;

        } catch (error) {
            console.error('Error al cargar KPIs:', error);
        }
    };

    // 2. Cargar Gráfico de Líneas (Ventas vs Compras)
    const cargarGraficoVentasCompras = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/ventas-compras-diarias?inicio=${inicio}&fin=${fin}`);
            if (!response.ok) throw new Error('Error al obtener datos de ventas/compras');

            const data = await response.json();

            const labels = data.map(item => formatFechaDisplay(item.fecha));
            const ventasData = data.map(item => item.ventas || 0);
            const comprasData = data.map(item => item.compras || 0);

            if (ventasComprasChart) {
                ventasComprasChart.destroy();
            }

            const maxValor = Math.max(...ventasData, ...comprasData, 0);
            const chartSuggestedMax = maxValor > 0 ? maxValor * 1.05 : 1000;

            const isSingleDay = data.length === 1;

            const ctx = document.getElementById('ventas-compras-chart').getContext('2d');
            ventasComprasChart = new Chart(ctx, {
                type: isSingleDay ? 'bar' : 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas',
                            data: ventasData,
                            borderColor: '#28a745',
                            backgroundColor: isSingleDay ? 'rgba(40, 167, 69, 0.6)' : 'rgba(40, 167, 69, 0.1)',
                            borderWidth: isSingleDay ? 1 : 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: isSingleDay ? 0 : 4,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#28a745'
                        },
                        {
                            label: 'Compras',
                            data: comprasData,
                            borderColor: '#dc3545',
                            backgroundColor: isSingleDay ? 'rgba(220, 53, 69, 0.6)' : 'rgba(220, 53, 69, 0.1)',
                            borderWidth: isSingleDay ? 1 : 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: isSingleDay ? 0 : 4,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#dc3545'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 3.5,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': $' + formatNumber(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: chartSuggestedMax,
                            grid: {
                                color: '#f1f3f5',
                                drawBorder: false,
                            },
                            ticks: {
                                maxTicksLimit: 8,
                                callback: function (value) {
                                    return '$' + formatNumber(value);
                                }
                            }
                        },
                        x: {
                            offset: true,
                            grid: {
                                display: true,
                                color: '#f8f9fa',
                                drawBorder: false,
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error al cargar gráfico de ventas/compras:', error);
        }
    };

    // 3. Cargar Top 5 Productos Más Vendidos
    const cargarTopProductos = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/top-productos?inicio=${inicio}&fin=${fin}&limit=5`);
            if (!response.ok) throw new Error('Error al obtener top productos');

            const data = await response.json();
            const tbody = document.getElementById('top-productos-body');

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                            No hay datos para este período
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = data.map((producto, index) => `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${producto.nombreProducto}</td>
                    <td>${producto.cantidad}</td>
                    <td>$${formatNumber(producto.totalVentas)}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error al cargar top productos:', error);
            document.getElementById('top-productos-body').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">
                        Error al cargar datos
                    </td>
                </tr>
            `;
        }
    };



    // 5. Cargar Top 5 Proveedores
    const cargarTopProveedores = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/top-proveedores?inicio=${inicio}&fin=${fin}&limit=5`);
            if (!response.ok) throw new Error('Error al obtener top proveedores');

            const data = await response.json();
            const tbody = document.getElementById('top-proveedores-body');

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                            No hay datos para este período
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = data.map((proveedor, index) => `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${proveedor.nombreProveedor}</td>
                    <td>${proveedor.cantidadCompras}</td>
                    <td>$${formatNumber(proveedor.totalComprado)}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error al cargar top proveedores:', error);
            document.getElementById('top-proveedores-body').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">
                        Error al cargar datos
                    </td>
                </tr>
            `;
        }
    };

    // Event Listeners
    buscarBtn.addEventListener('click', () => {
        cargarDashboard();
    });

    limpiarBtn.addEventListener('click', () => {
        fechaInicioInput.value = formatFechaInput(primerDiaMes);
        fechaFinInput.value = formatFechaInput(hoy);
        cargarDashboard();
    });

    // Event Listener para Exportar PDF
    const exportarPdfBtn = document.getElementById('exportar-pdf');
    if (exportarPdfBtn) {
        exportarPdfBtn.addEventListener('click', async () => {
            const inicio = fechaInicioInput.value;
            const fin = fechaFinInput.value;

            if (!validarFechas(inicio, fin)) {
                return;
            }

            try {
                exportarPdfBtn.disabled = true;
                exportarPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

                const response = await fetch(`/api/informes/exportar-pdf?inicio=${inicio}&fin=${fin}`);

                if (!response.ok) {
                    throw new Error('Error al generar el PDF');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Informe_Completo_${inicio}_${fin}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

            } catch (error) {
                console.error('Error al exportar PDF:', error);
                alert('❌ Error al generar el PDF. Por favor intenta nuevamente.');
            } finally {
                exportarPdfBtn.disabled = false;
                exportarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar PDF';
            }
        });
    }

    // Cargar dashboard automáticamente cuando se muestra la sección
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const displayStyle = window.getComputedStyle(informesSection).display;
                if (displayStyle !== 'none') {
                    cargarDashboard();
                }
            }
        });
    });

    observer.observe(informesSection, {
        attributes: true,
        attributeFilter: ['style']
    });

    // Cargar datos iniciales si la sección ya está visible
    if (window.getComputedStyle(informesSection).display !== 'none') {
        cargarDashboard();
    }
});