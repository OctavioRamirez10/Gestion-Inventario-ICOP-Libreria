package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoAuditoriaCompraDTO {
    private Long idCompra;
    private LocalDateTime fechaCompra;
    private Long idProveedor;
    private String nombreProveedor;
    private int cantidad;
    private double costoUnitario;
    private Double variacionMonto;      // Diferencia en $ respecto a la compra anterior
    private Double variacionPorcentaje; // Diferencia en % respecto a la compra anterior
    private Long diasDesdeCompraAnterior; // Días transcurridos desde la compra previa
    private double subtotal;
}
