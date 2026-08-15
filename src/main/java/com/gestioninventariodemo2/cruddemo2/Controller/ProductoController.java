package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoAuditoriaCompraDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoInventarioDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoRequestDTO;
import java.util.List;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSelectDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.PdfReportRequestDTO;
import com.gestioninventariodemo2.cruddemo2.Services.PdfReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Services.ProductoService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService productoService;
    private final PdfReportService pdfReportService;

    @PostMapping("/inventario/exportar-pdf")
    public ResponseEntity<byte[]> exportarInventarioPdf(@RequestBody PdfReportRequestDTO request) {
        List<ProductoInventarioDTO> productos = productoService.obtenerInventarioParaPdf(
                request.getEstadoStock(), request.getCategoria(), request.getProveedor(),
                request.getBusqueda(), request.getSortField(), request.getSortDirection());

        byte[] pdfBytes = pdfReportService.generarReporteInventarioPdf(
                productos, request.getFiltrosAplicados(), request.getSortDescripcion());

        String fechaActual = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy_MM_dd"));
        String filename = "Reporte_Inventario_" + fechaActual + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.add("Access-Control-Expose-Headers", "Content-Disposition");
        headers.setContentDispositionFormData("attachment", filename);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @PostMapping
    public ResponseEntity<Producto> crearProducto(@Valid @RequestBody ProductoRequestDTO dto) {
        Producto nuevo = productoService.crearProducto(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevo);
    }

    @GetMapping("/existe/nombre/{nombre}")
    public ResponseEntity<Boolean> verificarNombreExiste(
            @PathVariable String nombre, 
            @org.springframework.web.bind.annotation.RequestParam(required = false) Long excludeId) {
        boolean existe = productoService.existeNombre(nombre, excludeId);
        return ResponseEntity.ok(existe);
    }

    @GetMapping
    public ResponseEntity<Page<ProductoResponseDTO>> listarProductos(Pageable pageable) { // Spring inyecta Pageable
        Page<ProductoResponseDTO> productos = productoService.listarProductos(pageable);
        return ResponseEntity.ok(productos); // Devuelve el objeto Page
    }

    /**
     * Endpoint para la gestión de inventario.
     * Devuelve productos con información de stock combinada.
     */
    @GetMapping("/inventario")
    public ResponseEntity<Page<ProductoInventarioDTO>> listarInventario(Pageable pageable) {
        Page<ProductoInventarioDTO> inventario = productoService.listarInventario(pageable);
        return ResponseEntity.ok(inventario);
    }

    @GetMapping("/select")
    public ResponseEntity<List<ProductoSelectDTO>> listarProductosSelect(@org.springframework.web.bind.annotation.RequestParam(required = false) Long idProveedor) {
        List<ProductoSelectDTO> productos = productoService.listarProductosSelect(idProveedor);
        return ResponseEntity.ok(productos);
    }

    @GetMapping("/por-proveedor/{idProveedor}")
    public ResponseEntity<List<ProductoSelectDTO>> listarProductosPorProveedor(@PathVariable Long idProveedor) {
        List<ProductoSelectDTO> productos = productoService.listarProductosSelectPorProveedor(idProveedor);
        return ResponseEntity.ok(productos);
    }

    /**
     * Obtiene los proveedores asociados a un producto con teléfono y último costo.
     */
    @GetMapping("/{id}/proveedores")
    public ResponseEntity<List<com.gestioninventariodemo2.cruddemo2.DTO.ProveedorProductoDetalleDTO>> listarProveedoresDeProducto(@PathVariable Long id) {
        List<com.gestioninventariodemo2.cruddemo2.DTO.ProveedorProductoDetalleDTO> proveedores = productoService.listarProveedoresDeProducto(id);
        return ResponseEntity.ok(proveedores);
    }

    /**
     * Obtiene el historial y auditoría de compras de un producto con variaciones de costos.
     */
    @GetMapping("/{id}/historial-compras")
    public ResponseEntity<List<ProductoAuditoriaCompraDTO>> obtenerHistorialCompras(@PathVariable Long id) {
        List<ProductoAuditoriaCompraDTO> historial = productoService.obtenerAuditoriaComprasProducto(id);
        return ResponseEntity.ok(historial);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarProducto(@PathVariable Long id) {
        try {
            boolean softDelete = productoService.eliminarProducto(id);
            if (softDelete) {
                return ResponseEntity.ok("El producto se marcó como INACTIVO.");
            } else {
                return ResponseEntity.noContent().build();
            }
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error inesperado en el servidor: " + ex.getMessage());
        }
    }
}