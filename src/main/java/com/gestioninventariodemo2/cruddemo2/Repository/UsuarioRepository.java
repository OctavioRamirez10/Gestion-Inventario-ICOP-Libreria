package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Usuario> findAllByEstado(String estado);

    Page<Usuario> findAllByEstado(String estado, Pageable pageable);

    // Búsqueda global por nombre, apellido, email o rol
    @Query("SELECT u FROM Usuario u WHERE u.estado = :estado AND " +
            "(LOWER(u.nombre) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.rol.descripcion) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Usuario> buscarUsuariosActivos(@Param("estado") String estado,
            @Param("search") String search,
            Pageable pageable);

    // Búsqueda con filtro opcional por rol
    @Query("SELECT u FROM Usuario u WHERE u.estado = :estado " +
            "AND (:search IS NULL OR :search = '' OR " +
                "LOWER(u.nombre) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                "LOWER(u.rol.descripcion) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:idRol IS NULL OR u.rol.idRol = :idRol)")
    Page<Usuario> buscarUsuariosFiltrados(@Param("estado") String estado,
            @Param("search") String search,
            @Param("idRol") Long idRol,
            Pageable pageable);
}
