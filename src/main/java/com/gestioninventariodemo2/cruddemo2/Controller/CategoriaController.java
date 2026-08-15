package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Categoria;
import com.gestioninventariodemo2.cruddemo2.Services.CategoriaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    /**
     * Crear nueva categoría (usado por el modal)
     */
    @PostMapping
    public ResponseEntity<?> crearCategoria(@Valid @RequestBody CategoriaRequestDTO dto) {
        try {
            Categoria nuevaCategoria = categoriaService.crearCategoria(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaCategoria);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Listar categorías para selector (id + nombre)
     */
    @GetMapping("/select")
    public ResponseEntity<List<CategoriaSelectDTO>> listarCategoriasSelect() {
        return ResponseEntity.ok(categoriaService.listarCategoriasSelect());
    }

    /**
     * Listar todas las categorías con conteo de productos
     */
    @GetMapping
    public ResponseEntity<List<CategoriaResponseDTO>> listarTodas() {
        return ResponseEntity.ok(categoriaService.listarTodas());
    }

    /**
     * Actualizar una categoría existente
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarCategoria(@PathVariable Long id, @Valid @RequestBody CategoriaRequestDTO dto) {
        try {
            Categoria categoriaActualizada = categoriaService.actualizarCategoria(id, dto);
            return ResponseEntity.ok(categoriaActualizada);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Eliminar una categoría (solo si no tiene productos asociados)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Long id) {
        try {
            categoriaService.eliminarCategoria(id);
            return ResponseEntity.ok("Categoría eliminada exitosamente");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Obtener productos de una categoría
     */
    @GetMapping("/{id}/productos")
    public ResponseEntity<?> obtenerProductosDeCategoria(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(categoriaService.obtenerProductosPorCategoria(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
