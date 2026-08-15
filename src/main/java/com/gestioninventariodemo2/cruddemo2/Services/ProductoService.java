package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ActualizarProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoActualizadoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoAuditoriaCompraDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoInventarioDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSelectDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorProductoDetalleDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Categoria;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Repository.CategoriaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.DetalleCompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.DetalleVentaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final StockRepository stockRepository;
    private final CategoriaRepository categoriaRepository;
    private final DetalleVentaRepository detalleVentaRepository;
    private final DetalleCompraRepository detalleCompraRepository;
    private final ProductoProveedorRepository productoProveedorRepository;

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto) {
        // 1. Validación de campos obligatorios
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
                dto.getIdCategoria() == null ||
                dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
            throw new IllegalArgumentException("Debe completar todos los campos");
        }

        // 2. Validación de duplicado
        if (productoRepository.existsByNombreIgnoreCase(dto.getNombre().trim())) {
            throw new IllegalArgumentException("Ya existe un producto con el nombre: " + dto.getNombre());
        }

        // 3. Buscar la categoría
        Categoria categoria = categoriaRepository.findById(dto.getIdCategoria())
                .orElseThrow(
                        () -> new IllegalArgumentException("Categoría no encontrada con ID: " + dto.getIdCategoria()));

        // 4. Crear producto
        Producto producto = Producto.builder()
                .nombre(dto.getNombre())
                .categoria(categoria)
                .descripcion(dto.getDescripcion())
                .estado("ACTIVO")
                .fechaCreacion(LocalDate.now())
                .build();

        productoRepository.save(producto);

        // 4. Crear stock asociado (tu código original)
        Stock stockInicial = Stock.builder()
                .producto(producto)
                .stockActual(0) // El stock inicial siempre es 0
                .stockMinimo(dto.getStockMinimo()) // <-- ¡NUEVO!
                .stockMaximo(dto.getStockMaximo()) // <-- ¡NUEVO!
                .build();

        stockRepository.save(stockInicial);

        return producto;
    }

    @Transactional(readOnly = true)
    public boolean existeNombre(String nombre, Long excludeId) {
        if (excludeId == null) {
            return productoRepository.existsByNombreIgnoreCase(nombre.trim());
        } else {
            return productoRepository.existsByNombreIgnoreCaseAndIdProductoNot(nombre.trim(), excludeId);
        }
    }

    @Transactional(readOnly = true)
    public Page<ProductoResponseDTO> listarProductos(Pageable pageable) {

        Page<Producto> paginaProductos = productoRepository.findAllByEstado("ACTIVO", pageable);

        return paginaProductos.map(p -> {

            // --- ¡LÓGICA AÑADIDA! ---
            // Valores por defecto
            int stockMin = 0;
            int stockMax = 0;

            // Buscamos el stock (igual que en tu lógica de StockTablaDTO)
            if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                Stock stock = p.getStocks().get(0); // Tomamos el primer registro de stock
                stockMin = stock.getStockMinimo();
                stockMax = stock.getStockMaximo();
            }
            // --- FIN DE LÓGICA AÑADIDA ---

            return ProductoResponseDTO.builder()
                    .nombre(p.getNombre())
                    .categoria(p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría")
                    .descripcion(p.getDescripcion())
                    .precio(p.getPrecio())
                    .fechaCreacion(p.getFechaCreacion())
                    .stockMinimo(stockMin)
                    .stockMaximo(stockMax)
                    .build();
        });
    }

    @Transactional(readOnly = true)
    public List<StockTablaDTO> mostrarTablaStock() {
        return productoRepository.findAllByEstado("ACTIVO")
                .stream()
                .map(p -> {
                    int stockActual = 0;
                    int stockMinimo = 0;
                    // Si la lista existe y tiene al menos un elemento
                    if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                        stockActual = p.getStocks().get(0).getStockActual();
                        stockMinimo = p.getStocks().get(0).getStockMinimo();
                    }

                    // Obtener información del proveedor
                    String proveedorNombre = null;
                    int totalProveedores = productoProveedorRepository.countByProducto(p);
                    List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(p);
                    if (!compras.isEmpty() && compras.get(0).getCompra() != null
                            && compras.get(0).getCompra().getProveedor() != null) {
                        // Verificar que el proveedor siga vinculado al producto
                        Long provId = compras.get(0).getCompra().getProveedor().getIdProveedor();
                        boolean sigueVinculado = p.getProductoProveedores() != null &&
                                p.getProductoProveedores().stream()
                                        .anyMatch(pp -> pp.getProveedor().getIdProveedor().equals(provId));
                        if (sigueVinculado) {
                            proveedorNombre = compras.get(0).getCompra().getProveedor().getNombre();
                        }
                    }

                    // Fallback: si no hay compras, usar el primer proveedor vinculado manualmente
                    if (proveedorNombre == null && p.getProductoProveedores() != null
                            && !p.getProductoProveedores().isEmpty()) {
                        proveedorNombre = p.getProductoProveedores().get(0).getProveedor().getNombre();
                    }

                    // Obtener nombres de los demás proveedores para el popover
                    final String mainProveedor = proveedorNombre;
                    List<String> otrosProveedores = java.util.Collections.emptyList();
                    if (p.getProductoProveedores() != null && totalProveedores > 1) {
                        otrosProveedores = p.getProductoProveedores().stream()
                                .map(pp -> pp.getProveedor().getNombre())
                                .filter(nombre -> !nombre.equals(mainProveedor))
                                .distinct()
                                .collect(Collectors.toList());
                    }

                    return StockTablaDTO.builder()
                            .id(p.getIdProducto())
                            .nombre(p.getNombre())
                            .categoria(p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría")
                            .descripcion(p.getDescripcion())
                            .precio(p.getPrecio())
                            .stock(stockActual)
                            .stockMinimo(stockMinimo)
                            .proveedor(proveedorNombre)
                            .totalProveedores(totalProveedores)
                            .otrosProveedores(otrosProveedores)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoSelectDTO> listarProductosSelect(Long idProveedor) {
        return productoRepository.findAllByEstado("ACTIVO")
                .stream()
                .map(p -> {
                    int stockActual = 0;
                    // Obtener el stock si existe
                    if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                        stockActual = p.getStocks().get(0).getStockActual();
                    }

                    Double ultimoCosto = null;
                    if (idProveedor != null) {
                        // Buscar el precioCosto en el enlace con este proveedor
                        if (p.getProductoProveedores() != null) {
                            for (com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor pp : p
                                    .getProductoProveedores()) {
                                if (pp.getProveedor() != null
                                        && pp.getProveedor().getIdProveedor().equals(idProveedor)) {
                                    ultimoCosto = pp.getPrecioCosto();
                                    break;
                                }
                            }
                        }
                    } else {
                        // Comportamiento global
                        List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(p);
                        if (!compras.isEmpty()) {
                            ultimoCosto = compras.get(0).getPrecioUnitario();
                        }
                    }

                    return ProductoSelectDTO.builder()
                            .idProducto(p.getIdProducto())
                            .nombreProducto(p.getNombre())
                            .precioVenta(p.getPrecio())
                            .stockActual(stockActual)
                            .ultimoCosto(ultimoCosto)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoSelectDTO> listarProductosSelectPorProveedor(Long idProveedor) {
        // Mantenemos este para no romper usos existentes
        if (idProveedor == null) {
            return Collections.emptyList();
        }

        // Usamos el nuevo método del repositorio y el DTO helper existente
        return productoRepository.findActivosByProveedorId(idProveedor)
                .stream()
                .map(this::mapDto) // Reutilizamos el helper 'mapDto'
                .toList();
    }

    @Transactional
    public ProductoActualizadoDTO editarProducto(Long id, ActualizarProductoDTO dto) {
        // 1. Validaciones
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
                dto.getIdCategoria() == null ||
                dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
            throw new IllegalArgumentException("Todos los campos obligatorios deben estar completos");
        }

        if (dto.getPrecio() < 0) {
            throw new IllegalArgumentException("El precio no puede ser negativo");
        }

        if (dto.getCantidadExtraStock() < 0) {
            throw new IllegalArgumentException("La cantidad de stock no puede ser negativa");
        }

        // 2. Buscar entidades
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con id: " + id));

        Categoria categoria = categoriaRepository.findById(dto.getIdCategoria())
                .orElseThrow(
                        () -> new IllegalArgumentException("Categoría no encontrada con ID: " + dto.getIdCategoria()));

        // 3. Actualizar datos del producto
        producto.setNombre(dto.getNombre());
        producto.setCategoria(categoria);
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());

        // 4. Actualizar datos del stock
        Stock stock = producto.getStocks().get(0);
        stock.setStockActual(stock.getStockActual() + dto.getCantidadExtraStock());

        // Actualizar stock mínimo y máximo si se proporcionan
        if (dto.getStockMinimo() != null) {
            stock.setStockMinimo(dto.getStockMinimo());
        }
        if (dto.getStockMaximo() != null) {
            stock.setStockMaximo(dto.getStockMaximo());
        }

        // 5. Guardar ambas entidades
        productoRepository.save(producto);
        stockRepository.save(stock);

        // 6. Devolver el DTO completo
        return ProductoActualizadoDTO.builder()
                .nombre(producto.getNombre())
                .categoria(producto.getCategoria() != null ? producto.getCategoria().getNombre() : "Sin categoría")
                .descripcion(producto.getDescripcion())
                .precio(producto.getPrecio())
                .stockActual(stock.getStockActual())
                .build();
    }

    @Transactional
    public boolean eliminarProducto(Long id) {

        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));

        boolean usadoEnVenta = detalleVentaRepository.existsByProductoIdProducto(id);
        boolean usadoEnCompra = detalleCompraRepository.existsByProductoIdProducto(id);
        boolean asociadoAProveedor = productoProveedorRepository.existsByProductoIdProducto(id);
        boolean tieneStockAsociado = stockRepository.existsByProductoIdProducto(id);

        if (usadoEnVenta || usadoEnCompra || asociadoAProveedor || tieneStockAsociado) {
            producto.setEstado("INACTIVO");
            productoRepository.save(producto);
            return true;
        } else {
            productoRepository.deleteById(id);
            return false;
        }
    }

    public List<ProductoResponseDTO> buscarPorNombre(String nombre) {
        List<Producto> productos = productoRepository.findByNombreContainingIgnoreCase(nombre);
        return productos.stream()
                .map(this::mapToDTO)
                .toList();
    }

    /**
     * Lista todos los productos con su información de inventario completa.
     * Combina datos de producto y stock en un solo DTO.
     * Calcula el estado del stock automáticamente.
     * 
     * @param pageable paginación y ordenamiento
     * @return Page de ProductoInventarioDTO
     */
    @Transactional(readOnly = true)
    public Page<ProductoInventarioDTO> listarInventario(Pageable pageable) {
        // Detectar si se está ordenando por campos de stock
        boolean isStockSort = pageable.getSort().isSorted() &&
                pageable.getSort().stream().anyMatch(order -> order.getProperty().toLowerCase().contains("stock"));

        Page<Producto> paginaProductos;

        if (isStockSort) {
            // Si es ordenamiento por stock, obtener TODOS los productos activos
            // y hacer el ordenamiento en memoria
            List<Producto> todosLosProductos = productoRepository.findAllByEstado("ACTIVO");

            // Convertir a DTOs
            List<ProductoInventarioDTO> todosLosDTOs = todosLosProductos.stream()
                    .map(p -> {
                        int stockActual = 0;
                        int stockMin = 0;
                        int stockMax = 0;

                        if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                            Stock stock = p.getStocks().get(0);
                            stockActual = stock.getStockActual();
                            stockMin = stock.getStockMinimo();
                            stockMax = stock.getStockMaximo();
                        }

                        String estadoStock;
                        if (stockActual == 0) {
                            estadoStock = "AGOTADO";
                        } else if (stockActual < stockMin) {
                            estadoStock = "BAJO";
                        } else {
                            estadoStock = "BUENO";
                        }

                        // Obtener información del proveedor
                        String proveedorNombre = null;
                        int totalProveedores = productoProveedorRepository.countByProducto(p);
                        List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(p);
                        if (!compras.isEmpty() && compras.get(0).getCompra() != null
                                && compras.get(0).getCompra().getProveedor() != null) {
                            Long provId = compras.get(0).getCompra().getProveedor().getIdProveedor();
                            boolean sigueVinculado = p.getProductoProveedores() != null &&
                                    p.getProductoProveedores().stream()
                                            .anyMatch(pp -> pp.getProveedor().getIdProveedor().equals(provId));
                            if (sigueVinculado) {
                                proveedorNombre = compras.get(0).getCompra().getProveedor().getNombre();
                            }
                        }

                        // Fallback: si no hay compras, usar el primer proveedor vinculado manualmente
                        if (proveedorNombre == null && p.getProductoProveedores() != null
                                && !p.getProductoProveedores().isEmpty()) {
                            proveedorNombre = p.getProductoProveedores().get(0).getProveedor().getNombre();
                        }

                        // Obtener nombres de los demás proveedores para el popover
                        final String mainProveedor = proveedorNombre;
                        List<String> otrosProveedores = java.util.Collections.emptyList();
                        if (p.getProductoProveedores() != null && totalProveedores > 1) {
                            otrosProveedores = p.getProductoProveedores().stream()
                                    .map(pp -> pp.getProveedor().getNombre())
                                    .filter(nombre -> !nombre.equals(mainProveedor))
                                    .distinct()
                                    .collect(Collectors.toList());
                        }

                        return ProductoInventarioDTO.builder()
                                .idProducto(p.getIdProducto())
                                .nombre(p.getNombre())
                                .categoria(p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría")
                                .descripcion(p.getDescripcion())
                                .precio(p.getPrecio())
                                .fechaCreacion(p.getFechaCreacion())
                                .stockActual(stockActual)
                                .stockMinimo(stockMin)
                                .stockMaximo(stockMax)
                                .estadoStock(estadoStock)
                                .proveedorNombre(proveedorNombre)
                                .totalProveedores(totalProveedores)
                                .otrosProveedores(otrosProveedores)
                                .build();
                    })
                    .collect(Collectors.toList());

            // Ordenar en memoria
            org.springframework.data.domain.Sort.Order sortOrder = pageable.getSort().iterator().next();
            java.util.Comparator<ProductoInventarioDTO> comparator = null;

            if ("stock".equals(sortOrder.getProperty()) || "stockActual".equals(sortOrder.getProperty())) {
                comparator = java.util.Comparator.comparingInt(ProductoInventarioDTO::getStockActual);
            } else if ("stockMinimo".equals(sortOrder.getProperty())) {
                comparator = java.util.Comparator.comparingInt(ProductoInventarioDTO::getStockMinimo);
            } else if ("stockMaximo".equals(sortOrder.getProperty())) {
                comparator = java.util.Comparator.comparingInt(ProductoInventarioDTO::getStockMaximo);
            }

            if (comparator != null) {
                if (sortOrder.getDirection() == org.springframework.data.domain.Sort.Direction.DESC) {
                    comparator = comparator.reversed();
                }
                todosLosDTOs.sort(comparator);
            }

            // Paginar manualmente
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), todosLosDTOs.size());
            List<ProductoInventarioDTO> paginatedList = todosLosDTOs.subList(start, end);

            return new org.springframework.data.domain.PageImpl<>(
                    paginatedList,
                    pageable,
                    todosLosDTOs.size());

        } else {
            // Para ordenamiento por otros campos, usar el método normal del repositorio
            paginaProductos = productoRepository.findAllByEstado("ACTIVO", pageable);

            return paginaProductos.map(p -> {
                // Valores por defecto
                int stockActual = 0;
                int stockMin = 0;
                int stockMax = 0;

                // Obtener stock si existe
                if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                    Stock stock = p.getStocks().get(0);
                    stockActual = stock.getStockActual();
                    stockMin = stock.getStockMinimo();
                    stockMax = stock.getStockMaximo();
                }

                // Calcular estado del stock
                String estadoStock;
                if (stockActual == 0) {
                    estadoStock = "AGOTADO";
                } else if (stockActual < stockMin) {
                    estadoStock = "BAJO";
                } else {
                    estadoStock = "BUENO";
                }

                // Obtener información del proveedor, teléfono y último costo unitario
                String proveedorNombre = null;
                String proveedorTelefono = null;
                Double precioCosto = null;

                int totalProveedores = productoProveedorRepository.countByProducto(p);
                List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(p);

                if (!compras.isEmpty()) {
                    DetalleCompra ultima = compras.get(0);
                    precioCosto = ultima.getPrecioUnitario(); // Último costo unitario

                    if (ultima.getCompra() != null && ultima.getCompra().getProveedor() != null) {
                        Long provId = ultima.getCompra().getProveedor().getIdProveedor();
                        boolean sigueVinculado = p.getProductoProveedores() != null &&
                                p.getProductoProveedores().stream()
                                        .anyMatch(pp -> pp.getProveedor().getIdProveedor().equals(provId));
                        if (sigueVinculado) {
                            proveedorNombre = ultima.getCompra().getProveedor().getNombre();
                            proveedorTelefono = ultima.getCompra().getProveedor().getTelefono();
                        }
                    }
                }

                // Fallback: si no hay compras, usar el primer proveedor vinculado manualmente
                if (proveedorNombre == null && p.getProductoProveedores() != null
                        && !p.getProductoProveedores().isEmpty()) {
                    proveedorNombre = p.getProductoProveedores().get(0).getProveedor().getNombre();
                    proveedorTelefono = p.getProductoProveedores().get(0).getProveedor().getTelefono();
                }

                // Obtener nombres de los demás proveedores para el popover
                final String mainProveedor = proveedorNombre;
                List<String> otrosProveedores = java.util.Collections.emptyList();
                if (p.getProductoProveedores() != null && totalProveedores > 1) {
                    otrosProveedores = p.getProductoProveedores().stream()
                            .map(pp -> pp.getProveedor().getNombre())
                            .filter(nombre -> !nombre.equals(mainProveedor))
                            .distinct()
                            .collect(Collectors.toList());
                }

                return ProductoInventarioDTO.builder()
                        .idProducto(p.getIdProducto())
                        .nombre(p.getNombre())
                        .categoria(p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría")
                        .descripcion(p.getDescripcion())
                        .precio(p.getPrecio())
                        .fechaCreacion(p.getFechaCreacion())
                        .stockActual(stockActual)
                        .stockMinimo(stockMin)
                        .stockMaximo(stockMax)
                        .estadoStock(estadoStock)
                        .proveedorNombre(proveedorNombre)
                        .proveedorTelefono(proveedorTelefono)
                        .precioCosto(precioCosto)
                        .totalProveedores(totalProveedores)
                        .otrosProveedores(otrosProveedores)
                        .build();
            });
        }
    }

    @Transactional(readOnly = true)
    public List<ProductoInventarioDTO> obtenerInventarioParaPdf(
            String estadoStock, String categoria, String proveedor,
            String busqueda, String sortField, String sortDirection) {

        List<Producto> productos = productoRepository.findAllByEstado("ACTIVO");

        List<ProductoInventarioDTO> dtos = productos.stream().map(p -> {
            int stockActual = 0, stockMin = 0, stockMax = 0;
            if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                Stock s = p.getStocks().get(0);
                stockActual = s.getStockActual();
                stockMin = s.getStockMinimo();
                stockMax = s.getStockMaximo();
            }
            String estado = stockActual == 0 ? "AGOTADO" : (stockActual < stockMin ? "BAJO" : "BUENO");

            String provNombre = null, provTelefono = null;
            Double precioCosto = null;
            List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(p);
            if (!compras.isEmpty()) {
                DetalleCompra ultima = compras.get(0);
                precioCosto = ultima.getPrecioUnitario();
                if (ultima.getCompra() != null && ultima.getCompra().getProveedor() != null) {
                    Long provId = ultima.getCompra().getProveedor().getIdProveedor();
                    boolean vinculado = p.getProductoProveedores() != null &&
                            p.getProductoProveedores().stream()
                                    .anyMatch(pp -> pp.getProveedor().getIdProveedor().equals(provId));
                    if (vinculado) {
                        provNombre = ultima.getCompra().getProveedor().getNombre();
                        provTelefono = ultima.getCompra().getProveedor().getTelefono();
                    }
                }
            }
            if (provNombre == null && p.getProductoProveedores() != null && !p.getProductoProveedores().isEmpty()) {
                provNombre = p.getProductoProveedores().get(0).getProveedor().getNombre();
                provTelefono = p.getProductoProveedores().get(0).getProveedor().getTelefono();
            }

            return ProductoInventarioDTO.builder()
                    .idProducto(p.getIdProducto())
                    .nombre(p.getNombre())
                    .categoria(p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoría")
                    .precio(p.getPrecio())
                    .stockActual(stockActual).stockMinimo(stockMin).stockMaximo(stockMax)
                    .estadoStock(estado)
                    .proveedorNombre(provNombre).proveedorTelefono(provTelefono)
                    .precioCosto(precioCosto)
                    .build();
        }).collect(Collectors.toList());

        // Filtros
        if (estadoStock != null && !estadoStock.equals("todos")) {
            java.util.Map<String, String> estadoMap = java.util.Map.of(
                "agotado", "AGOTADO", "bajo", "BAJO", "optimo", "BUENO");
            String estadoBuscado = estadoMap.getOrDefault(estadoStock.toLowerCase(), estadoStock.toUpperCase());
            dtos = dtos.stream().filter(d -> estadoBuscado.equals(d.getEstadoStock())).collect(Collectors.toList());
        }
        if (categoria != null && !categoria.equals("todos")) {
            dtos = dtos.stream().filter(d -> categoria.equalsIgnoreCase(d.getCategoria())).collect(Collectors.toList());
        }
        if (proveedor != null && !proveedor.equals("todos")) {
            if ("sin-proveedor".equals(proveedor)) {
                dtos = dtos.stream().filter(d -> d.getProveedorNombre() == null).collect(Collectors.toList());
            } else {
                String provTerm = proveedor.toLowerCase();
                dtos = dtos.stream().filter(d -> d.getProveedorNombre() != null && d.getProveedorNombre().toLowerCase().contains(provTerm)).collect(Collectors.toList());
            }
        }
        if (busqueda != null && !busqueda.isBlank()) {
            String term = busqueda.toLowerCase();
            dtos = dtos.stream().filter(d -> 
                (d.getNombre() != null && d.getNombre().toLowerCase().contains(term)) ||
                (d.getCategoria() != null && d.getCategoria().toLowerCase().contains(term)) ||
                (d.getProveedorNombre() != null && d.getProveedorNombre().toLowerCase().contains(term))
            ).collect(Collectors.toList());
        }

        // Ordenamiento
        if (sortField != null && !sortField.isBlank()) {
            boolean desc = "desc".equalsIgnoreCase(sortDirection);
            java.util.Comparator<ProductoInventarioDTO> comp = switch (sortField) {
                case "estadoStock" -> {
                    java.util.Map<String, Integer> prio = java.util.Map.of("AGOTADO", 0, "BAJO", 1, "BUENO", 2);
                    yield java.util.Comparator.comparingInt(d -> prio.getOrDefault(d.getEstadoStock(), 3));
                }
                case "stock", "stockActual" -> java.util.Comparator.comparingInt(ProductoInventarioDTO::getStockActual);
                case "stockMinimo"          -> java.util.Comparator.comparingInt(ProductoInventarioDTO::getStockMinimo);
                case "precio"               -> java.util.Comparator.comparingDouble(ProductoInventarioDTO::getPrecio);
                case "categoria"            -> java.util.Comparator.comparing(d -> d.getCategoria() != null ? d.getCategoria() : "");
                case "proveedorNombre"      -> java.util.Comparator.comparing(d -> d.getProveedorNombre() != null ? d.getProveedorNombre() : "zzz");
                default                     -> java.util.Comparator.comparing(d -> d.getNombre() != null ? d.getNombre() : "");
            };
            if (desc) comp = comp.reversed();
            dtos.sort(comp);
        }

        return dtos;
    }

    public ProductoResponseDTO mapToDTO(Producto producto) {
        return ProductoResponseDTO.builder()
                .nombre(producto.getNombre())
                .categoria(producto.getCategoria() != null ? producto.getCategoria().getNombre() : "Sin categoría")
                .descripcion(producto.getDescripcion())
                .precio(producto.getPrecio())
                .fechaCreacion(producto.getFechaCreacion())
                .build();
    }

    public ProductoSelectDTO mapDto(Producto producto) {
        int stockActual = 0;
        if (producto.getStocks() != null && !producto.getStocks().isEmpty()) {
            stockActual = producto.getStocks().get(0).getStockActual();
        }

        Double ultimoCosto = null;
        List<DetalleCompra> compras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(producto);
        if (!compras.isEmpty()) {
            ultimoCosto = compras.get(0).getPrecioUnitario();
        }

        return ProductoSelectDTO.builder()
                .idProducto(producto.getIdProducto())
                .nombreProducto(producto.getNombre())
                .precioVenta(producto.getPrecio())
                .stockActual(stockActual)
                .ultimoCosto(ultimoCosto)
                .build();
    }

    /**
     * Obtiene la lista de proveedores asociados a un producto,
     * con su teléfono y el último costo de compra.
     */
    @Transactional(readOnly = true)
    public List<ProveedorProductoDetalleDTO> listarProveedoresDeProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + idProducto));

        List<com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor> relaciones = producto
                .getProductoProveedores();
        if (relaciones == null || relaciones.isEmpty()) {
            return Collections.emptyList();
        }

        // Obtener todas las compras de este producto, ordenadas por fecha desc
        List<DetalleCompra> todasLasCompras = detalleCompraRepository.findByProductoOrderByCompraFechaDesc(producto);

        return relaciones.stream().map(pp -> {
            com.gestioninventariodemo2.cruddemo2.Model.Proveedor prov = pp.getProveedor();

            // Buscar el último costo y fecha de compra con este proveedor
            Double ultimoCosto = null;
            int ordenCompra = Integer.MAX_VALUE; // Para ordenar: menor = más reciente
            for (int i = 0; i < todasLasCompras.size(); i++) {
                DetalleCompra dc = todasLasCompras.get(i);
                if (dc.getCompra() != null && dc.getCompra().getProveedor() != null
                        && dc.getCompra().getProveedor().getIdProveedor().equals(prov.getIdProveedor())) {
                    ultimoCosto = dc.getPrecioUnitario();
                    ordenCompra = i; // Posición en lista ordenada por fecha desc
                    break;
                }
            }

            return new Object[] {
                    ProveedorProductoDetalleDTO.builder()
                            .idProveedor(prov.getIdProveedor())
                            .nombre(prov.getNombre())
                            .telefono(prov.getTelefono())
                            .email(prov.getEmail())
                            .ultimoCosto(ultimoCosto)
                            .build(),
                    ordenCompra
            };
        })
                .sorted((a, b) -> Integer.compare((int) a[1], (int) b[1]))
                .map(arr -> (ProveedorProductoDetalleDTO) arr[0])
                .collect(Collectors.toList());
    }

    /**
     * Obtiene el historial y auditoría de compras de un producto con cálculo de variación de costos.
     */
    @Transactional(readOnly = true)
    public List<ProductoAuditoriaCompraDTO> obtenerAuditoriaComprasProducto(Long idProducto) {
        if (!productoRepository.existsById(idProducto)) {
            throw new EntityNotFoundException("Producto no encontrado con id: " + idProducto);
        }

        List<DetalleCompra> compras = detalleCompraRepository.findByProducto_IdProductoOrderByCompra_FechaDesc(idProducto);
        List<ProductoAuditoriaCompraDTO> resultado = new java.util.ArrayList<>();

        for (int i = 0; i < compras.size(); i++) {
            DetalleCompra dc = compras.get(i);
            com.gestioninventariodemo2.cruddemo2.Model.Compra compra = dc.getCompra();

            Long idCompra = compra != null ? compra.getIdCompra() : null;
            java.time.LocalDateTime fecha = compra != null ? compra.getFecha() : null;
            Long idProv = (compra != null && compra.getProveedor() != null) ? compra.getProveedor().getIdProveedor() : null;
            String nombreProv = (compra != null && compra.getProveedor() != null) ? compra.getProveedor().getNombre() : "Sin proveedor";

            double costoActual = dc.getPrecioUnitario();
            Double variacionMonto = null;
            Double variacionPorcentaje = null;
            Long diasDesdeCompraAnterior = null;

            // Comparar con la compra anterior en el tiempo (índice i + 1)
            if (i + 1 < compras.size()) {
                DetalleCompra compraAnterior = compras.get(i + 1);
                double costoAnterior = compraAnterior.getPrecioUnitario();
                if (costoAnterior > 0) {
                    variacionMonto = costoActual - costoAnterior;
                    variacionPorcentaje = ((costoActual - costoAnterior) / costoAnterior) * 100.0;
                }

                if (fecha != null && compraAnterior.getCompra() != null && compraAnterior.getCompra().getFecha() != null) {
                    diasDesdeCompraAnterior = java.time.temporal.ChronoUnit.DAYS.between(
                            compraAnterior.getCompra().getFecha().toLocalDate(),
                            fecha.toLocalDate()
                    );
                }
            }

            resultado.add(ProductoAuditoriaCompraDTO.builder()
                    .idCompra(idCompra)
                    .fechaCompra(fecha)
                    .idProveedor(idProv)
                    .nombreProveedor(nombreProv)
                    .cantidad(dc.getCantidad())
                    .costoUnitario(costoActual)
                    .variacionMonto(variacionMonto)
                    .variacionPorcentaje(variacionPorcentaje)
                    .diasDesdeCompraAnterior(diasDesdeCompraAnterior)
                    .subtotal(dc.getCantidad() * costoActual)
                    .build());
        }

        return resultado;
    }

}
