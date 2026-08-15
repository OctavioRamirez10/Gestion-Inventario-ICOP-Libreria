package com.gestioninventariodemo2.cruddemo2.Model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Proveedor")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proveedor {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProveedor;

    @Size(max = 70)
    @Column(name = "Nombre", length = 70)
    private String nombre;

    @Size(max = 20)
    @Column(name = "Telefono", length = 20)
    private String telefono;

    @Size(max = 80)
    @Column(name = "Email", length = 80)
    private String email;

    @Size(max = 100)
    @Column(name = "Direccion", length = 100)
    private String direccion;

    @Size(max = 13)
    @Column(name = "Cuit", length = 13)
    private String cuit;

    @Column(name = "estado")
    @Builder.Default
    private String estado = "ACTIVO";

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Compra>compras = new ArrayList<>();

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductoProveedor>productoProveedor = new ArrayList<>();



}
