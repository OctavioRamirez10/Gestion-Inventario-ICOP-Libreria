package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSimpleDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorUpdateDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;

    @Transactional
    // CORRECCIÓN 1: El método ahora devuelve el DTO de respuesta.
    public ProveedorResponseDTO registrarProveedor(ProveedorRequestDTO dto) {
        // VALIDACIÓN 1: Verificar nombre duplicado PRIMERO
        if (dto.getNombre() != null && !dto.getNombre().isBlank()) {
            if (proveedorRepository.existsByNombreIgnoreCaseAndEstado(dto.getNombre(), "ACTIVO")) {
                throw new IllegalArgumentException("Ya existe un proveedor registrado con ese nombre");
            }
        }

        // VALIDACIÓN 2: Verificar email duplicado SEGUNDO
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            if (proveedorRepository.existsByEmailAndEstado(dto.getEmail(), "ACTIVO")) {
                throw new IllegalArgumentException("Ya existe un proveedor registrado con ese email");
            }
        }

        // VALIDACIÓN 3: Campos obligatorios
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
                dto.getTelefono() == null || dto.getTelefono().isBlank() ||
                dto.getEmail() == null || dto.getEmail().isBlank() ||
                dto.getDireccion() == null || dto.getDireccion().isBlank()) {
            throw new IllegalArgumentException("Todos los campos son obligatorios");
        }

        // VALIDACIÓN 4: Formato del email
        if (!dto.getEmail().matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("El email debe tener un formato válido");
        }

        Proveedor proveedor = Proveedor.builder()
                .nombre(dto.getNombre())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .direccion(dto.getDireccion())
                .cuit(dto.getCuit())
                .estado("ACTIVO")
                .build();

        proveedor.setProductoProveedor(new ArrayList<>());

        // Usamos el nombre de campo corregido 'productosIds'
        if (dto.getProductosIds() != null && !dto.getProductosIds().isEmpty()) {
            for (Long idProd : dto.getProductosIds()) {
                Producto producto = productoRepository.findById(idProd)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProd));

                ProductoProveedor pp = ProductoProveedor.builder()
                        .producto(producto)
                        .proveedor(proveedor)
                        .build();

                proveedor.getProductoProveedor().add(pp);
            }
        }

        Proveedor proveedorGuardado = proveedorRepository.save(proveedor);

        // CORRECCIÓN 2: Devolvemos el DTO mapeado.
        return mapToDTO(proveedorGuardado);
    }

    @Transactional(readOnly = true)
    public Page<ProveedorResponseDTO> listarProveedores(Pageable pageable, Boolean conCompras) {

        Specification<Proveedor> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("estado"), "ACTIVO"));

            if (conCompras != null) {
                if (conCompras) {
                    predicates.add(cb.greaterThan(cb.size(root.get("compras")), 0));
                } else {
                    predicates.add(cb.equal(cb.size(root.get("compras")), 0));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Proveedor> paginaProveedores = proveedorRepository.findAll(spec, pageable);
        return paginaProveedores.map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<ProveedorResponseDTO> listarTodosProveedores() {
        return proveedorRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProveedorResponseDTO actualizarProveedor(Long id, ProveedorUpdateDTO dto) {
        Proveedor proveedor = proveedorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));

        // 🔹 Actualizar datos básicos
        if (dto.getNombre() != null)
            proveedor.setNombre(dto.getNombre());
        if (dto.getTelefono() != null)
            proveedor.setTelefono(dto.getTelefono());
        if (dto.getEmail() != null)
            proveedor.setEmail(dto.getEmail());
        if (dto.getDireccion() != null)
            proveedor.setDireccion(dto.getDireccion());
        if (dto.getCuit() != null)
            proveedor.setCuit(dto.getCuit());

        // 🔹 Agregar productos
        if (dto.getProductosAgregar() != null) {
            for (Long productoId : dto.getProductosAgregar()) {
                Producto producto = productoRepository.findById(productoId)
                        .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + productoId));

                boolean yaAsociado = proveedor.getProductoProveedor().stream()
                        .anyMatch(pp -> pp.getProducto().getIdProducto().equals(productoId));

                if (!yaAsociado) {
                    ProductoProveedor pp = new ProductoProveedor();
                    pp.setProveedor(proveedor);
                    pp.setProducto(producto);
                    proveedor.getProductoProveedor().add(pp);
                }
            }
        }

        // 🔹 Quitar productos
        if (dto.getProductosQuitar() != null) {
            proveedor.getProductoProveedor()
                    .removeIf(pp -> dto.getProductosQuitar().contains(pp.getProducto().getIdProducto()));
        }

        Proveedor actualizado = proveedorRepository.save(proveedor);
        return mapToDTO(actualizado);
    }

    @Transactional(noRollbackFor = {IllegalArgumentException.class})
    public void eliminarProveedor(Long id) {
        Proveedor proveedor = proveedorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
        
        boolean tieneCompras = proveedor.getCompras() != null && !proveedor.getCompras().isEmpty();
        boolean tieneProductos = proveedor.getProductoProveedor() != null && !proveedor.getProductoProveedor().isEmpty();

        if (tieneCompras || tieneProductos) {
            proveedor.setEstado("INACTIVO");
            proveedorRepository.save(proveedor);
        } else {
            proveedorRepository.delete(proveedor);
        }
    }

    public ProveedorResponseDTO mapToDTO(Proveedor proveedor) {
        List<ProductoSimpleDTO> productosDTO = proveedor.getProductoProveedor().stream()
                .map(pp -> {
                    com.gestioninventariodemo2.cruddemo2.Model.Producto producto = pp.getProducto();
                    
                    int stockActual = 0;
                    if (producto.getStocks() != null && !producto.getStocks().isEmpty()) {
                        stockActual = producto.getStocks().get(0).getStockActual();
                    }

                    double ultimoCosto = pp.getPrecioCosto() != null ? pp.getPrecioCosto() : 0.0;

                    double margen = 0.0;
                    if (ultimoCosto > 0) {
                        margen = ((producto.getPrecio() - ultimoCosto) / ultimoCosto) * 100;
                    } else if (producto.getPrecio() > 0) {
                        margen = 100.0;
                    }

                    return ProductoSimpleDTO.builder()
                            .idProducto(producto.getIdProducto())
                            .nombreProducto(producto.getNombre())
                            .descripcion(producto.getDescripcion())
                            .precio(producto.getPrecio())
                            .stock(stockActual)
                            .ultimoCosto(ultimoCosto)
                            .margen(margen)
                            .build();
                })
                .collect(Collectors.toList());

        return ProveedorResponseDTO.builder()
                .id(proveedor.getIdProveedor())
                .nombre(proveedor.getNombre())
                .telefono(proveedor.getTelefono())
                .email(proveedor.getEmail())
                .direccion(proveedor.getDireccion())
                .cuit(proveedor.getCuit())
                .productos(productosDTO)
                .build();
    }

    @Transactional(readOnly = true)
    public ProveedorResponseDTO buscarPorId(Long id) {
        Proveedor proveedor = proveedorRepository.findByIdWithProductos(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
        return mapToDTO(proveedor);
    }

    @Transactional(readOnly = true)
    public boolean existeNombre(String nombre) {
        return proveedorRepository.existsByNombreIgnoreCaseAndEstado(nombre, "ACTIVO");
    }

    @Transactional(readOnly = true)
    public boolean existeEmail(String email) {
        return proveedorRepository.existsByEmailAndEstado(email, "ACTIVO");
    }
}
