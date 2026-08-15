package com.gestioninventariodemo2.cruddemo2.Model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pago")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPago;

    @ManyToOne
    @JoinColumn(name = "id_compra")
    private Compra compra;

    @ManyToOne
    @JoinColumn(name = "id_metodo_pago")
    private MetodoPago metodoPago;

    private BigDecimal importe;
    private BigDecimal montoEntregado; // Lo que el usuario entrega físicamente
    private BigDecimal vuelto; // Lo que se le devuelve
    private String tipoTarjeta;

    private LocalDateTime fechaPago;

    // Estado del pago: PAGADO o PENDIENTE
    private String estado;

    // Fecha de vencimiento (solo si estado = PENDIENTE)
    private LocalDate fechaVencimiento;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_sesion", nullable = true)
    private SesionCaja sesionCaja;
}
