package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MetodoPagoDTO {
    private Long idMetodoPago;
    private String nombre;
    private String descripcion;
    private Boolean requiereDatosExtra;
    private Boolean activo;
}
