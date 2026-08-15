package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.CobroResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Model.Cobro;
import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.CobroRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.SesionCajaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CobroService {

    private final CobroRepository cobroRepository;
    private final SesionCajaRepository sesionCajaRepository;

    /**
     * Registrar un nuevo cobro
     */
    @Transactional
    public Cobro registrarCobro(Venta venta, MetodoPago metodoPago, BigDecimal importe,
            String tipoTarjeta,
            BigDecimal montoPagado, BigDecimal vuelto, Usuario usuario) {

        Cobro cobro = new Cobro();
        cobro.setVenta(venta);
        cobro.setMetodoPago(metodoPago);
        cobro.setImporte(importe);
        cobro.setTipoTarjeta(tipoTarjeta);
        cobro.setMontoPagado(montoPagado);
        cobro.setVuelto(vuelto);
        cobro.setFechaCobro(LocalDateTime.now());
        cobro.setUsuario(usuario);

        // Asignar sesión de caja si existe una abierta
        sesionCajaRepository.findFirstByEstado("ABIERTA")
                .ifPresent(cobro::setSesionCaja);

        return cobroRepository.save(cobro);
    }

    /**
     * Obtener primer cobro de una venta (compatibilidad con PDF y respuesta legacy)
     */
    public CobroResponseDTO obtenerCobroPorVenta(Long idVenta) {
        List<Cobro> cobros = cobroRepository.findAllByVentaIdVenta(idVenta);
        return (cobros != null && !cobros.isEmpty()) ? convertirADTO(cobros.get(0)) : null;
    }

    /**
     * Obtener todos los cobros de una venta
     */
    public List<CobroResponseDTO> obtenerCobrosPorVenta(Long idVenta) {
        List<Cobro> cobros = cobroRepository.findAllByVentaIdVenta(idVenta);
        return cobros.stream().map(this::convertirADTO).collect(Collectors.toList());
    }

    /**
     * Obtener todos los cobros por método de pago
     */
    public List<CobroResponseDTO> listarPorMetodoPago(Long idMetodoPago) {
        return cobroRepository.findByMetodoPagoIdMetodoPago(idMetodoPago).stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtener reporte de totales por método de pago
     */
    public List<Object[]> obtenerReporteTotalesPorMetodo() {
        return cobroRepository.obtenerTotalPorMetodoPago();
    }

    /**
     * Obtener reporte de totales por método de pago entre fechas
     */
    public List<Object[]> obtenerReporteTotalesPorMetodoEntreFechas(LocalDate inicio, LocalDate fin) {
        LocalDateTime inicioDateTime = inicio.atStartOfDay();
        LocalDateTime finDateTime = fin.atTime(23, 59, 59);
        return cobroRepository.obtenerTotalPorMetodoPagoEntreFechas(inicioDateTime, finDateTime);
    }

    /**
     * Convertir entidad a DTO
     */
    private CobroResponseDTO convertirADTO(Cobro cobro) {
        return CobroResponseDTO.builder()
                .idCobro(cobro.getIdCobro())
                .idVenta(cobro.getVenta().getIdVenta())
                .metodoPago(cobro.getMetodoPago().getNombre())
                .importe(cobro.getImporte())
                .montoPagado(cobro.getMontoPagado())
                .vuelto(cobro.getVuelto())
                .tipoTarjeta(cobro.getTipoTarjeta())
                .fechaCobro(cobro.getFechaCobro().toLocalDate())
                .nombreUsuario(cobro.getUsuario() != null ? cobro.getUsuario().getNombre() : "N/A")
                .build();
    }
}
