package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;

public interface VentaRepository extends JpaRepository<Venta, Long>, JpaSpecificationExecutor<Venta> {

    @Query("""
            SELECT new com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO(
                :inicio,
                :fin,
                COUNT(DISTINCT v.id),
                SUM(dv.cantidad),
                SUM(v.total),
                null
            )
            FROM Venta v
            JOIN v.detalleVentas dv
            WHERE v.fecha BETWEEN :inicio AND :fin
            """)
    InformeResponseDTO obtenerResumenVentas(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    @Query(value = """
            SELECT p.nombre
            FROM detalle_venta dv
            JOIN productos p ON dv.id_producto = p.id_producto
            JOIN ventas v ON dv.id_venta = v.id_venta
            WHERE v.fecha BETWEEN :inicio AND :fin
            GROUP BY p.id_producto, p.nombre
            ORDER BY SUM(dv.cantidad) DESC
            LIMIT 1
            """, nativeQuery = true)
    String obtenerProductoMasVendido(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    @Query("SELECT COUNT(v) FROM Venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Long countVentasEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query("SELECT SUM(dv.cantidad) FROM DetalleVenta dv JOIN dv.venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Long sumProductosEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query("SELECT SUM(v.total) FROM Venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Double sumRecaudacionEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query("""
            SELECT p.nombre
            FROM DetalleVenta dv
            JOIN dv.producto p
            JOIN dv.venta v
            WHERE v.fecha BETWEEN :inicio AND :fin
            GROUP BY p.id, p.nombre
            ORDER BY SUM(dv.cantidad) DESC
            """)
    List<String> obtenerProductoMasVendidoEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query("""
            SELECT p.nombre
            FROM DetalleVenta dv
            JOIN dv.producto p
            JOIN dv.venta v
            WHERE v.fecha BETWEEN :inicio AND :fin
            GROUP BY p.id, p.nombre
            ORDER BY SUM(dv.cantidad) ASC
            """)
    List<String> obtenerProductoMenosVendidoEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query("SELECT COUNT(v) FROM Venta v")
    Long countVentasHistoricas();

    @Query("SELECT SUM(dv.cantidad) FROM DetalleVenta dv")
    Long sumProductosHistoricos();

    // ==========================================================
    // NUEVAS QUERIES PARA DASHBOARD DE INFORMES
    // ==========================================================

    @Query("SELECT SUM(v.total) FROM Venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Double sumTotalVentasEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query(value = """
            SELECT COALESCE(SUM(dv.cantidad * COALESCE(ultimo_costo.precio, 0)), 0)
            FROM detalle_venta dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            JOIN productos p ON dv.id_producto = p.id_producto
            LEFT JOIN LATERAL (
                SELECT dc.precio_unitario AS precio
                FROM detalle_compra dc
                JOIN compras c ON dc.id_compra = c.id_compra
                WHERE dc.id_producto = p.id_producto 
                  AND c.fecha <= v.fecha
                ORDER BY c.fecha DESC
                LIMIT 1
            ) ultimo_costo ON true
            WHERE v.fecha BETWEEN :inicio AND :fin
            """, nativeQuery = true)
    Double calcularCostoBienesVendidos(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query(value = """
            SELECT DATE(v.fecha) as fecha, COALESCE(SUM(v.total), 0) as total
            FROM ventas v
            WHERE v.fecha BETWEEN CAST(:inicio AS DATE) AND CAST(:fin AS DATE)
            GROUP BY DATE(v.fecha)
            ORDER BY DATE(v.fecha)
            """, nativeQuery = true)
    List<Object[]> sumVentasPorDia(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query(value = """
            SELECT p.nombre, SUM(dv.cantidad) as cantidad, SUM(dv.precio_unitario * dv.cantidad) as total
            FROM detalle_venta dv
            JOIN productos p ON dv.id_producto = p.id_producto
            JOIN ventas v ON dv.id_venta = v.id_venta
            WHERE v.fecha BETWEEN :inicio AND :fin
            GROUP BY p.id_producto, p.nombre
            ORDER BY total DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopProductos(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin,
            @Param("limit") Integer limit);

    // Query para obtener ventas completas en un rango
    List<Venta> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin);

    // Ventas de un cliente específico
    List<Venta> findByClienteIdClienteOrderByFechaDesc(Long idCliente);

    // Top N productos más rentables en un rango
    // Calcula ganancia como (precio_venta - último_costo_compra) × cantidad vendida
    @Query(value = """
            SELECT p.nombre,
                   COALESCE(p.precio - ultimo_costo.precio, 0) AS margen_unitario,
                   SUM(dv.cantidad) AS cantidad_vendida,
                   COALESCE(SUM(dv.cantidad * (p.precio - ultimo_costo.precio)), 0) AS ganancia_total
            FROM detalle_venta dv
            JOIN productos p ON dv.id_producto = p.id_producto
            JOIN ventas v ON dv.id_venta = v.id_venta
            LEFT JOIN LATERAL (
                SELECT dc.precio_unitario AS precio
                FROM detalle_compra dc
                JOIN compras c ON dc.id_compra = c.id_compra
                WHERE dc.id_producto = p.id_producto
                ORDER BY c.fecha DESC
                LIMIT 1
            ) ultimo_costo ON true
            WHERE v.fecha BETWEEN :inicio AND :fin
            GROUP BY p.id_producto, p.nombre, p.precio, ultimo_costo.precio
            ORDER BY ganancia_total DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopProductosRentables(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin,
            @Param("limit") Integer limit);
}
