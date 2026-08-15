package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.AgregarPagoCompraDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Services.CompraService;
import com.gestioninventariodemo2.cruddemo2.Services.CompraPdfService;

import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;
    private final CompraPdfService compraPdfService;
    private final com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository proveedorRepository;

    @PostMapping
    public ResponseEntity<Compra> registrarCompra(@Valid @RequestBody CompraRequestDTO dto, @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        // Llama al servicio. Si algo falla, lanzará una excepción
        // que será capturada por el manejador global.
        Compra compraGuardada = compraService.registrarCompra(dto, userDetails);

        // Si todo sale bien, devuelve 201 CREATED
        return ResponseEntity.status(HttpStatus.CREATED).body(compraGuardada);
    }

    @PostMapping("/{id}/pagos")
    public ResponseEntity<Void> agregarPago(@PathVariable Long id, @RequestBody AgregarPagoCompraDTO dto, @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        compraService.agregarPagoDiferido(id, dto, userDetails);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Page<CompraResponseDTO>> listarTodasLasCompras(
            Pageable pageable,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin,
            @RequestParam(required = false) String estadoPago,
            @RequestParam(required = false) Long proveedorId) {

        // Detectar campos de ordenamiento custom (productos, costoUnitario)
        String customSort = null;
        String customDirection = "asc";

        if (sort != null && (sort.startsWith("productos") || sort.startsWith("costoUnitario"))) {
            String[] parts = sort.split(",");
            customSort = parts[0];
            if (parts.length > 1) {
                customDirection = parts[1];
            }
        }

        // Parsear fechas opcionales
        LocalDate fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDate.parse(inicio) : null;
        LocalDate fechaFin = fin != null && !fin.isEmpty() ? LocalDate.parse(fin) : null;

        Page<CompraResponseDTO> compras = compraService.listarTodasLasCompras(
                pageable, customSort, customDirection, search, fechaInicio, fechaFin, estadoPago, proveedorId);
        return ResponseEntity.ok(compras);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompraResponseDTO> obtenerCompraPorId(@PathVariable Long id) {
        CompraResponseDTO compra = compraService.obtenerCompraPorId(id);
        return ResponseEntity.ok(compra);
    }

    @GetMapping("/exportar-pdf")
    public ResponseEntity<byte[]> exportarPdfCompras(
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin,
            @RequestParam(required = false) String estadoPago,
            @RequestParam(required = false) Long proveedorId) {

        // Detectar campos de ordenamiento custom
        String customSort = null;
        String customDirection = "asc";

        if (sort != null) {
            String[] parts = sort.split(",");
            customSort = parts[0];
            if (parts.length > 1) {
                customDirection = parts[1];
            }
        }

        LocalDate fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDate.parse(inicio) : null;
        LocalDate fechaFin = fin != null && !fin.isEmpty() ? LocalDate.parse(fin) : null;

        List<CompraResponseDTO> compras = compraService.obtenerComprasParaPdf(
                customSort, customDirection, search, fechaInicio, fechaFin, estadoPago, proveedorId);
        
        StringBuilder nombreBuilder = new StringBuilder("Reporte_Compras_");
        nombreBuilder.append(LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy_MM_dd")));

        if (inicio != null && fin != null && !inicio.isEmpty() && !fin.isEmpty()) {
            nombreBuilder.append("_Desde_").append(inicio).append("_Hasta_").append(fin);
        }
        if (estadoPago != null && !estadoPago.isEmpty()) {
            nombreBuilder.append("_").append(estadoPago.toUpperCase());
        }
        if (search != null && !search.isEmpty()) {
            nombreBuilder.append("_Busqueda_").append(search.replaceAll("[^a-zA-Z0-9_-]", ""));
        }

        String nombreProveedor = null;
        if (proveedorId != null) {
            com.gestioninventariodemo2.cruddemo2.Model.Proveedor prov = proveedorRepository.findById(proveedorId).orElse(null);
            if (prov != null) {
                nombreProveedor = prov.getNombre();
                nombreBuilder.append("_Prov_").append(nombreProveedor.replaceAll("[^a-zA-Z0-9_-]", ""));
            }
        }
        
        String filename = nombreBuilder.toString() + ".pdf";

        // Ahora pasamos los filtros a generarPdfCompras
        byte[] pdfBytes = compraPdfService.generarPdfCompras(compras, fechaInicio, fechaFin, search, estadoPago, nombreProveedor);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Access-Control-Expose-Headers", "Content-Disposition");
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        headers.add("Content-Type", "application/pdf");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
