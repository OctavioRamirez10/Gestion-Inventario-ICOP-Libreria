package com.gestioninventariodemo2.cruddemo2.Model;

import java.time.LocalDateTime;
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

@Entity
@Table(name = "Compras")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Compra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCompra;

    @Column(name = "fecha")
    private LocalDateTime fecha;

    @Column(name = "total")
    private double total;

    @Column(name = "fecha_vencimiento_pago")
    private java.time.LocalDate fechaVencimientoPago;

    @ManyToOne
    @JoinColumn(name = "idProveedor")
    private Proveedor proveedor;


    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL)
    private List<DetalleCompra>detalleCompras;

    // Relación con Pago (1 Compra : Muchos Pagos)
    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Pago> pagos;


}
