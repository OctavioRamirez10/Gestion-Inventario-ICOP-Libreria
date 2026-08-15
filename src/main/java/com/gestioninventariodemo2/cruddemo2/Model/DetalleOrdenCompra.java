package com.gestioninventariodemo2.cruddemo2.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "detalle_orden_compra")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleOrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDetalle;

    @ManyToOne
    @JoinColumn(name = "id_orden")
    @JsonIgnore
    private OrdenCompra ordenCompra;

    @ManyToOne
    @JoinColumn(name = "id_producto")
    private Producto producto;

    @Column(name = "cantidad")
    private int cantidad;

    @Column(name = "costo_unitario")
    private double costoUnitario;

    @Column(name = "subtotal")
    private double subtotal;
}
