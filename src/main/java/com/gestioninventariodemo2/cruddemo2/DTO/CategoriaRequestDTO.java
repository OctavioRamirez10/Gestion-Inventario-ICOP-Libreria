package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaRequestDTO {
    @Size(max = 50)
    private String nombre;
}
