package com.gestioninventariodemo2.cruddemo2.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sesiones_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SesionCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idSesion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_cierre")
    private Usuario usuarioCierre;

    @Column(nullable = false)
    private LocalDateTime fechaApertura;

    private LocalDateTime fechaCierre;

    @Column(nullable = false)
    private Double saldoAnterior;

    @Column(nullable = false)
    private Double montoInicialReal;

    private Double montoFinalReal;

    @Column(name = "diferencia_cierre")
    private Double diferenciaCierre;

    @Column(nullable = false)
    private Boolean diferenciaApertura;

    @Column(length = 255)
    private String observacionesApertura;

    @Column(length = 255)
    private String observacionesCierre;

    private Double fondoProximaApertura;

    @Column(nullable = false)
    private String estado;
}
