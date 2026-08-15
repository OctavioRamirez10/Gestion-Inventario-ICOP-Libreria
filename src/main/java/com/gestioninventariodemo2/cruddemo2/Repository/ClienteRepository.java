package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente,Long>{

    Optional<Cliente> findByDni(String dni);

    boolean existsByDni(String dni);
    
    java.util.List<Cliente> findByActivoTrue();
    
    org.springframework.data.domain.Page<Cliente> findByActivoTrue(org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM Cliente c WHERE c.activo = true AND " +
       "(LOWER(c.nombre) LIKE LOWER(CONCAT('%', :termino, '%')) OR " +
       "LOWER(c.apellido) LIKE LOWER(CONCAT('%', :termino, '%')) OR " +
       "LOWER(c.dni) LIKE LOWER(CONCAT('%', :termino, '%')) OR " +
       "LOWER(c.email) LIKE LOWER(CONCAT('%', :termino, '%')) OR " +
       "LOWER(c.telefono) LIKE LOWER(CONCAT('%', :termino, '%')))")
    org.springframework.data.domain.Page<Cliente> searchClientes(@org.springframework.data.repository.query.Param("termino") String termino, org.springframework.data.domain.Pageable pageable);


    
}
