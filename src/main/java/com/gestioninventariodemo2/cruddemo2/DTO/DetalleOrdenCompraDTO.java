package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Data;

@Data
public class DetalleOrdenCompraDTO {
    private Long idProducto;
    private int cantidad;
    private double costoUnitario;
    private double subtotal;
}
