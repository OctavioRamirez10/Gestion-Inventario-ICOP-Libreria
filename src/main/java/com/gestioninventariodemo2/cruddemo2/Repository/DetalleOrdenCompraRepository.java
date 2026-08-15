package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.DetalleOrdenCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DetalleOrdenCompraRepository extends JpaRepository<DetalleOrdenCompra, Long> {
}
