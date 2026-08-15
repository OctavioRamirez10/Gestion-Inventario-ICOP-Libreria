package com.gestioninventariodemo2.cruddemo2.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProveedorResponseDTO {

    private Long id;
    private String nombre;
    private String telefono;
    private String email;
    private String direccion;
    private String cuit;
    private List<ProductoSimpleDTO> productos;

}
