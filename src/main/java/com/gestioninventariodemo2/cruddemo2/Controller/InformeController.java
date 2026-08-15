package com.gestioninventariodemo2.cruddemo2.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.EstadoStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeDashboardDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.KPIsDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ResumenStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.TopProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentasComprasDiariasDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.AgotadoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.MetodoPagoUsoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.TopRentableDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.TopProveedorDTO;
import com.gestioninventariodemo2.cruddemo2.Services.InformeService;
import com.gestioninventariodemo2.cruddemo2.Services.InformePdfService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/informes")
@RequiredArgsConstructor
public class InformeController {

    private final InformeService informeService;
    private final InformePdfService informePdfService;

    @GetMapping("/resumen")
    public ResponseEntity<?> getResumen(
            @RequestParam(required = false) LocalDate inicio,
            @RequestParam(required = false) LocalDate fin) {
        if (inicio != null && fin != null) {
            // Caso con fechas → Informe detallado
            InformeResponseDTO informe = informeService.generarInforme(inicio, fin);
            return ResponseEntity.ok(informe);
        } else {
            InformeDashboardDTO dashboard = informeService.obtenerDashboard();
            return ResponseEntity.ok(dashboard);
        }
    }

    @GetMapping("/low-stock")
    public ResponseEntity<Page<StockTablaDTO>> getProductosConStockBajo(Pageable pageable) {
        Page<StockTablaDTO> productos = informeService.obtenerProductosConStockBajo(pageable);
        return ResponseEntity.ok(productos);
    }

    // Endpoint exclusivo para el modal: solo stock bajo real (excluye agotados)
    @GetMapping("/solo-stock-bajo")
    public ResponseEntity<Page<StockTablaDTO>> getSoloStockBajo(Pageable pageable) {
        Page<StockTablaDTO> productos = informeService.obtenerSoloStockBajo(pageable);
        return ResponseEntity.ok(productos);
    }

    // --- ¡AÑADÍ ESTE MÉTODO! ---
    @GetMapping("/resumen-stock")
    public ResponseEntity<ResumenStockDTO> getResumenStock() {
        ResumenStockDTO resumenStock = informeService.obtenerResumenStock();
        return ResponseEntity.ok(resumenStock);
    }

    @GetMapping("/exportar-pdf")
    public ResponseEntity<byte[]> exportarInformePDF(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        try {
            byte[] pdfBytes = informePdfService.generarPdfInformeCompleto(inicio, fin);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.builder("attachment")
                    .filename("Informe_Completo_" + inicio + "_" + fin + ".pdf")
                    .build());

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ==========================================================
    // NUEVOS ENDPOINTS PARA DASHBOARD DE INFORMES
    // ==========================================================

    @GetMapping("/kpis")
    public ResponseEntity<KPIsDTO> getKPIs(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        KPIsDTO kpis = informeService.obtenerKPIs(inicio, fin);
        return ResponseEntity.ok(kpis);
    }

    @GetMapping("/ventas-compras-diarias")
    public ResponseEntity<List<VentasComprasDiariasDTO>> getVentasComprasDiarias(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        List<VentasComprasDiariasDTO> datos = informeService.obtenerVentasComprasDiarias(inicio, fin);
        return ResponseEntity.ok(datos);
    }

    @GetMapping("/top-productos")
    public ResponseEntity<List<TopProductoDTO>> getTopProductos(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "5") Integer limit) {
        List<TopProductoDTO> topProductos = informeService.obtenerTopProductos(inicio, fin, limit);
        return ResponseEntity.ok(topProductos);
    }

    @GetMapping("/estado-stock")
    public ResponseEntity<EstadoStockDTO> getEstadoStock() {
        EstadoStockDTO estadoStock = informeService.obtenerEstadoStock();
        return ResponseEntity.ok(estadoStock);
    }

    @GetMapping("/agotados")
    public ResponseEntity<org.springframework.data.domain.Page<com.gestioninventariodemo2.cruddemo2.DTO.AgotadoDTO>> getProductosAgotados(
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<com.gestioninventariodemo2.cruddemo2.DTO.AgotadoDTO> agotados = informeService
                .obtenerProductosAgotados(pageable);
        return ResponseEntity.ok(agotados);
    }

    @GetMapping("/metodos-pago")
    public ResponseEntity<List<MetodoPagoUsoDTO>> getMetodosPago(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        List<MetodoPagoUsoDTO> metodosPago = informeService.obtenerMetodosPagoMasUtilizados(inicio, fin);
        return ResponseEntity.ok(metodosPago);
    }

    @GetMapping("/top-rentables")
    public ResponseEntity<List<TopRentableDTO>> getTopRentables(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "5") Integer limit) {
        List<TopRentableDTO> topRentables = informeService.obtenerTopRentables(inicio, fin, limit);
        return ResponseEntity.ok(topRentables);
    }

    @GetMapping("/top-proveedores")
    public ResponseEntity<List<TopProveedorDTO>> getTopProveedores(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "5") Integer limit) {
        List<TopProveedorDTO> topProveedores = informeService.obtenerTopProveedores(inicio, fin, limit);
        return ResponseEntity.ok(topProveedores);
    }

}
