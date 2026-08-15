package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AperturaCajaRequestDTO {
    private Long idUsuario;
    private Double montoInicialReal;
    private String observacionesApertura;
}
