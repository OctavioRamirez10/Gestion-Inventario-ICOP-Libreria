package com.gestioninventariodemo2.cruddemo2.DTO;

import java.util.List;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProveedorUpdateDTO {

    @Size(max = 150)
    private String nombre;
    @Size(max = 20)
    private String telefono;
    @Size(max = 255)
    private String email;
    @Size(max = 200)
    private String direccion;
    @Size(max = 13)
    private String cuit;
    private List<Long> productosAgregar; 
    private List<Long> productosQuitar; 

}
