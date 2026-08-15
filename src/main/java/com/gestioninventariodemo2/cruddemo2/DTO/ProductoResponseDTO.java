package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoResponseDTO {

    private String nombre;
    private String categoria;
    private String descripcion;
    private double precio;
    private LocalDate fechaCreacion;
    private int stockMinimo;
    private int stockMaximo;

}
