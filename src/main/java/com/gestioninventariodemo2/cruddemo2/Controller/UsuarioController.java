package com.gestioninventariodemo2.cruddemo2.Controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

import org.springframework.web.bind.annotation.RequestParam;

import jakarta.validation.Valid;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.UsuarioService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    // CREAR USUARIO
    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> crearUsuario(@Valid @RequestBody UsuarioRequestDTO dto) {
        UsuarioResponseDTO nuevoUsuario = usuarioService.crearUsuario(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
    }

    @GetMapping
    public ResponseEntity<Page<UsuarioResponseDTO>> obtenerTodos(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long idRol) {
        Page<UsuarioResponseDTO> usuarios = usuarioService.obtenerTodosLosUsuarios(pageable, search, idRol);
        return ResponseEntity.ok(usuarios);
    }

    // LISTAR USUARIOS ACTIVOS (para dropdowns/selects)
    @GetMapping("/select")
    public ResponseEntity<java.util.List<UsuarioResponseDTO>> listarUsuariosSelect() {
        return ResponseEntity.ok(usuarioService.listarUsuariosSelect());
    }

    // ACTUALIZAR USUARIO
    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioRequestDTO dto) {
        try {
            UsuarioResponseDTO actualizado = usuarioService.actualizarUsuario(id, dto);
            return ResponseEntity.ok(actualizado);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ELIMINAR USUARIO
    @DeleteMapping("/{id}")
    public ResponseEntity<String> borrarUsuario(@PathVariable Long id) {
        usuarioService.borrarUsuario(id);
        return ResponseEntity.ok("Usuario eliminado correctamente");
    }

    // --- NUEVO ENDPOINT: OBTENER POR ID (Para el Modal) ---
    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerUsuarioPorId(@PathVariable Long id) {
        try {
            UsuarioResponseDTO usuario = usuarioService.obtenerUsuarioPorId(id);
            return ResponseEntity.ok(usuario);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // --- ENDPOINT: VERIFICAR EMAIL DUPLICADO ---
    @GetMapping("/check-email")
    public ResponseEntity<Boolean> verificarEmailExistente(@RequestParam String email) {
        boolean existe = usuarioService.existeEmail(email);
        return ResponseEntity.ok(existe);
    }

}
