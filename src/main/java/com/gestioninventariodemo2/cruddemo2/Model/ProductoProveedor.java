package com.gestioninventariodemo2.cruddemo2.Model;

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
@Table(name = "ProductoProveedor")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoProveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProductoProveedor;

    @ManyToOne
    @JoinColumn(name = "idProducto")
    private Producto producto;

    @ManyToOne
    @JoinColumn(name = "idProveedor")
    private Proveedor proveedor;

    @Column(name = "precio_costo")
    private Double precioCosto;

}
