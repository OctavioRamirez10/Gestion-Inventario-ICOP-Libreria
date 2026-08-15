package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgotadoDTO {
    private String nombre;
    private String descripcion;
    private String proveedor;
    private String email;
    private String telefono;
    private Double precioCosto; 
}
