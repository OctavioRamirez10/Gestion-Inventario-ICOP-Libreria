package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClienteResponseDTO {

    private Long idCliente;
    private String nombre;
    private String apellido;
    private String dni;
    private String telefono;
    private String direccion;
    private String email;

}
