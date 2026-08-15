package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;

public interface ProductoProveedorRepository extends JpaRepository<ProductoProveedor, Long> {
    boolean existsByProductoIdProducto(Long idProducto);

    boolean existsByProductoAndProveedor(com.gestioninventariodemo2.cruddemo2.Model.Producto producto,
            com.gestioninventariodemo2.cruddemo2.Model.Proveedor proveedor);

    boolean existsByProductoIdProductoAndProveedorIdProveedor(Long idProducto, Long idProveedor);

    Optional<ProductoProveedor> findByProductoIdProductoAndProveedorIdProveedor(Long idProducto, Long idProveedor);

    int countByProducto(Producto producto);
}
