package com.gestioninventariodemo2.cruddemo2.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CobroResponseDTO {
    private Long idCobro;
    private Long idVenta;
    private String metodoPago;
    private BigDecimal importe;
    private BigDecimal montoPagado;
    private BigDecimal vuelto;
    private String tipoTarjeta;
    private LocalDate fechaCobro;
    private String nombreUsuario;
}
