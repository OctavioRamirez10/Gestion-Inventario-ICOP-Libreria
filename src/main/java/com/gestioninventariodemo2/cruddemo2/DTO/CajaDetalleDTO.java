package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CajaDetalleDTO {
    private Long idSesion;
    private Double montoInicial;
    private Double totalVentas;
    private Double totalCompras;
    private Double totalComprasEfectivo;
    private Double saldoEsperado;
    private LocalDateTime fechaApertura;

    // Nuevas métricas para el Dashboard Analítico
    private Long cantidadVentas;
    private Double totalEfectivo;
    private Double totalTarjeta;
    private Double totalTransferencia;

    // Detalle de métodos de pago (cobros)
    private List<DesgloseCobroDTO> desgloseCobros;
}
