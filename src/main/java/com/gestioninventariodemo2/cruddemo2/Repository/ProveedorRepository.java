package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long>, JpaSpecificationExecutor<Proveedor> {

    boolean existsByEmailAndEstado(String email, String estado);

    boolean existsByNombreIgnoreCaseAndEstado(String nombre, String estado);

    Page<Proveedor> findAllByEstado(String estado, Pageable pageable);

    List<Proveedor> findAllByEstado(String estado);

    @Query("SELECT DISTINCT p FROM Proveedor p LEFT JOIN FETCH p.productoProveedor pp LEFT JOIN FETCH pp.producto WHERE p.idProveedor = :id")
    Optional<Proveedor> findByIdWithProductos(@Param("id") Long id);

}
