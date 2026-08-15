package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PagoResponseDTO {
    private Long idPago;
    private String metodoPago;
    private BigDecimal importe;
    private BigDecimal montoEntregado;
    private BigDecimal vuelto;
    private LocalDateTime fechaPago;
    private String estado;
}