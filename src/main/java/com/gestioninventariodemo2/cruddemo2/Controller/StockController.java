package com.gestioninventariodemo2.cruddemo2.Controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.ActualizarProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoActualizadoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.Services.ProductoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;



@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final ProductoService productoService;

    @GetMapping("/productos")
    public ResponseEntity<List<StockTablaDTO>>mostrarTablaProductos() {
        List<StockTablaDTO> productos = productoService.mostrarTablaStock();
        return ResponseEntity.ok(productos);
    }

    @GetMapping("/buscar-producto")
    public ResponseEntity<List<ProductoResponseDTO>> buscarProductoDesdeStock(@RequestParam String nombre) {
    List<ProductoResponseDTO> resultado = productoService.buscarPorNombre(nombre);
    return ResponseEntity.ok(resultado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoActualizadoDTO> editarProducto(@PathVariable Long id, @Valid @RequestBody ActualizarProductoDTO dto){
        ProductoActualizadoDTO productoActualizado= productoService.editarProducto(id, dto);
        return ResponseEntity.ok(productoActualizado);
    }
}
    


