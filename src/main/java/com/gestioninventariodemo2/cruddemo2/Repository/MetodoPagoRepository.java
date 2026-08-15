package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;

@Repository
public interface MetodoPagoRepository extends JpaRepository<MetodoPago, Long> {

    // Obtener solo los métodos de pago activos
    List<MetodoPago> findByActivoTrue();

    // Buscar por nombre de forma segura por si hay duplicados
    MetodoPago findFirstByNombre(String nombre);
}
