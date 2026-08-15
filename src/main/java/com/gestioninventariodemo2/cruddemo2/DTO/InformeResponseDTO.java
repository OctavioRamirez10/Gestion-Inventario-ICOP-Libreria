package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InformeResponseDTO {

    // Constructor extra para JPA cuando recibe parámetros LocalDateTime
    public InformeResponseDTO(LocalDateTime inicio, LocalDateTime fin, Long totalVentas, Long totalCantidad, Double totalImporte, String productoMasVendido) {
        this.inicio = inicio != null ? inicio.toLocalDate() : null;
        this.fin = fin != null ? fin.toLocalDate() : null;
        this.totalVentas = totalVentas;
        this.totalCantidad = totalCantidad;
        this.totalImporte = totalImporte;
        this.productoMasVendido = productoMasVendido;
    }

    private LocalDate inicio;
    private LocalDate fin;
    private Long totalVentas;
    private Long totalCantidad;
    private Double totalImporte;
    private String productoMasVendido;
    

    


    
    




}
