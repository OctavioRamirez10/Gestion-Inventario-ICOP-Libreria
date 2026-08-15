package com.gestioninventariodemo2.cruddemo2.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

@Data
public class AgregarPagoCompraDTO {
    private Long idMetodoPago;
    private BigDecimal importe;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaPago;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate nuevaFechaVencimiento;
}
