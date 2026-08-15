package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Model.Pago;
import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.PagoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.SesionCajaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository pagoRepository;
    private final SesionCajaRepository sesionCajaRepository;

    /**
     * Registrar un nuevo pago de compra
     */
    @Transactional
    public Pago registrarPago(Compra compra, MetodoPago metodoPago, BigDecimal importe, BigDecimal montoEntregado, BigDecimal vuelto,
            String tipoTarjeta, String estado, LocalDate fechaVencimiento, Usuario usuario) {

        Pago pago = new Pago();
        pago.setCompra(compra);
        pago.setMetodoPago(metodoPago);
        pago.setImporte(importe);
        pago.setMontoEntregado(montoEntregado);
        pago.setVuelto(vuelto);
        pago.setTipoTarjeta(tipoTarjeta);
        pago.setFechaPago(LocalDateTime.now());
        pago.setEstado(estado != null ? estado : "PAGADO");
        pago.setFechaVencimiento(fechaVencimiento);
        pago.setUsuario(usuario);

        sesionCajaRepository.findFirstByEstado("ABIERTA")
                .ifPresent(pago::setSesionCaja);

        return pagoRepository.save(pago);
    }

    public Pago registrarPagoDiferido(Compra compra, MetodoPago metodoPago, java.math.BigDecimal importe,
            String estado, java.time.LocalDateTime fechaPago, Usuario usuario) {
        Pago pago = new Pago();
        pago.setCompra(compra);
        pago.setMetodoPago(metodoPago);
        pago.setImporte(importe);
        pago.setTipoTarjeta(null);
        pago.setFechaPago(fechaPago != null ? fechaPago : java.time.LocalDateTime.now());
        pago.setEstado(estado != null ? estado : "PAGADO");
        pago.setFechaVencimiento(null);
        pago.setUsuario(usuario);
        
        sesionCajaRepository.findFirstByEstado("ABIERTA")
                .ifPresent(pago::setSesionCaja);

        return pagoRepository.save(pago);
    }

    /**
     * Obtener los pagos asociados a una compra
     */
    public java.util.List<Pago> obtenerPagosPorCompra(Long idCompra) {
        return pagoRepository.findByCompraIdCompra(idCompra);
    }
}
