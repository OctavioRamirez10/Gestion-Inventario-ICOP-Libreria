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
public class StockTablaDTO {
    private Long id;
    private String nombre;
    private String categoria;
    private Long idCategoria;
    private String descripcion;
    private Double precio;
    private int stock;
    private int stockMinimo;
    // Nuevos campos para el modal Stock Bajo
    private String proveedor;
    private String email;
    private String telefono;
    private Double precioCosto;
    private int totalProveedores;
    private List<String> otrosProveedores;
}
