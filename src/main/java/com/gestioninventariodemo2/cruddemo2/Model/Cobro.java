package com.gestioninventariodemo2.cruddemo2.Model;

import java.math.BigDecimal;
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
@Table(name = "cobro")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cobro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCobro;

    @ManyToOne
    @JoinColumn(name = "id_venta")
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "id_metodo_pago")
    private MetodoPago metodoPago;

    private BigDecimal importe;
    private BigDecimal montoPagado;
    private BigDecimal vuelto;
    private String tipoTarjeta;

    private LocalDateTime fechaCobro;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_sesion", nullable = true)
    private SesionCaja sesionCaja;
}
