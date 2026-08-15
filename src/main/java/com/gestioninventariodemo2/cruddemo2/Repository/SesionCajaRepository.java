package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SesionCajaRepository extends JpaRepository<SesionCaja, Long> {

    Optional<SesionCaja> findByUsuarioIdUsuarioAndEstado(Long idUsuario, String estado);
    Optional<SesionCaja> findFirstByEstado(String estado);
    Optional<SesionCaja> findFirstByEstadoOrderByFechaCierreDesc(String estado);
    List<SesionCaja> findAllByEstado(String estado);
    Page<SesionCaja> findAllByOrderByFechaAperturaDesc(Pageable pageable);

    @Query("SELECT s FROM SesionCaja s WHERE " +
        "(CAST(:fechaAperturaInicio AS java.time.LocalDateTime) IS NULL OR (s.fechaApertura >= :fechaAperturaInicio AND s.fechaApertura <= :fechaAperturaFin)) AND " +
        "(CAST(:fechaCierreInicio AS java.time.LocalDateTime) IS NULL OR (s.fechaCierre >= :fechaCierreInicio AND s.fechaCierre <= :fechaCierreFin)) AND " +
        "(:estado IS NULL OR s.estado = :estado) AND " +
        "(CAST(:operadorId AS java.lang.Long) IS NULL OR s.usuario.idUsuario = :operadorId) AND " +
        "(:busqueda IS NULL OR LOWER(s.usuario.nombre) LIKE :busqueda OR LOWER(s.usuario.apellido) LIKE :busqueda)")
    Page<SesionCaja> findFiltered(
        @Param("fechaAperturaInicio") LocalDateTime fechaAperturaInicio,
        @Param("fechaAperturaFin") LocalDateTime fechaAperturaFin,
        @Param("fechaCierreInicio") LocalDateTime fechaCierreInicio,
        @Param("fechaCierreFin") LocalDateTime fechaCierreFin,
        @Param("estado") String estado,
        @Param("operadorId") Long operadorId,
        @Param("busqueda") String busqueda,
        Pageable pageable);

    @Query("SELECT s FROM SesionCaja s WHERE " +
        "(CAST(:fechaAperturaInicio AS java.time.LocalDateTime) IS NULL OR (s.fechaApertura >= :fechaAperturaInicio AND s.fechaApertura <= :fechaAperturaFin)) AND " +
        "(CAST(:fechaCierreInicio AS java.time.LocalDateTime) IS NULL OR (s.fechaCierre >= :fechaCierreInicio AND s.fechaCierre <= :fechaCierreFin)) AND " +
        "(:estado IS NULL OR s.estado = :estado) AND " +
        "(CAST(:operadorId AS java.lang.Long) IS NULL OR s.usuario.idUsuario = :operadorId) AND " +
        "(:busqueda IS NULL OR LOWER(s.usuario.nombre) LIKE :busqueda OR LOWER(s.usuario.apellido) LIKE :busqueda) AND " +
        "s.montoFinalReal IS NOT NULL AND (" +
        "(s.diferenciaCierre IS NOT NULL AND ABS(s.diferenciaCierre) >= 0.01) OR " +
        "(s.diferenciaCierre IS NULL AND ABS(s.montoFinalReal - s.montoInicialReal) >= 0.01)" +
        ")")
    Page<SesionCaja> findFilteredConDiferencias(
        @Param("fechaAperturaInicio") LocalDateTime fechaAperturaInicio,
        @Param("fechaAperturaFin") LocalDateTime fechaAperturaFin,
        @Param("fechaCierreInicio") LocalDateTime fechaCierreInicio,
        @Param("fechaCierreFin") LocalDateTime fechaCierreFin,
        @Param("estado") String estado,
        @Param("operadorId") Long operadorId,
        @Param("busqueda") String busqueda,
        Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.idUsuario IN (SELECT DISTINCT s.usuario.idUsuario FROM SesionCaja s)")
    List<Usuario> findDistinctOperadores();
}
