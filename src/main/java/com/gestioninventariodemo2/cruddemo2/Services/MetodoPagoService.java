package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.MetodoPagoDTO;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Repository.MetodoPagoRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MetodoPagoService {

    private final MetodoPagoRepository metodoPagoRepository;

    /**
     * Obtener todos los métodos de pago activos
     */
    public List<MetodoPagoDTO> listarMetodosActivos() {
        return metodoPagoRepository.findByActivoTrue().stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtener todos los métodos de pago (activos e inactivos)
     */
    public List<MetodoPagoDTO> listarTodos() {
        return metodoPagoRepository.findAll().stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtener método de pago por ID
     */
    public MetodoPago obtenerPorId(Long id) {
        return metodoPagoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Método de pago no encontrado con ID: " + id));
    }

    /**
     * Verificar si un método requiere datos extra
     */
    public boolean requiereDatosExtra(Long idMetodoPago) {
        MetodoPago metodo = obtenerPorId(idMetodoPago);
        return metodo.getRequiereDatosExtra();
    }

    /**
     * Convertir entidad a DTO
     */
    private MetodoPagoDTO convertirADTO(MetodoPago metodo) {
        return MetodoPagoDTO.builder()
                .idMetodoPago(metodo.getIdMetodoPago())
                .nombre(metodo.getNombre())
                .descripcion(metodo.getDescripcion())
                .requiereDatosExtra(metodo.getRequiereDatosExtra())
                .activo(metodo.getActivo())
                .build();
    }
}
