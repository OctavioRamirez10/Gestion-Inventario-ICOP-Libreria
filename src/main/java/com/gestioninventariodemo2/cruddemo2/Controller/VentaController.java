package com.gestioninventariodemo2.cruddemo2.Controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.VentaPdfService;
import com.gestioninventariodemo2.cruddemo2.Services.VentaService;
import com.gestioninventariodemo2.cruddemo2.Services.MetodoPagoService;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ventas")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;
    private final VentaPdfService ventaPdfService;
    private final MetodoPagoService metodoPagoService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping
    public ResponseEntity<VentaResponseDTO> registrarVenta(@RequestBody VentaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        VentaResponseDTO nuevaVenta = ventaService.registrarVenta(dto, userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaVenta);
    }

    // MÉTODO MODIFICADO PARA PAGINACIÓN + FILTROS
    @GetMapping
    public ResponseEntity<Page<VentaResponseDTO>> listarVentas(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin,
            @RequestParam(required = false) Long vendedorId,
            @RequestParam(required = false) Long metodoPagoId) {

        LocalDate fechaInicio = (inicio != null && !inicio.isEmpty()) ? LocalDate.parse(inicio) : null;
        LocalDate fechaFin = (fin != null && !fin.isEmpty()) ? LocalDate.parse(fin) : null;

        Page<VentaResponseDTO> ventas = ventaService.listarVentas(
                pageable, search, fechaInicio, fechaFin, vendedorId, metodoPagoId);
        return ResponseEntity.ok(ventas);
    }

    // ENDPOINT PARA OBTENER TODAS LAS VENTAS (SIN PAGINACIÓN) - Para filtros
    @GetMapping("/all")
    public ResponseEntity<List<VentaResponseDTO>> listarTodasLasVentas() {
        List<VentaResponseDTO> ventas = ventaService.listarTodasLasVentas();
        return ResponseEntity.ok(ventas);
    }

    // ENDPOINT PARA OBTENER UNA VENTA POR ID
    @GetMapping("/{id}")
    public ResponseEntity<VentaResponseDTO> obtenerVentaPorId(@PathVariable Long id) {
        VentaResponseDTO venta = ventaService.obtenerVentaPorId(id);
        return ResponseEntity.ok(venta);
    }

    // ENDPOINT PARA EXPORTAR PDF DE VENTAS
    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportarVentasPdf(
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin,
            @RequestParam(required = false) Long vendedorId,
            @RequestParam(required = false) Long metodoPagoId) {

        String customSort = null;
        String customDirection = "desc";
        if (sort != null && !sort.isEmpty()) {
            String[] parts = sort.split(",");
            customSort = parts[0];
            if (parts.length > 1) {
                customDirection = parts[1];
            }
        }

        LocalDate fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDate.parse(inicio) : null;
        LocalDate fechaFin = fin != null && !fin.isEmpty() ? LocalDate.parse(fin) : null;

        List<VentaResponseDTO> ventas = ventaService.obtenerVentasParaPdf(
                customSort, customDirection, search, fechaInicio, fechaFin, vendedorId, metodoPagoId);

        StringBuilder nombreBuilder = new StringBuilder("Reporte_Ventas_");
        nombreBuilder.append(LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy_MM_dd")));

        if (inicio != null && fin != null && !inicio.isEmpty() && !fin.isEmpty()) {
            nombreBuilder.append("_Desde_").append(inicio).append("_Hasta_").append(fin);
        }
        if (search != null && !search.isEmpty()) {
            nombreBuilder.append("_Busqueda_").append(search.replaceAll("[^a-zA-Z0-9_-]", ""));
        }

        String metodoPagoNombre = null;
        if (metodoPagoId != null) {
            try {
                var metodo = metodoPagoService.obtenerPorId(metodoPagoId);
                metodoPagoNombre = metodo.getNombre();
                nombreBuilder.append("_Cobro_").append(metodoPagoNombre.replaceAll("[^a-zA-Z0-9_-]", ""));
            } catch (Exception e) {
                nombreBuilder.append("_CobroID_").append(metodoPagoId);
            }
        }

        String nombreVendedor = null;
        if (vendedorId != null) {
            try {
                Usuario u = usuarioRepository.findById(vendedorId).orElse(null);
                if (u != null) {
                    nombreVendedor = u.getNombre();
                    nombreBuilder.append("_Vendedor_").append(nombreVendedor.replaceAll("[^a-zA-Z0-9_-]", ""));
                } else {
                    nombreBuilder.append("_VendID_").append(vendedorId);
                }
            } catch (Exception e) {
                nombreBuilder.append("_VendID_").append(vendedorId);
            }
        }
        
        String filename = nombreBuilder.toString() + ".pdf";

        byte[] pdfBytes = ventaPdfService.generarPdfVentas(ventas, fechaInicio, fechaFin, search, metodoPagoNombre, nombreVendedor);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Access-Control-Expose-Headers", "Content-Disposition");
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        headers.add("Content-Type", "application/pdf");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    // ENDPOINT PARA GENERAR TICKET DE VENTA
    @GetMapping("/{id}/ticket")
    public ResponseEntity<byte[]> generarTicket(@PathVariable Long id) {
        var venta = ventaService.obtenerVentaEntity(id);
        byte[] pdfBytes = ventaPdfService.generarTicketVenta(venta);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
                "attachment",
                "Ticket_Venta_" + id + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

}
