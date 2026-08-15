package com.gestioninventariodemo2.cruddemo2.Model;

import java.util.List;

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
@Table(name = "clientes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCliente;

    @Size(max = 70)
    @Column(name = "nombre", length = 70)
    private String nombre;

    @Size(max = 70)
    @Column(name = "apellido", length = 70)
    private String apellido;

    @Size(max = 10)
    @Column(name = "dni", length = 10)
    private String dni;

    @Size(max = 20)
    @Column(name = "telefono", length = 20)
    private String telefono;

    @Size(max = 100)
    @Column(name = "direccion", length = 100)
    private String direccion;

    @Size(max = 80)
    @Column(name = "email", length = 80)
    private String email;

    @Builder.Default
    @Column(name = "activo", columnDefinition = "boolean default true")
    private Boolean activo = true;

    @OneToMany(mappedBy = "cliente")
    private List<Venta> ventas;

}
