package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoSelectDTO {
    private Long idProducto;
    private String nombreProducto;
    private Double precioVenta;
    private Integer stockActual;
    private Double ultimoCosto;

}
