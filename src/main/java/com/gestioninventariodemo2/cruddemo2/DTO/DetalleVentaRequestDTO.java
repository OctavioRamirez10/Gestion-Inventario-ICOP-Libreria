package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleVentaRequestDTO{

    private Long productoId;
    private int cantidad;
    private Double precioUnitario; // Si es null o 0, se usa el precio actual del producto

}
