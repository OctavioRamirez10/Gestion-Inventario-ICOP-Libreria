package com.gestioninventariodemo2.cruddemo2.Model;

import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "orden_compra")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idOrden;

    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    @JsonIgnore
    private Proveedor proveedor;

    @Column(name = "fecha_emision")
    private LocalDate fechaEmision;

    @Column(name = "fecha_entrega_esperada")
    private LocalDate fechaEntregaEsperada;

    @Column(name = "condicion_pago")
    private String condicionPago;

    @Column(name = "direccion_entrega")
    private String direccionEntrega;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "subtotal")
    private double subtotal;

    @Column(name = "porcentaje_iva")
    private double porcentajeIva;

    @Column(name = "porcentaje_descuento")
    private double porcentajeDescuento;

    @Column(name = "total_final")
    private double totalFinal;

    @Column(name = "estado")
    private String estado;

    @OneToMany(mappedBy = "ordenCompra", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<DetalleOrdenCompra> detalles;
}
