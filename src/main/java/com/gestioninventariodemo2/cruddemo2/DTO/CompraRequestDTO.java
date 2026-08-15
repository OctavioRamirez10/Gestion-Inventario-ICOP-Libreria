package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.Valid;

// Opcional, pero recomendado
import lombok.Data;

@Data
public class CompraRequestDTO {
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fecha; // El usuario puede enviar la fecha
    private Long idProveedor; // Solo necesitamos el ID del proveedor

    @Valid
    private List<DetalleCompraRequestDTO> detalleCompras;

    // Lista de pagos mixtos
    private List<PagoRequestDTO> pagos;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaVencimientoPago; // Fecha para saldos pendientes
}