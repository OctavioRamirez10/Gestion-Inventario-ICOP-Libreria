package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KPIsDTO {
    private Double totalVentas;
    private Double totalCompras;
    private Double ganancia;
    private Integer productosStockBajo;
    private Long cantidadVentas;
    private Long productosVendidos;
    private Double valorInventario;
    private Double gananciaProyectada;
    private Double gananciaReal;
    
    // Nuevas métricas para Flujo de Caja
    private Double comprasEnEfectivo;
    private Double flujoCajaLibre;
}
