package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;

import jakarta.validation.Valid;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Services.ClienteService;

import lombok.AllArgsConstructor;
@RestController
@RequestMapping("/api/clientes")
@AllArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @PostMapping
    public ResponseEntity<Cliente> crearCliente(@Valid @RequestBody ClienteRequestDTO dto) {
        // Las validaciones (DNI duplicado, etc.) se manejan en el servicio
        // y se capturan por el GlobalExceptionHandler
        Cliente nuevoCliente = clienteService.crearCliente(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoCliente);
    }

    @GetMapping("/select")
    public ResponseEntity<List<ClienteSelectDTO>> listarClientesSelect() {
        return ResponseEntity.ok(clienteService.listarClientesSelect());
    }

    @GetMapping("/existe/dni/{dni}")
    public ResponseEntity<Boolean> existeDni(@PathVariable String dni) {
        return ResponseEntity.ok(clienteService.existeDni(dni));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<ClienteResponseDTO>> obtenerTodos(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(clienteService.buscarClientes(search.trim(), pageable));
        }
        return ResponseEntity.ok(clienteService.obtenerTodos(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> actualizarCliente(
            @PathVariable Long id,
            @Valid @RequestBody ClienteRequestDTO dto) {
        Cliente clienteActualizado = clienteService.actualizarCliente(id, dto);
        return ResponseEntity.ok(clienteActualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarCliente(@PathVariable Long id) {
        clienteService.eliminarCliente(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/ventas")
    public ResponseEntity<List<com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO>> obtenerVentasDeCliente(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerVentasDeCliente(id));
    }

}

