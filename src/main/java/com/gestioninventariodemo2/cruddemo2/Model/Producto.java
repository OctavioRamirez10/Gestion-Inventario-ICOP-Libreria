package com.gestioninventariodemo2.cruddemo2.Model;

import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProducto;

    @Size(max = 150)
    @Column(name = "Nombre", length = 150)
    private String nombre;

    @Size(max = 650)
    @Column(name = "descripción", length = 650)
    private String descripcion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_id", referencedColumnName = "idCategoria")
    private Categoria categoria;

    @Column(name = "precio")
    private double precio;

    @Column(name = "estado")
    private String estado;

    @Column(name = "fecha_creacion")
    private LocalDate fechaCreacion;

    @OneToMany(mappedBy = "producto")
    private List<DetalleVenta> detalleVentas;

    @OneToMany(mappedBy = "producto")
    private List<DetalleCompra> detalleCompras;

    @OneToMany(mappedBy = "producto")
    private List<Stock> stocks;

    @OneToMany(mappedBy = "producto")
    private List<ProductoProveedor> productoProveedores;

}
