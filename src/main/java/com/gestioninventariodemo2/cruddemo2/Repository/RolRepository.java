package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Rol;

@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {

}
