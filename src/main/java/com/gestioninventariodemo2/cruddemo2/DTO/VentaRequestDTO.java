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
public class VentaRequestDTO {
    private Long idCliente;
    private List<DetalleVentaRequestDTO> detalles;
    private LocalDate fecha;

    // Múltiples cobros (nuevo)
    private List<CobroItemDTO> cobros;

    // Cobro simple — legacy (solo si cobros == null)
    private Long idMetodoPago;
    private String tipoTarjeta;
    private Double montoPagado;

    // Descuento
    private Double descuento;
    private String tipoDescuento; // "$" o "%"
}
