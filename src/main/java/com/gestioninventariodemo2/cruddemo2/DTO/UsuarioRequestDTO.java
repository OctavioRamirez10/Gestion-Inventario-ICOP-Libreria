package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioRequestDTO{

    @Size(max = 70)
    private String nombre;
    @Size(max = 70)
    private String apellido;
    @Size(max = 255)
    private String email;
    @Size(max = 100)
    private String contrasena;
    @Size(max = 100)
    private String confirmacionContrasena;
    private Long idRol;
    


    

}

