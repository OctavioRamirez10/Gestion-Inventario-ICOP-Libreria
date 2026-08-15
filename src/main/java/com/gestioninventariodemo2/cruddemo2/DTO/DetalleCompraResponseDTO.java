package com.gestioninventariodemo2.cruddemo2.DTO;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleCompraResponseDTO {
    
    private int cantidad;
    private String nombreProducto;
    private double precioUnitario;

}