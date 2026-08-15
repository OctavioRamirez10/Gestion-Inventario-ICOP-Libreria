package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;

public interface DetalleVentaRepository extends JpaRepository<DetalleVenta,Long>{
    boolean existsByProductoIdProducto(Long idProducto);
}
