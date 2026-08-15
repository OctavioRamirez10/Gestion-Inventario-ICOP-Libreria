package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActualizarProductoDTO {

    @Size(max = 150)
    private String nombre;
    private Long idCategoria;
    @Size(max = 650)
    private String descripcion;
    private double precio;
    private int cantidadExtraStock;
    private Integer stockMinimo; // Nullable - solo actualizar si se proporciona
    private Integer stockMaximo; // Nullable - solo actualizar si se proporciona

}
