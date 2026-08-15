package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Compra;

public interface CompraRepository extends JpaRepository<Compra, Long>, JpaSpecificationExecutor<Compra> {

        // ==========================================================
        // QUERIES PARA DASHBOARD DE INFORMES
        // ==========================================================

        @Query("SELECT SUM(c.total) FROM Compra c WHERE c.fecha BETWEEN :inicio AND :fin")
        Double sumTotalComprasEnRango(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

        @Query(value = """
                        SELECT DATE(c.fecha) as fecha, COALESCE(SUM(c.total), 0) as total
                        FROM compras c
                        WHERE c.fecha BETWEEN CAST(:inicio AS DATE) AND CAST(:fin AS DATE)
                        GROUP BY DATE(c.fecha)
                        ORDER BY DATE(c.fecha)
                        """, nativeQuery = true)
        List<Object[]> sumComprasPorDia(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

        // Query para obtener compras completas en un rango
        List<Compra> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin);

        // ==========================================================
        // QUERIES PARA ORDENAMIENTO POR PRODUCTO Y COSTO UNITARIO
        // ==========================================================

        // Ordenar por nombre de producto (ASC)
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "GROUP BY c ORDER BY MIN(p.nombre) ASC")
        Page<Compra> findAllOrderByProductoNombreAsc(Pageable pageable);

        // Ordenar por nombre de producto (DESC)
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "GROUP BY c ORDER BY MIN(p.nombre) DESC")
        Page<Compra> findAllOrderByProductoNombreDesc(Pageable pageable);

        // Ordenar por costo unitario (ASC)
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) ASC")
        Page<Compra> findAllOrderByPrecioUnitarioAsc(Pageable pageable);

        // Ordenar por costo unitario (DESC)
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) DESC")
        Page<Compra> findAllOrderByPrecioUnitarioDesc(Pageable pageable);

        // ==========================================================
        // QUERIES PARA BÚSQUEDA GLOBAL (por proveedor o producto)
        // ==========================================================

        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))")
        Page<Compra> searchCompras(@Param("search") String search, Pageable pageable);

        // Búsqueda + filtro de fechas
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE (LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND c.fecha BETWEEN :inicio AND :fin")
        Page<Compra> searchComprasConFechas(@Param("search") String search,
                        @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin, Pageable pageable);

        // Solo filtro de fechas (paginado)
        Page<Compra> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin, Pageable pageable);

        // ==========================================================
        // QUERIES CON BÚSQUEDA + ORDENAMIENTO CUSTOM
        // ==========================================================

        // Búsqueda + orden por producto nombre ASC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "GROUP BY c ORDER BY MIN(p.nombre) ASC")
        Page<Compra> searchComprasOrderByProductoNombreAsc(@Param("search") String search, Pageable pageable);

        // Búsqueda + orden por producto nombre DESC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "GROUP BY c ORDER BY MIN(p.nombre) DESC")
        Page<Compra> searchComprasOrderByProductoNombreDesc(@Param("search") String search, Pageable pageable);

        // Búsqueda + orden por costo unitario ASC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) ASC")
        Page<Compra> searchComprasOrderByPrecioUnitarioAsc(@Param("search") String search, Pageable pageable);

        // Búsqueda + orden por costo unitario DESC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) DESC")
        Page<Compra> searchComprasOrderByPrecioUnitarioDesc(@Param("search") String search, Pageable pageable);

        // ==========================================================
        // QUERIES CON FECHAS + ORDENAMIENTO CUSTOM
        // ==========================================================

        // Fechas + orden por producto nombre ASC
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(p.nombre) ASC")
        Page<Compra> findByFechaBetweenOrderByProductoNombreAsc(@Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin, Pageable pageable);

        // Fechas + orden por producto nombre DESC
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(p.nombre) DESC")
        Page<Compra> findByFechaBetweenOrderByProductoNombreDesc(@Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin, Pageable pageable);

        // Fechas + orden por costo unitario ASC
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
                        "WHERE c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) ASC")
        Page<Compra> findByFechaBetweenOrderByPrecioUnitarioAsc(@Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin, Pageable pageable);

        // Fechas + orden por costo unitario DESC
        @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
                        "WHERE c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) DESC")
        Page<Compra> findByFechaBetweenOrderByPrecioUnitarioDesc(@Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin, Pageable pageable);

        // ==========================================================
        // QUERIES CON BÚSQUEDA + FECHAS + ORDENAMIENTO CUSTOM
        // ==========================================================

        // Búsqueda + fechas + orden por producto nombre ASC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE (LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(p.nombre) ASC")
        Page<Compra> searchComprasConFechasOrderByProductoNombreAsc(@Param("search") String search,
                        @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin, Pageable pageable);

        // Búsqueda + fechas + orden por producto nombre DESC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE (LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(p.nombre) DESC")
        Page<Compra> searchComprasConFechasOrderByProductoNombreDesc(@Param("search") String search,
                        @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin, Pageable pageable);

        // Búsqueda + fechas + orden por costo unitario ASC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE (LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) ASC")
        Page<Compra> searchComprasConFechasOrderByPrecioUnitarioAsc(@Param("search") String search,
                        @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin, Pageable pageable);

        // Búsqueda + fechas + orden por costo unitario DESC
        @Query("SELECT DISTINCT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
                        "WHERE (LOWER(c.proveedor.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND c.fecha BETWEEN :inicio AND :fin " +
                        "GROUP BY c ORDER BY MIN(dc.precioUnitario) DESC")
        Page<Compra> searchComprasConFechasOrderByPrecioUnitarioDesc(@Param("search") String search,
                        @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin, Pageable pageable);

        // Top N productos más comprados en un rango (por cantidad total comprada)
        @Query(value = """
                        SELECT p.nombre, SUM(dc.cantidad) as cantidad, SUM(dc.precio_unitario * dc.cantidad) as total_costo
                        FROM detalle_compra dc
                        JOIN productos p ON dc.id_producto = p.id_producto
                        JOIN compras c ON dc.id_compra = c.id_compra
                        WHERE c.fecha BETWEEN :inicio AND :fin
                        GROUP BY p.id_producto, p.nombre
                        ORDER BY cantidad DESC
                        LIMIT :limit
                        """, nativeQuery = true)
        List<Object[]> findTopProductosComprados(
                        @Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin,
                        @Param("limit") Integer limit);

        // Top N proveedores por monto total comprado en un rango
        @Query(value = """
                        SELECT prov.nombre, SUM(c.total) as total_comprado, COUNT(c.id_compra) as cantidad_compras
                        FROM compras c
                        JOIN proveedor prov ON c.id_proveedor = prov.id_proveedor
                        WHERE c.fecha BETWEEN :inicio AND :fin
                        GROUP BY prov.id_proveedor, prov.nombre
                        ORDER BY total_comprado DESC
                        LIMIT :limit
                        """, nativeQuery = true)
        List<Object[]> findTopProveedores(
                        @Param("inicio") LocalDateTime inicio,
                        @Param("fin") LocalDateTime fin,
                        @Param("limit") Integer limit);
}
