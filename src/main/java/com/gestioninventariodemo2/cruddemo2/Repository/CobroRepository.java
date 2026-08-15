package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Cobro;

@Repository
public interface CobroRepository extends JpaRepository<Cobro, Long> {

    // Obtener todos los cobros de una venta
    List<Cobro> findAllByVentaIdVenta(Long idVenta);

    // Obtener cobros por método de pago
    List<Cobro> findByMetodoPagoIdMetodoPago(Long idMetodoPago);

    // Obtener cobros entre fechas
    List<Cobro> findByFechaCobroBetween(LocalDateTime inicio, LocalDateTime fin);

    // Consulta personalizada para reportes: total por método de pago
    @Query("SELECT c.metodoPago.nombre, SUM(c.importe), COUNT(c) " +
            "FROM Cobro c " +
            "GROUP BY c.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPago();

    // Total por método de pago entre fechas
    @Query("SELECT c.metodoPago.nombre, SUM(c.importe), COUNT(c) " +
            "FROM Cobro c " +
            "WHERE c.fechaCobro BETWEEN :inicio AND :fin " +
            "GROUP BY c.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPagoEntreFechas(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    // Total por método de pago por sesión específica (Arqueo Cajero)
    @Query("SELECT c.metodoPago.nombre, SUM(c.importe), COUNT(c) " +
            "FROM Cobro c " +
            "WHERE c.sesionCaja.idSesion = :idSesion " +
            "GROUP BY c.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPagoPorSesion(@Param("idSesion") Long idSesion);
}
