package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistorialSesionDTO {
    private Long idSesion;
    private String operador;
    private String rolOperador;
    private String operadorCierre;
    private String rolCierre;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private Double montoInicial;
    private Double montoFinalReal;
    private String estado;
    private String duracion;
    private Double diferencia; // montoFinalReal - saldoEsperado (si aplica)
    private Double totalFacturado;
    private Double ingresosEfectivo;
    private Double egresosEfectivo;
    private Double saldoEsperado;
    private Double ventasTarjeta;
    private Double ventasTransferencia;
    private String observacionesApertura;
    private String observacionesCierre;
}
