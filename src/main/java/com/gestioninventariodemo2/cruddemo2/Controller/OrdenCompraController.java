package com.gestioninventariodemo2.cruddemo2.Controller;

import com.gestioninventariodemo2.cruddemo2.DTO.OrdenCompraDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleOrdenCompraDTO;
import com.gestioninventariodemo2.cruddemo2.Model.OrdenCompra;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleOrdenCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Repository.OrdenCompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.stream.Collectors;
import java.util.List;

@RestController
@RequestMapping("/api/ordenes-compra")
public class OrdenCompraController {

    @Autowired
    private OrdenCompraRepository ordenCompraRepository;

    @Autowired
    private ProveedorRepository proveedorRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @PostMapping
    public ResponseEntity<?> crearOrdenCompra(@RequestBody OrdenCompraDTO dto) {
        try {
            Proveedor proveedor = proveedorRepository.findById(dto.getIdProveedor()).orElse(null);
            if (proveedor == null) return ResponseEntity.badRequest().body("Proveedor no encontrado");

            OrdenCompra orden = OrdenCompra.builder()
                    .proveedor(proveedor)
                    .fechaEmision(dto.getFechaEmision())
                    .fechaEntregaEsperada(dto.getFechaEntregaEsperada())
                .condicionPago(dto.getCondicionPago())
                .direccionEntrega(dto.getDireccionEntrega())
                .observaciones(dto.getObservaciones())
                    .subtotal(dto.getSubtotal())
                    .porcentajeIva(dto.getPorcentajeIva())
                    .porcentajeDescuento(dto.getPorcentajeDescuento())
                    .totalFinal(dto.getTotalFinal())
                    .estado(dto.getEstado() != null ? dto.getEstado() : "PENDIENTE")
                    .build();

            List<DetalleOrdenCompra> detalles = dto.getDetalles().stream().map(d -> {
                Producto producto = productoRepository.findById(d.getIdProducto()).orElseThrow();
                return DetalleOrdenCompra.builder()
                        .ordenCompra(orden)
                        .producto(producto)
                        .cantidad(d.getCantidad())
                        .costoUnitario(d.getCostoUnitario())
                        .subtotal(d.getSubtotal())
                        .build();
            }).collect(Collectors.toList());

            orden.setDetalles(detalles);

            OrdenCompra guardada = ordenCompraRepository.save(orden);
            return ResponseEntity.ok(guardada);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al guardar la orden de compra: " + e.getMessage());
        }
    }
}
