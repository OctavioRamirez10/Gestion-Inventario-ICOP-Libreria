package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ClienteRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteSelectDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Model.Cobro;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.ClienteRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.CobroRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;
    private final CobroRepository cobroRepository;

    /**
     * Normaliza un DNI eliminando todo carácter que no sea dígito.
     * Así "36.222.999", "36-222-999" y "36222999" se tratan como iguales.
     */
    private String normalizeDni(String dni) {
        if (dni == null) return null;
        return dni.replaceAll("[^0-9]", "");
    }

    /**
     * Crea un nuevo cliente. Usado por el nuevo modal.
     */
    @Transactional
    public Cliente crearCliente(ClienteRequestDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
            dto.getDni() == null || dto.getDni().isBlank()) {
            throw new IllegalArgumentException("El nombre y el DNI son obligatorios.");
        }

        String dniNormalizado = normalizeDni(dto.getDni());

        if (clienteRepository.existsByDni(dniNormalizado)) {
            throw new IllegalArgumentException("Ya existe un cliente con el DNI: " + dto.getDni());
        }

        Cliente cliente = Cliente.builder()
                .nombre(dto.getNombre())
                .apellido(dto.getApellido())
                .dni(dniNormalizado)
                .telefono(dto.getTelefono())
                .direccion(dto.getDireccion())
                .email(dto.getEmail())
                .build();
        
        return clienteRepository.save(cliente); 
    }

    /**
     * Lista clientes para el buscador de 'Ventas'.
     */
    @Transactional(readOnly = true)
    public List<ClienteSelectDTO> listarClientesSelect() {
        return clienteRepository.findByActivoTrue() 
                .stream()
                .map(c -> new ClienteSelectDTO(
                        c.getIdCliente(), 
                        c.getNombre(), 
                        c.getApellido(), 
                        c.getDni()
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean existeDni(String dni) {
        return clienteRepository.existsByDni(normalizeDni(dni));
    }

    private ClienteResponseDTO mapToResponseDTO(Cliente c) {
        return ClienteResponseDTO.builder()
                .idCliente(c.getIdCliente())
                .nombre(c.getNombre())
                .apellido(c.getApellido())
                .dni(c.getDni())
                .telefono(c.getTelefono())
                .direccion(c.getDireccion())
                .email(c.getEmail())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> obtenerTodos(Pageable pageable) {
        return clienteRepository.findByActivoTrue(pageable).map(this::mapToResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> buscarClientes(String termino, Pageable pageable) {
        return clienteRepository.searchClientes(termino, pageable).map(this::mapToResponseDTO);
    }

    @Transactional(readOnly = true)
    public ClienteResponseDTO obtenerPorId(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
        if (cliente.getActivo() != null && !cliente.getActivo()) {
            throw new IllegalArgumentException("Cliente no encontrado");
        }
        return mapToResponseDTO(cliente);
    }

    @Transactional
    public Cliente actualizarCliente(Long id, ClienteRequestDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
        if (cliente.getActivo() != null && !cliente.getActivo()) {
            throw new IllegalArgumentException("Cliente no encontrado");
        }

        String dniNormalizado = normalizeDni(dto.getDni());
        
        if (!cliente.getDni().equals(dniNormalizado) && clienteRepository.existsByDni(dniNormalizado)) {
            throw new IllegalArgumentException("Ya existe otro cliente con el DNI: " + dto.getDni());
        }

        cliente.setNombre(dto.getNombre());
        cliente.setApellido(dto.getApellido());
        cliente.setDni(dniNormalizado);
        cliente.setTelefono(dto.getTelefono());
        cliente.setDireccion(dto.getDireccion());
        cliente.setEmail(dto.getEmail());

        return clienteRepository.save(cliente);
    }

    @Transactional
    public void eliminarCliente(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
        
        // Soft delete logic
        cliente.setActivo(false);
        clienteRepository.save(cliente);
    }

    /**
     * Obtiene las ventas asociadas a un cliente.
     */
    @Transactional(readOnly = true)
    public List<VentaResponseDTO> obtenerVentasDeCliente(Long idCliente) {
        // Verificar que el cliente existe y está activo
        Cliente cliente = clienteRepository.findById(idCliente)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
        if (cliente.getActivo() != null && !cliente.getActivo()) {
            throw new IllegalArgumentException("Cliente no encontrado");
        }

        List<Venta> ventas = ventaRepository.findByClienteIdClienteOrderByFechaDesc(idCliente);

        return ventas.stream().map(v -> {
            // Get payment method from Cobro entity
            String metodoPagoNombre = "-";
            java.util.List<Cobro> cobros = cobroRepository.findAllByVentaIdVenta(v.getIdVenta());
            if (!cobros.isEmpty() && cobros.get(0).getMetodoPago() != null) {
                metodoPagoNombre = cobros.get(0).getMetodoPago().getNombre();
            }

            return VentaResponseDTO.builder()
                .idVenta(v.getIdVenta())
                .fecha(v.getFecha())
                .total(v.getTotal())
                .nombreVendedor(v.getUsuario() != null ? v.getUsuario().getNombre() : "-")
                .nombreCliente(cliente.getNombre() + " " + (cliente.getApellido() != null ? cliente.getApellido() : ""))
                .metodoPago(metodoPagoNombre)
                .productos(v.getDetalleVentas() != null ? v.getDetalleVentas().stream()
                        .map(dv -> ProductoVentaDTO.builder()
                                .nombreProducto(dv.getProducto() != null ? dv.getProducto().getNombre() : "?")
                                .cantidad(dv.getCantidad())
                                .build())
                        .collect(Collectors.toList()) : List.of())
                .build();
        }).collect(Collectors.toList());
    }

}
