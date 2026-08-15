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
public class CajaResponseDTO {
    private Long idSesion;
    private Long idUsuario;
    private String nombreUsuario;
    private String rolUsuario;
    private Long idUsuarioCierre;
    private String nombreUsuarioCierre;
    private String rolUsuarioCierre;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private Double saldoAnterior;
    private Double montoInicialReal;
    private Double montoFinalReal;
    private Boolean diferenciaApertura;
    private String observacionesApertura;
    private String observacionesCierre;
    private String estado;
}
