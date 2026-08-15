package com.gestioninventariodemo2.cruddemo2.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class PagoRequestDTO {
    private Long idMetodoPago; // Obligatorio
    private BigDecimal importe; // Obligatorio para pagos mixtos (lo que salda la deuda)
    private BigDecimal montoEntregado; 
    private BigDecimal vuelto;
    private String tipoTarjeta; // Opcional
    private String estadoPago; // PAGADO o PENDIENTE
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaVencimientoPago; // Solo si estadoPago = PENDIENTE
}
