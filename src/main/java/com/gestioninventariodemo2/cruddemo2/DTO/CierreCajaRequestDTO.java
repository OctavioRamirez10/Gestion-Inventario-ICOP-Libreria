package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CierreCajaRequestDTO {
    private Long idUsuario;
    private Double montoFinalReal;
    private String observacionesCierre;
    private Double fondoProximaApertura;
}
