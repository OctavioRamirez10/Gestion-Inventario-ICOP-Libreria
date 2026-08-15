package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.MetodoPagoDTO;
import com.gestioninventariodemo2.cruddemo2.Services.MetodoPagoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/metodos-pago")
@RequiredArgsConstructor
public class MetodoPagoController {

    private final MetodoPagoService metodoPagoService;

    /**
     * Obtener todos los métodos de pago activos
     * GET /api/metodos-pago/activos
     */
    @GetMapping("/activos")
    public ResponseEntity<List<MetodoPagoDTO>> obtenerMetodosActivos() {
        List<MetodoPagoDTO> metodos = metodoPagoService.listarMetodosActivos();
        return ResponseEntity.ok(metodos);
    }

    /**
     * Obtener todos los métodos de pago (activos e inactivos)
     * GET /api/metodos-pago
     */
    @GetMapping
    public ResponseEntity<List<MetodoPagoDTO>> obtenerTodos() {
        List<MetodoPagoDTO> metodos = metodoPagoService.listarTodos();
        return ResponseEntity.ok(metodos);
    }
}
