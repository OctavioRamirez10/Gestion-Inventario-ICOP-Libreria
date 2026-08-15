package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdfReportRequestDTO {
    private String estadoStock;
    private String categoria;
    private String proveedor;
    private String busqueda;
    private String sortField;
    private String sortDirection;
    private String filtrosAplicados;
    private String sortDescripcion;
}
