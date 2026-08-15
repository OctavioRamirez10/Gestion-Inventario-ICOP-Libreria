package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface DetalleCompraRepository extends JpaRepository<DetalleCompra,Long>{
    boolean existsByProductoIdProducto(Long idProducto);

    List<DetalleCompra> findByProductoOrderByCompraFechaDesc(Producto producto);

    List<DetalleCompra> findByProducto_IdProductoOrderByCompra_FechaDesc(Long idProducto);
}

