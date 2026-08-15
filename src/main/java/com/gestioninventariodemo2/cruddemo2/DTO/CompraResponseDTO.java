package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CompraResponseDTO {

    private Long id;
    private LocalDateTime fecha;
    private double total;
    private String nombreProveedor;
    private String metodoPago;
    private String estadoPago;
    private LocalDate fechaVencimientoPago;
    private LocalDateTime fechaUltimoPago;
    private double montoPendiente;

    // Anidamos la lista de DTOs de detalle
    private List<DetalleCompraResponseDTO> productosComprados;
    private List<PagoResponseDTO> pagos;
}