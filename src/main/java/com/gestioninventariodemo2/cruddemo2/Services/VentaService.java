package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.gestioninventariodemo2.cruddemo2.Model.Cobro;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;

import com.gestioninventariodemo2.cruddemo2.DTO.CobroItemDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CobroResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleVentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Exception.StockInsuficienteException;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.ClienteRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final ProductoRepository productoRepository;
    private final VentaRepository ventaRepository;
    private final StockRepository stockRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final MetodoPagoService metodoPagoService;
    private final CobroService cobroService;
    private final CajaService cajaService;

    @Transactional
    public VentaResponseDTO registrarVenta(VentaRequestDTO ventaRequestDTO, UserDetails userDetails) {

        // 1. Buscar al Vendedor (Usuario)
        String userEmail = userDetails.getUsername();
        Usuario usuario = usuarioRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("Vendedor no encontrado: " + userEmail));

        // 1.5 Validar que el Vendedor tiene la Caja abierta
        if (!cajaService.verificarCajaActiva(usuario.getIdUsuario())) {
            throw new RuntimeException("Debe abrir la caja antes de registrar movimientos.");
        }

        // 2. Validar que el ID del cliente fue enviado
        if (ventaRequestDTO.getIdCliente() == null) {
            throw new IllegalArgumentException("Debe seleccionar un cliente");
        }

        // 3. Buscar el cliente en la BD
        Cliente cliente = clienteRepository.findById(ventaRequestDTO.getIdCliente())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Cliente no encontrado con ID: " + ventaRequestDTO.getIdCliente()));

        // 4. Crear la Venta y asignar los participantes
        Venta venta = new Venta();
        venta.setFecha(ventaRequestDTO.getFecha() != null ? ventaRequestDTO.getFecha().atTime(LocalTime.now()) : java.time.LocalDateTime.now());
        venta.setCliente(cliente);
        venta.setUsuario(usuario); // <-- ¡Guardamos al vendedor!

        double subtotal = 0;
        List<DetalleVenta> detalles = new ArrayList<>();

        // 5. Validar stock ANTES de procesar
        for (DetalleVentaRequestDTO detalleDTO : ventaRequestDTO.getDetalles()) {
            Stock stock = stockRepository.findByProductoIdProducto(detalleDTO.getProductoId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Stock no encontrado para producto ID: " + detalleDTO.getProductoId()));

            if (stock.getStockActual() < detalleDTO.getCantidad()) {
                throw new StockInsuficienteException("Stock insuficiente para: " + stock.getProducto().getNombre()
                        + ". Stock actual: " + stock.getStockActual());
            }
        }

        // 6. Procesar la venta y descontar stock
        for (DetalleVentaRequestDTO detalleDTO : ventaRequestDTO.getDetalles()) {
            Producto producto = productoRepository.findById(detalleDTO.getProductoId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Producto no encontrado con ID: " + detalleDTO.getProductoId()));

            DetalleVenta detalleVenta = new DetalleVenta();
            detalleVenta.setProducto(producto);
            detalleVenta.setCantidad(detalleDTO.getCantidad());

            // Usar el precio enviado desde el frontend (admin puede editarlo),
            // si no viene (null o 0), usar el precio actual del producto
            double precioUsado = (detalleDTO.getPrecioUnitario() != null && detalleDTO.getPrecioUnitario() > 0)
                    ? detalleDTO.getPrecioUnitario()
                    : producto.getPrecio();

            detalleVenta.setPrecioUnitario(precioUsado);
            detalleVenta.setVenta(venta);

            detalles.add(detalleVenta);
            subtotal += (precioUsado * detalleDTO.getCantidad());

            // Descontar stock
            Stock stock = stockRepository.findByProducto(producto)
                    .orElseThrow(
                            () -> new EntityNotFoundException("Stock no encontrado para: " + producto.getNombre()));
            stock.setStockActual(stock.getStockActual() - detalleDTO.getCantidad());
            stockRepository.save(stock);
        }

        venta.setDetalleVentas(detalles);

        double descuentoMonto = 0;
        if (ventaRequestDTO.getDescuento() != null && ventaRequestDTO.getDescuento() > 0) {
            if ("%".equals(ventaRequestDTO.getTipoDescuento())) {
                if (ventaRequestDTO.getDescuento() > 100) {
                    throw new IllegalArgumentException("El porcentaje de descuento no puede ser mayor a 100");
                }
                descuentoMonto = subtotal * (ventaRequestDTO.getDescuento() / 100);
            } else {
                if (ventaRequestDTO.getDescuento() > 9999999) {
                    throw new IllegalArgumentException("El descuento excede el límite permitido de 7 dígitos.");
                }
                descuentoMonto = ventaRequestDTO.getDescuento();
            }
            descuentoMonto = Math.min(descuentoMonto, subtotal);
        }

        double totalFinal = subtotal - descuentoMonto;

        venta.setSubtotal(subtotal);
        venta.setDescuentoMonto(descuentoMonto);
        venta.setTipoDescuento(ventaRequestDTO.getTipoDescuento());
        venta.setTotal(totalFinal);

        Venta ventaGuardada = ventaRepository.save(venta);

        // 7. Registrar cobros
        if (ventaRequestDTO.getCobros() != null && !ventaRequestDTO.getCobros().isEmpty()) {
            registrarCobrosVenta(ventaRequestDTO.getCobros(), ventaGuardada, usuario, totalFinal);
        } else {
            registrarCobroVenta(ventaRequestDTO, ventaGuardada, usuario);
        }

        return mapToVentaDTO(ventaGuardada);
    }

    public Page<VentaResponseDTO> listarVentas(Pageable pageable) {
        // Mantener firma original (sin filtros) — delega al método con filtros nulos
        return listarVentas(pageable, null, null, null, null, null);
    }

    public Page<VentaResponseDTO> listarVentas(Pageable pageable, String search, LocalDate fechaInicio,
            LocalDate fechaFin, Long vendedorId, Long metodoPagoId) {

        Specification<Venta> spec = construirEspecificacion(search, fechaInicio, fechaFin, vendedorId, metodoPagoId);
        return ventaRepository.findAll(spec, pageable).map(this::mapToVentaDTO);
    }

    public List<VentaResponseDTO> obtenerVentasParaPdf(String sortStr, String direction, String search, LocalDate fechaInicio,
            LocalDate fechaFin, Long vendedorId, Long metodoPagoId) {
            
        Specification<Venta> spec = construirEspecificacion(search, fechaInicio, fechaFin, vendedorId, metodoPagoId);
        
        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.unsorted();
        if (sortStr != null && !sortStr.isEmpty()) {
            org.springframework.data.domain.Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? 
                org.springframework.data.domain.Sort.Direction.DESC : org.springframework.data.domain.Sort.Direction.ASC;
            sort = org.springframework.data.domain.Sort.by(dir, sortStr);
        } else {
            sort = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "fecha");
        }

        return ventaRepository.findAll(spec, sort).stream()
                .map(this::mapToVentaDTO)
                .collect(Collectors.toList());
    }

    private Specification<Venta> construirEspecificacion(String search, LocalDate fechaInicio,
            LocalDate fechaFin, Long vendedorId, Long metodoPagoId) {
            
        boolean hasSearch = search != null && !search.trim().isEmpty();
        boolean hasDates = fechaInicio != null && fechaFin != null;
        final LocalDateTime start = hasDates ? fechaInicio.atStartOfDay() : null;
        final LocalDateTime end = hasDates ? fechaFin.atTime(LocalTime.MAX) : null;
        final String searchFinal = search;

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasSearch) {
                String searchNoAccents = searchFinal != null ? 
                    java.text.Normalizer.normalize(searchFinal, java.text.Normalizer.Form.NFD).replaceAll("\\p{InCombiningDiacriticalMarks}+", "").toLowerCase() : "";
                
                String[] terms = searchNoAccents.split("\\s+");
                
                Join<Venta, DetalleVenta> dv = root.join("detalleVentas", JoinType.LEFT);
                
                jakarta.persistence.criteria.Expression<String> charsFrom = cb.literal("áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ");
                jakarta.persistence.criteria.Expression<String> charsTo = cb.literal("aeiouaeiouaeiouaeiounn");
                
                List<Predicate> termPredicates = new ArrayList<>();
                for (String term : terms) {
                    if (term.trim().isEmpty()) continue;
                    String like = "%" + term + "%";
                    Predicate matchTerm = cb.or(
                            cb.like(cb.function("translate", String.class, cb.lower(root.get("cliente").get("nombre")), charsFrom, charsTo), like),
                            cb.like(cb.function("translate", String.class, cb.lower(root.get("cliente").get("apellido")), charsFrom, charsTo), like),
                            cb.like(cb.function("translate", String.class, cb.lower(root.get("usuario").get("nombre")), charsFrom, charsTo), like),
                            cb.like(cb.function("translate", String.class, cb.lower(root.get("usuario").get("apellido")), charsFrom, charsTo), like),
                            cb.like(cb.function("translate", String.class, cb.lower(dv.get("producto").get("nombre")), charsFrom, charsTo), like));
                    termPredicates.add(matchTerm);
                }
                predicates.add(cb.and(termPredicates.toArray(new Predicate[0])));
                query.distinct(true);
            }
            if (hasDates) {
                predicates.add(cb.between(root.get("fecha"), start, end));
            }
            if (vendedorId != null) {
                predicates.add(cb.equal(root.get("usuario").get("idUsuario"), vendedorId));
            }
            if (metodoPagoId != null) {
                Subquery<Long> sub = query.subquery(Long.class);
                Root<Cobro> cobroRoot = sub.from(Cobro.class);
                sub.select(cobroRoot.get("idCobro"))
                        .where(cb.and(
                                cb.equal(cobroRoot.get("venta"), root),
                                cb.equal(cobroRoot.get("metodoPago").get("idMetodoPago"), metodoPagoId)));
                predicates.add(cb.exists(sub));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public List<VentaResponseDTO> listarTodasLasVentas() {
        // Obtener todas las ventas y mapearlas a DTOs
        return ventaRepository.findAll().stream()
                .map(this::mapToVentaDTO)
                .collect(Collectors.toList());
    }

    public VentaResponseDTO obtenerVentaPorId(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con ID: " + id));
        return mapToVentaDTO(venta);
    }

    public Venta obtenerVentaEntity(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con ID: " + id));
    }

    private VentaResponseDTO mapToVentaDTO(Venta venta) {
        List<ProductoVentaDTO> productosDTO = venta.getDetalleVentas().stream()
                .map(detalle -> ProductoVentaDTO.builder()
                        .nombreProducto(detalle.getProducto().getNombre())
                        .cantidad(detalle.getCantidad())
                        .precioUnitario(detalle.getPrecioUnitario())
                        .build())
                .collect(Collectors.toList());

        // Lógica segura para el cliente
        String nombreCliente = venta.getCliente().getNombre();
        if (venta.getCliente().getApellido() != null && !venta.getCliente().getApellido().isBlank()) {
            nombreCliente += " " + venta.getCliente().getApellido();
        }

        // --- ¡LÓGICA SEGURA AÑADIDA PARA EL VENDEDOR! ---
        String nombreVendedor = "N/A"; // O "Sistema", o lo que prefieras
        String rolVendedor = "";
        if (venta.getUsuario() != null) {
            nombreVendedor = venta.getUsuario().getNombre();
            if (venta.getUsuario().getRol() != null) {
                rolVendedor = venta.getUsuario().getRol().getDescripcion();
            }
        }
        // --- FIN DE LA LÓGICA SEGURA ---

        // Obtener cobros
        String metodoPago = "Desconocido";
        Double montoPagado = null;
        Double vuelto = null;
        List<CobroResponseDTO> cobrosDTO = new ArrayList<>();
        try {
            cobrosDTO = cobroService.obtenerCobrosPorVenta(venta.getIdVenta());
            if (!cobrosDTO.isEmpty()) {
                CobroResponseDTO primero = cobrosDTO.get(0);
                if (primero.getMetodoPago() != null) metodoPago = primero.getMetodoPago();
                if (primero.getMontoPagado() != null) montoPagado = primero.getMontoPagado().doubleValue();
                if (primero.getVuelto() != null) vuelto = primero.getVuelto().doubleValue();
            }
        } catch (Exception e) {
            // ignorar si no hay cobros aún
        }

        return VentaResponseDTO.builder()
                .idVenta(venta.getIdVenta())
                .fecha(venta.getFecha())
                .nombreCliente(nombreCliente)
                .nombreVendedor(nombreVendedor)
                .rolVendedor(rolVendedor)
                .total(venta.getTotal())
                .subtotal(venta.getSubtotal())
                .descuentoMonto(venta.getDescuentoMonto())
                .productos(productosDTO)
                .metodoPago(metodoPago)
                .montoPagado(montoPagado)
                .vuelto(vuelto)
                .cobros(cobrosDTO)
                .build();
    }

    /**
     * Registrar múltiples cobros para una venta
     */
    private void registrarCobrosVenta(List<CobroItemDTO> cobros, Venta venta, Usuario usuario, double totalVenta) {
        for (CobroItemDTO cobro : cobros) {
            if (cobro.getImporte() != null && cobro.getImporte().compareTo(new BigDecimal("9999999999")) > 0) {
                throw new IllegalArgumentException("El importe de un cobro excede el límite permitido de 10 dígitos.");
            }
            if (cobro.getMontoPagado() != null && cobro.getMontoPagado().compareTo(new BigDecimal("9999999999")) > 0) {
                throw new IllegalArgumentException("El monto pagado excede el límite permitido de 10 dígitos.");
            }
        }
        double sumaImportes = cobros.stream()
                .mapToDouble(c -> c.getImporte() != null ? c.getImporte().doubleValue() : 0)
                .sum();
        if (Math.abs(sumaImportes - totalVenta) > 0.05) {
            throw new IllegalArgumentException(
                    "La suma de los cobros ($" + sumaImportes + ") no coincide con el total de la venta ($" + totalVenta + ")");
        }
        for (CobroItemDTO item : cobros) {
            if (item.getIdMetodoPago() == null) {
                throw new IllegalArgumentException("Cada cobro debe tener un método de pago");
            }
            var metodoPago = metodoPagoService.obtenerPorId(item.getIdMetodoPago());
            cobroService.registrarCobro(
                    venta,
                    metodoPago,
                    item.getImporte(),
                    item.getTipoTarjeta(),
                    item.getMontoPagado(),
                    item.getVuelto(),
                    usuario);
        }
    }

    /**
     * Registrar el cobro de una venta (legacy — un solo cobro)
     */
    private void registrarCobroVenta(VentaRequestDTO ventaRequestDTO, Venta venta, Usuario usuario) {
        // Validar que se haya enviado el método de pago
        if (ventaRequestDTO.getIdMetodoPago() == null) {
            throw new IllegalArgumentException("Debe seleccionar un método de pago");
        }

        // Obtener el método de pago
        var metodoPago = metodoPagoService.obtenerPorId(ventaRequestDTO.getIdMetodoPago());

// Calcular vuelto si es efectivo
        BigDecimal montoPagado = null;
        BigDecimal vuelto = null;
        if (ventaRequestDTO.getMontoPagado() != null && ventaRequestDTO.getMontoPagado() > 0) {
            montoPagado = BigDecimal.valueOf(ventaRequestDTO.getMontoPagado());
            double totalVenta = venta.getTotal();
            double monto = ventaRequestDTO.getMontoPagado();
            double v = monto - totalVenta;
            if (v > 0) {
                vuelto = BigDecimal.valueOf(v);
            } else {
                vuelto = BigDecimal.ZERO;
            }
        }

        // Registrar el cobro
        cobroService.registrarCobro(
                venta,
                metodoPago,
                BigDecimal.valueOf(venta.getTotal()), // El importe siempre es el total de la venta
                ventaRequestDTO.getTipoTarjeta(),
                montoPagado,
                vuelto,
                usuario);
    }

}