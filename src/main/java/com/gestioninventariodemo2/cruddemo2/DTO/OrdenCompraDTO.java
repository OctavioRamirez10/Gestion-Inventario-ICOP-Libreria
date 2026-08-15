package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class OrdenCompraDTO {
    private Long idProveedor;
    private LocalDate fechaEmision;
    private LocalDate fechaEntregaEsperada;
    private String condicionPago;
    private String direccionEntrega;
    private String observaciones;
    private double subtotal;
    private double porcentajeIva;
    private double porcentajeDescuento;
    private double totalFinal;
    private String estado;
    private List<DetalleOrdenCompraDTO> detalles;
}
