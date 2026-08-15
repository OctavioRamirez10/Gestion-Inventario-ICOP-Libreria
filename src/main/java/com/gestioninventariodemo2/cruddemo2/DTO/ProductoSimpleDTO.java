package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoSimpleDTO {
    private Long idProducto;
    private String nombreProducto;
    private String descripcion;
    private double precio;
    private int stock;
    private double ultimoCosto;
    private double margen;
}
