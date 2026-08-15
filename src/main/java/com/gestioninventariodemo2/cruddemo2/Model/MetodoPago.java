package com.gestioninventariodemo2.cruddemo2.Model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "metodo_pago")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MetodoPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idMetodoPago;

    private String nombre;
    private String descripcion;
    private Boolean requiereDatosExtra;
    private Boolean activo;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    @OneToMany(mappedBy = "metodoPago")
    private List<Cobro> cobros;

    @OneToMany(mappedBy = "metodoPago")
    private List<Pago> pagos;
}
