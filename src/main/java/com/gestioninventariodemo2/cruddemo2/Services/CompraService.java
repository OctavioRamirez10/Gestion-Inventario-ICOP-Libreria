package com.gestioninventariodemo2.cruddemo2.Services;

// Importaciones de DTOs
import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.AgregarPagoCompraDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.PagoResponseDTO;

// Importaciones de Modelos (Entidades)
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;

// Importaciones de Repositorios
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Pago;

// Importaciones de Spring y Java
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor // Inyecta los repositorios finales
@Transactional // Aplica transaccionalidad a todos los métodos públicos
public class CompraService {

    // Inyección de dependencias (se hacen automáticamente por
    // @RequiredArgsConstructor)
    private final CompraRepository compraRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;
    private final StockRepository stockRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoProveedorRepository productoProveedorRepository;
    private final CajaService cajaService;
    private final PagoService pagoService;
    private final MetodoPagoService metodoPagoService;

    /**
     * Registra una nueva compra, sus detalles, y actualiza el stock y precios.
     */
    public Compra registrarCompra(CompraRequestDTO dto, org.springframework.security.core.userdetails.UserDetails userDetails) {
        
        // 0. Autenticación y Validación de Caja Abierta
        String userEmail = userDetails.getUsername();
        Usuario usuario = usuarioRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + userEmail));

        if (!cajaService.verificarCajaActiva(usuario.getIdUsuario())) {
            throw new RuntimeException("Debe abrir la caja antes de registrar movimientos.");
        }

        // 1. Crear la entidad Compra
        Compra compra = new Compra();

        // 2. Asignar Proveedor (buscándolo por ID)
        Proveedor proveedor = proveedorRepository.findById(dto.getIdProveedor())
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con ID: " + dto.getIdProveedor()));
        compra.setProveedor(proveedor);

        // 3. Asignar fecha (con la lógica de @JsonFormat o LocalDate.now())
        compra.setFecha(dto.getFecha() != null ? dto.getFecha().atTime(LocalTime.now()) : LocalDateTime.now());

        // 4. Mapear DTOs de Detalle a Entidades de Detalle
        List<DetalleCompra> detallesEntidad = new ArrayList<>();
        double totalCompra = 0.0;

        for (DetalleCompraRequestDTO detalleDto : dto.getDetalleCompras()) {
            DetalleCompra detalle = new DetalleCompra();
            detalle.setCantidad(detalleDto.getCantidad());
            detalle.setPrecioUnitario(detalleDto.getPrecioUnitario());

            // Enlazar el producto (buscándolo por ID)
            Producto producto = productoRepository.findById(detalleDto.getIdProducto())
                    .orElseThrow(
                            () -> new RuntimeException("Producto no encontrado con ID: " + detalleDto.getIdProducto()));
            detalle.setProducto(producto);

            // Enlazar el detalle a la compra 'padre'
            detalle.setCompra(compra);

            // Calcular total
            totalCompra += (detalle.getCantidad() * detalle.getPrecioUnitario());

            detallesEntidad.add(detalle);
        }

        // 5. Asignar el total y la lista de detalles a la compra
        compra.setTotal(totalCompra);
        compra.setFechaVencimientoPago(dto.getFechaVencimientoPago());
        compra.setDetalleCompras(detallesEntidad);

        // 6. Guardar la Compra y sus Detalles (¡Cascade hace la magia!)
        Compra compraGuardada = compraRepository.save(compra);

        // 7. Actualizar Stock y Precio de Venta (¡¡CÓDIGO CORREGIDO!!)
        for (DetalleCompraRequestDTO detalleDto : dto.getDetalleCompras()) {

            // --- 1. BUSCAMOS EL PRODUCTO REAL UNA SOLA VEZ ---
            Producto productoDB = productoRepository.findById(detalleDto.getIdProducto())
                    .orElseThrow(() -> new RuntimeException(
                            "Producto (para stock/precio) no encontrado con ID: " + detalleDto.getIdProducto()));

            // --- 2. Actualizar Precio de Venta ---
            // Solo actualiza si se envió un precio de venta válido
            if (detalleDto.getNuevoPrecioVenta() > 0) {
                productoDB.setPrecio(detalleDto.getNuevoPrecioVenta());
                productoRepository.save(productoDB); // Guarda el precio actualizado en 'Producto'
            }

            // --- 3. Actualizar Stock ---
            // Buscamos el stock usando el producto REAL (productoDB)
            Stock stockDelProducto = stockRepository.findByProducto(productoDB)
                    .orElseThrow(
                            () -> new RuntimeException("Stock no encontrado para producto: " + productoDB.getNombre()));

            int stockNuevo = stockDelProducto.getStockActual() + detalleDto.getCantidad();
            stockDelProducto.setStockActual(stockNuevo);
            stockRepository.save(stockDelProducto); // Guarda el stock actualizado en 'Stock'

            // --- 4. ASOCIACIÓN ORGÁNICA: Vincular Producto y Proveedor + actualizar precio de costo ---
            boolean yaExiste = productoProveedorRepository.existsByProductoIdProductoAndProveedorIdProveedor(
                    productoDB.getIdProducto(), proveedor.getIdProveedor());
            if (!yaExiste) {
                ProductoProveedor nuevaRelacion = ProductoProveedor.builder()
                        .producto(productoDB)
                        .proveedor(proveedor)
                        .precioCosto(detalleDto.getPrecioUnitario())
                        .build();
                productoProveedorRepository.save(nuevaRelacion);
            } else {
                // Actualizar el precio de costo del vínculo existente
                productoProveedorRepository.findByProductoIdProductoAndProveedorIdProveedor(
                        productoDB.getIdProducto(), proveedor.getIdProveedor())
                        .ifPresent(pp -> {
                            pp.setPrecioCosto(detalleDto.getPrecioUnitario());
                            productoProveedorRepository.save(pp);
                        });
            }
        }

        // 8. Registrar el pago de la compra
        registrarPagoCompra(dto, compraGuardada, usuario);

        return compraGuardada; // Devuelve la entidad completa
    }

    /**
     * Registrar los pagos asociados a una compra
     */
    private void registrarPagoCompra(CompraRequestDTO dto, Compra compra, Usuario usuario) {
        if (dto.getPagos() == null || dto.getPagos().isEmpty()) {
            throw new IllegalArgumentException("Debe ingresar al menos un método de pago");
        }

        double totalPagado = 0;
        double totalEfectivoCaja = 0;

        // Validar saldo de efectivo antes de registrar
        for (com.gestioninventariodemo2.cruddemo2.DTO.PagoRequestDTO pagoDto : dto.getPagos()) {
            if (pagoDto.getIdMetodoPago() == null) {
                throw new IllegalArgumentException("Todos los pagos deben tener un método seleccionado");
            }
            var metodoPago = metodoPagoService.obtenerPorId(pagoDto.getIdMetodoPago());
            String mName = metodoPago.getNombre() != null ? metodoPago.getNombre().toLowerCase() : "";
            if (mName.contains("efectivo") && !mName.contains("aporte externo")) {
                totalEfectivoCaja += pagoDto.getImporte() != null ? pagoDto.getImporte().doubleValue() : 0.0;
            }
        }

        if (totalEfectivoCaja > 0) {
            com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO resumen = cajaService.obtenerResumenCaja(usuario.getIdUsuario());
            if (resumen != null && totalEfectivoCaja > resumen.getSaldoEsperado()) {
                throw new RuntimeException("ERROR_FONDOS_INSUFICIENTES: Efectivo en caja insuficiente. Disponible: $" + resumen.getSaldoEsperado());
            }
        }

        for (com.gestioninventariodemo2.cruddemo2.DTO.PagoRequestDTO pagoDto : dto.getPagos()) {
            var metodoPago = metodoPagoService.obtenerPorId(pagoDto.getIdMetodoPago());

            pagoService.registrarPago(
                    compra,
                    metodoPago,
                    pagoDto.getImporte(),
                    pagoDto.getMontoEntregado(),
                    pagoDto.getVuelto(),
                    pagoDto.getTipoTarjeta(),
                    pagoDto.getEstadoPago(),
                    pagoDto.getFechaVencimientoPago(),
                    usuario);
            totalPagado += pagoDto.getImporte().doubleValue();
        }

        // Opcionalmente se podría validar, pero dejaremos flexibilidad.
    }

    /**
     * Agrega un pago diferido a una compra existente (cuando estaba PENDIENTE).
     */
    public void agregarPagoDiferido(Long compraId, AgregarPagoCompraDTO dto, org.springframework.security.core.userdetails.UserDetails userDetails) {
        String userEmail = userDetails.getUsername();
        Usuario usuario = usuarioRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + userEmail));

        if (!cajaService.verificarCajaActiva(usuario.getIdUsuario())) {
            throw new RuntimeException("Debe abrir la caja antes de registrar un pago.");
        }

        Compra compra = compraRepository.findById(compraId)
                .orElseThrow(() -> new RuntimeException("Compra no encontrada con ID: " + compraId));

        var metodoPago = metodoPagoService.obtenerPorId(dto.getIdMetodoPago());

        String mName = metodoPago.getNombre() != null ? metodoPago.getNombre().toLowerCase() : "";
        if (mName.contains("efectivo") && !mName.contains("aporte externo")) {
            com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO resumen = cajaService.obtenerResumenCaja(usuario.getIdUsuario());
            if (resumen != null && dto.getImporte() != null && dto.getImporte().doubleValue() > resumen.getSaldoEsperado()) {
                throw new RuntimeException("ERROR_FONDOS_INSUFICIENTES: Efectivo en caja insuficiente. Disponible: $" + resumen.getSaldoEsperado());
            }
        }
        
        java.time.LocalDateTime fechaP = dto.getFechaPago() != null ? dto.getFechaPago().atTime(java.time.LocalTime.now()) : java.time.LocalDateTime.now();
        // Se registra el pago. El estado del pago se marca como PAGADO ya que es un pago efectivo.
        pagoService.registrarPagoDiferido(
                compra,
                metodoPago,
                dto.getImporte(),
                "PAGADO",
                fechaP,
                usuario);
                
        // Actualizar la fecha de vencimiento si se envió un pago parcial con nueva fecha
        if (dto.getNuevaFechaVencimiento() != null) {
            compra.setFechaVencimientoPago(dto.getNuevaFechaVencimiento());
            compraRepository.save(compra);
        }
    }


    /**
     * Construye dinámicamente los filtros de búsqueda JPA para las compras.
     */
    private Specification<Compra> construirEspecificacion(String search, LocalDate fechaInicio, LocalDate fechaFin, String estadoPago, Long proveedorId) {
        boolean hasSearch = search != null && !search.trim().isEmpty();
        boolean hasDates = fechaInicio != null && fechaFin != null;
        boolean hasEstado = estadoPago != null && !estadoPago.isEmpty();
        boolean hasProveedor = proveedorId != null;

        final LocalDateTime start = hasDates ? fechaInicio.atStartOfDay() : null;
        final LocalDateTime end = hasDates ? fechaFin.atTime(LocalTime.MAX) : null;

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasSearch) {
                String like = "%" + search.toLowerCase() + "%";
                Predicate proveedorMatch = cb.like(cb.lower(root.get("proveedor").get("nombre")), like);
                Join<Compra, DetalleCompra> dc = root.join("detalleCompras", JoinType.LEFT);
                Predicate productoMatch = cb.like(cb.lower(dc.get("producto").get("nombre")), like);
                predicates.add(cb.or(proveedorMatch, productoMatch));
                query.distinct(true);
            }

            if (hasDates) {
                predicates.add(cb.between(root.get("fecha"), start, end));
            }

            if (hasProveedor) {
                predicates.add(cb.equal(root.get("proveedor").get("idProveedor"), proveedorId));
            }

            if (hasEstado) {
                Subquery<Double> sub = query.subquery(Double.class);
                Root<Pago> pagoRoot = sub.from(Pago.class);
                sub.select(cb.coalesce(cb.sum(pagoRoot.<Double>get("importe").as(Double.class)), 0.0))
                        .where(cb.equal(pagoRoot.get("compra"), root));

                Expression<Double> totalPagado = sub.getSelection();
                Expression<Double> umbral = cb.diff(root.<Double>get("total"), 0.05);

                if ("PENDIENTE".equalsIgnoreCase(estadoPago)) {
                    predicates.add(cb.lessThan(totalPagado, umbral));
                } else if ("PAGADO".equalsIgnoreCase(estadoPago)) {
                    predicates.add(cb.greaterThanOrEqualTo(totalPagado, umbral));
                }
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Lista todas las compras registradas con un formato simplificado.
     * Maneja campos de ordenamiento custom (productos, costoUnitario)
     * que requieren queries con JOIN.
     * Soporta búsqueda global y filtro por rango de fechas.
     */
    public Page<CompraResponseDTO> listarTodasLasCompras(Pageable pageable, String customSort,
            String customDirection, String search, LocalDate fechaInicio, LocalDate fechaFin,
            String estadoPago, Long proveedorId) {

        Specification<Compra> spec = construirEspecificacion(search, fechaInicio, fechaFin, estadoPago, proveedorId);

        // Construir Pageable con sort: si es customSort (productos/costoUnitario) lo traducimos a paths JPA
        Pageable finalPageable = pageable;
        if (customSort != null) {
            boolean asc = "asc".equalsIgnoreCase(customDirection);
            Sort.Direction dir = asc ? Sort.Direction.ASC : Sort.Direction.DESC;
            Sort customSortObj = null;
            if ("productos".equals(customSort)) {
                customSortObj = Sort.by(dir, "detalleCompras.producto.nombre");
            } else if ("costoUnitario".equals(customSort)) {
                customSortObj = Sort.by(dir, "detalleCompras.precioUnitario");
            }
            if (customSortObj != null) {
                finalPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), customSortObj);
            }
        }

        Page<Compra> paginaCompras = compraRepository.findAll(spec, finalPageable);
        return paginaCompras.map(this::mapToCompraDTO);
    }

    /**
     * Obtiene una compra específica por su ID.
     */
    public CompraResponseDTO obtenerCompraPorId(Long id) {
        Compra compra = compraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compra no encontrada con ID: " + id));
        return mapToCompraDTO(compra);
    }

    /**
     * Método helper para convertir la Entidad Compra a CompraResponseDTO.
     */

    // 1. Mapear los detalles
    private CompraResponseDTO mapToCompraDTO(Compra compra) {

        // 1. Mapear los detalles
        List<DetalleCompraResponseDTO> detalleDTO = compra.getDetalleCompras().stream()
                .map(detalle -> DetalleCompraResponseDTO.builder()
                        .cantidad(detalle.getCantidad())
                        .nombreProducto(detalle.getProducto().getNombre())
                        .precioUnitario(detalle.getPrecioUnitario()) // <-- ¡LÍNEA AÑADIDA PARA EL COSTO UNITARIO!
                        .build())
                .collect(Collectors.toList());

        // 2. Obtener métodos de pago y estados
        String metodoPagoNombre = "-";
        String estadoPago = "PAGADO";
        double montoPendiente = 0.0;
        LocalDate fechaVencimiento = null;
        LocalDateTime fechaUltimoPago = null;
        List<Pago> pagos = null;
        try {
            pagos = pagoService.obtenerPagosPorCompra(compra.getIdCompra());
            if (pagos != null && !pagos.isEmpty()) {
                // Nombres de todos los métodos separados por barra
                metodoPagoNombre = pagos.stream()
                        .filter(p -> p.getMetodoPago() != null)
                        .map(p -> p.getMetodoPago().getNombre())
                        .distinct()
                        .collect(Collectors.joining(" / "));
                
                // Estado general de la compra en base a dinero ingresado (permite deudas implícitas)
                double dineroTotalDato = pagos.stream()
                        .mapToDouble(p -> p.getImporte() != null ? p.getImporte().doubleValue() : 0.0)
                        .sum();
                
                estadoPago = (dineroTotalDato < compra.getTotal() - 0.05) ? "PENDIENTE" : "PAGADO";
                montoPendiente = Math.max(0.0, compra.getTotal() - dineroTotalDato);
                
                // Extraer el vencimiento principal de la compra (nuevo formato), o de los pagos (modo legacy)
                fechaVencimiento = compra.getFechaVencimientoPago();
                if (fechaVencimiento == null) {
                    fechaVencimiento = pagos.stream()
                            .filter(p -> p.getFechaVencimiento() != null)
                            .map(Pago::getFechaVencimiento)
                            .max(LocalDate::compareTo)
                            .orElse(null);
                }

                // Extraer la fecha del ultimo pago
                fechaUltimoPago = pagos.stream()
                        .filter(p -> p.getFechaPago() != null && "PAGADO".equalsIgnoreCase(p.getEstado()))
                        .map(Pago::getFechaPago)
                        .max(LocalDateTime::compareTo)
                        .orElse(null);
            } else if (compra.getTotal() > 0) {
                // Si hay total a pagar pero no se ingresó ningún pago, la compra debe considerarse como Cta Corriente / Deuda total
                estadoPago = "PENDIENTE";
                montoPendiente = compra.getTotal();
            }
        } catch (Exception e) {
            // Ignorar si no se encuentra
        }

        // 3. Mapear la compra principal
        return CompraResponseDTO.builder()
                .id(compra.getIdCompra())
                .fecha(compra.getFecha())
                .total(compra.getTotal())
                .nombreProveedor(compra.getProveedor().getNombre())
                .metodoPago(metodoPagoNombre)
                .estadoPago(estadoPago)
                .fechaVencimientoPago(fechaVencimiento)
                .fechaUltimoPago(fechaUltimoPago)
                .montoPendiente(montoPendiente)
                .productosComprados(detalleDTO)
                .pagos(pagos != null ? pagos.stream()
                    .map(p -> PagoResponseDTO.builder()
                        .idPago(p.getIdPago())
                        .metodoPago(p.getMetodoPago() != null ? p.getMetodoPago().getNombre() : "N/A")
                        .importe(p.getImporte())
                        .montoEntregado(p.getMontoEntregado())
                        .vuelto(p.getVuelto())
                        .fechaPago(p.getFechaPago())
                        .estado(p.getEstado())
                        .build())
                    .collect(Collectors.toList()) : null)
                .build();

    }

    /**
     * Obtiene compras filtradas para el reporte PDF (sin paginación).
     */
    public List<CompraResponseDTO> obtenerComprasParaPdf(String customSort, String customDirection, String search, LocalDate fechaInicio, LocalDate fechaFin, String estadoPago, Long proveedorId) {
        
        Specification<Compra> spec = construirEspecificacion(search, fechaInicio, fechaFin, estadoPago, proveedorId);

        Sort finalSort = Sort.unsorted();
        if (customSort != null) {
            boolean asc = "asc".equalsIgnoreCase(customDirection);
            Sort.Direction dir = asc ? Sort.Direction.ASC : Sort.Direction.DESC;
            if ("productos".equals(customSort)) {
                finalSort = Sort.by(dir, "detalleCompras.producto.nombre");
            } else if ("costoUnitario".equals(customSort)) {
                finalSort = Sort.by(dir, "detalleCompras.precioUnitario");
            } else {
                finalSort = Sort.by(dir, customSort);
            }
        } else {
             // Por defecto ordenamos por fecha desc
             finalSort = Sort.by(Sort.Direction.DESC, "fecha"); 
        }

        List<Compra> compras = compraRepository.findAll(spec, finalSort);
        return compras.stream().map(this::mapToCompraDTO).collect(Collectors.toList());
    }
}