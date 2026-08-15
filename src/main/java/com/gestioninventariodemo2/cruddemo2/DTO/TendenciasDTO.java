package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TendenciasDTO {
    private List<DatoDiario> datos;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DatoDiario {
        private LocalDate fecha;
        private Double ingresos;
        private Double egresos;
    }
}