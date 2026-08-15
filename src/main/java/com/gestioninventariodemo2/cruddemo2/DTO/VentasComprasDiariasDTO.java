package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentasComprasDiariasDTO {
    private LocalDate fecha;
    private Double ventas;
    private Double compras;
}
