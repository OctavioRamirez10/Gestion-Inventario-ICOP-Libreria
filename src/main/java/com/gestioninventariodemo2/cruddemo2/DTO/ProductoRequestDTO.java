package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoRequestDTO {

    @Size(max = 150)
    private String nombre;
    private Long idCategoria;
    @Size(max = 650)
    private String descripcion;

    @Min(value = 0, message = "El stock no puede ser negativo")
    @Max(value = 9999999, message = "El stock no puede superar 9.999.999")
    private int stockMinimo;

    @Min(value = 0, message = "El stock no puede ser negativo")
    @Max(value = 9999999, message = "El stock no puede superar 9.999.999")
    private int stockMaximo;
}
