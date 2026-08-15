package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopProveedorDTO {
    private String nombreProveedor;
    private Double totalComprado;
    private Long cantidadCompras;
}
