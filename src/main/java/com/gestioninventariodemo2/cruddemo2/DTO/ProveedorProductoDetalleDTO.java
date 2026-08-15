package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para mostrar los proveedores asociados a un producto
 * en el modal de detalle del producto.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProveedorProductoDetalleDTO {
    private Long idProveedor;
    private String nombre;
    private String telefono;
    private String email;
    private Double ultimoCosto; // Precio unitario de la última compra con este proveedor
}
