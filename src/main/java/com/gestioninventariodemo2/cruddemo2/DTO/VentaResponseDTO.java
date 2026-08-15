package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentaResponseDTO {


    private Long idVenta;
    private LocalDateTime fecha;
    private String nombreCliente;
    private double total;
    private Double subtotal;
    private Double descuentoMonto;
    private List<ProductoVentaDTO> productos;
    private String nombreVendedor;
    private String rolVendedor;
    private String metodoPago;
    private Double montoPagado;
    private Double vuelto;
    private List<CobroResponseDTO> cobros;

}
