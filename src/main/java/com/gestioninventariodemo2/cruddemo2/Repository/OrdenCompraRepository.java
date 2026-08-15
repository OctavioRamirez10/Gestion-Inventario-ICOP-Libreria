package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.OrdenCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrdenCompraRepository extends JpaRepository<OrdenCompra, Long> {
}
