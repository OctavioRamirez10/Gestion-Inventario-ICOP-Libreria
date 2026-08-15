package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoActualizadoDTO {

    private String nombre;
    private String categoria;
    private String descripcion;
    private double precio;
    private int stockActual;

}
