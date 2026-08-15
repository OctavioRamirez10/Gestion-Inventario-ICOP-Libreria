package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Pago;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    // Encontrar pagos por ID de compra (relación 1:N)
    List<Pago> findByCompraIdCompra(Long idCompra);

    // Obtener pagos por método de pago
    List<Pago> findByMetodoPagoIdMetodoPago(Long idMetodoPago);

    // Obtener pagos entre fechas
    List<Pago> findByFechaPagoBetween(LocalDateTime inicio, LocalDateTime fin);

    // Total por método de pago entre fechas (para reportes de caja)
    @Query("SELECT p.metodoPago.nombre, SUM(p.importe), COUNT(p) " +
            "FROM Pago p " +
            "WHERE p.fechaPago BETWEEN :inicio AND :fin " +
            "GROUP BY p.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPagoEntreFechas(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    // Total por método de pago por sesión específica (Arqueo Cajero)
    @Query("SELECT p.metodoPago.nombre, SUM(p.importe), COUNT(p) " +
            "FROM Pago p " +
            "WHERE p.sesionCaja.idSesion = :idSesion " +
            "GROUP BY p.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPagoPorSesion(@Param("idSesion") Long idSesion);
}
