package com.gestioninventariodemo2.cruddemo2.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CobroItemDTO {
    private Long idMetodoPago;
    private BigDecimal importe;
    private String tipoTarjeta;
    private BigDecimal montoPagado;
    private BigDecimal vuelto;
}
