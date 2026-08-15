package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class DetalleCompraRequestDTO {
    
    @Min(value = 1, message = "La cantidad debe ser mayor a 0")
    @Max(value = 999999, message = "La cantidad máxima permitida es 999999")
    private int cantidad;

    @Min(value = 0, message = "El precio no puede ser negativo")
    @Max(value = 9999999999L, message = "El precio excede el límite máximo permitido")
    private double precioUnitario; // El costo de compra

    @Min(value = 0, message = "El precio no puede ser negativo")
    @Max(value = 9999999999L, message = "El precio excede el límite máximo permitido")
    private double nuevoPrecioVenta; // El precio al que se venderá
    
    private Long idProducto; // Solo necesitamos el ID del producto
}