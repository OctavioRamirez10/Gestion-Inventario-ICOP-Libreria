package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para la vista de Gestión de Inventario que combina información de
 * Producto y Stock.
 * Incluye todos los datos necesarios para mostrar en la tabla y en el modal de
 * detalles.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoInventarioDTO {

    // ID del producto
    private Long idProducto;

    // Información básica del producto
    private String nombre;
    private String categoria;
    private String descripcion;

    // Información comercial
    private double precio;
    private LocalDate fechaCreacion;

    // Gestión de stock
    private int stockActual;
    private int stockMinimo;
    private int stockMaximo;

    // Estado calculado del stock
    private String estadoStock; // "BUENO", "BAJO", "AGOTADO"

    // Información del proveedor y costo
    private String proveedorNombre; // Nombre del último proveedor
    private String proveedorTelefono; // Teléfono del último proveedor
    private Double precioCosto;     // Último precio de costo unitario
    private int totalProveedores;   // Cantidad total de proveedores distintos
    private List<String> otrosProveedores; // Nombres de los demás proveedores (para popover)
}
