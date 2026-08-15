package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InformeDashboardDTO {

    private Long ventasMes;
    private Long ventasHistoricas;

    private Long productoMes;
    private Long productoHistoricos;

    private Double recaudacionMes;

    private String productoMasVendidoMes;
    private String productoMenosVendidoMes;

}
