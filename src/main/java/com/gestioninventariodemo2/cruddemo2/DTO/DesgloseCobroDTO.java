package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DesgloseCobroDTO {
    private String metodoPago;
    private Long cantidadOperaciones;
    private Double totalIngresado;
}
