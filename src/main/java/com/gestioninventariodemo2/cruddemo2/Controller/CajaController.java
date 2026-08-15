package com.gestioninventariodemo2.cruddemo2.Controller;

import com.gestioninventariodemo2.cruddemo2.DTO.AperturaCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.CajaService;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping("/estado/{idUsuario}")
    public ResponseEntity<Map<String, Object>> estadoCaja(@PathVariable Long idUsuario) {
        boolean estaAbierta = cajaService.verificarCajaActiva(idUsuario);
        Map<String, Object> ultimoCierre = cajaService.obtenerDetalleUltimoCierre();

        Map<String, Object> response = new HashMap<>();
        response.put("abierta", estaAbierta);
        response.put("saldoAnterior", ultimoCierre.get("saldo"));
        response.put("ultimoCierreInfo", ultimoCierre);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/abrir")
    public ResponseEntity<?> abrirCaja(@RequestBody AperturaCajaRequestDTO request) {
        try {
            CajaResponseDTO sesion = cajaService.abrirCaja(request);
            return ResponseEntity.ok(sesion);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    @GetMapping("/sesion-activa/{idUsuario}")
    public ResponseEntity<com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO> resumenCaja(@PathVariable Long idUsuario) {
        try {
            return ResponseEntity.ok(cajaService.obtenerResumenCaja(idUsuario));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/sesion-activa/me")
    public ResponseEntity<com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO> resumenCajaMe(@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        try {
            Usuario usuario = usuarioRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            return ResponseEntity.ok(cajaService.obtenerResumenCaja(usuario.getIdUsuario()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/resumen-global")
    public ResponseEntity<com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO> resumenGlobal() {
        try {
            return ResponseEntity.ok(cajaService.obtenerResumenGlobalActivo());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/cerrar")
    public ResponseEntity<?> cerrarCaja(@RequestBody com.gestioninventariodemo2.cruddemo2.DTO.CierreCajaRequestDTO request) {
        try {
            CajaResponseDTO sesionCerrada = cajaService.cerrarCaja(request);
            return ResponseEntity.ok(sesionCerrada);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @GetMapping("/historial")
    public ResponseEntity<org.springframework.data.domain.Page<com.gestioninventariodemo2.cruddemo2.DTO.HistorialSesionDTO>> getHistorial(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate fechaApertura,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate fechaCierre,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long operadorId,
            @RequestParam(defaultValue = "false") boolean soloDiferencias,
            @RequestParam(required = false) String busqueda,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(cajaService.obtenerHistorialSesiones(
                fechaApertura, fechaCierre, estado, operadorId, soloDiferencias, busqueda, pageable));
    }

    @GetMapping("/historial/operadores")
    public ResponseEntity<List<Map<String, Object>>> getOperadores() {
        return ResponseEntity.ok(cajaService.obtenerOperadores());
    }
}
