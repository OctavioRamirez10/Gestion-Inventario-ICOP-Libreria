package com.gestioninventariodemo2.cruddemo2.Model;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Detalle_Compra")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDetalleCompra;

    @Column(name = "Cantidad")
    private int cantidad;

    @Column(name = "Precio_Unitario")
    private double precioUnitario;

    @Transient
    private double nuevoPrecioVenta;

    @ManyToOne
    @JoinColumn(name = "idProducto")
    private Producto producto;

    
    @ManyToOne
    @JoinColumn(name = "idCompra")
    private Compra compra;



}
