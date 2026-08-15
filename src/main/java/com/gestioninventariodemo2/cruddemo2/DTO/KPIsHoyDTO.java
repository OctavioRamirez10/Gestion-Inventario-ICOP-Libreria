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
public class KPIsHoyDTO {
    private LocalDate fecha;
    private Double ingresos;
    private Double egresos;
    private Double ganancia;
    private Double comparacionIngresos;
    private Double comparacionEgresos;
    private Integer productosAgotados;
    private Integer productosStockBajo;
    private Long cantidadVentas;
    private Long productosVendidos;
}