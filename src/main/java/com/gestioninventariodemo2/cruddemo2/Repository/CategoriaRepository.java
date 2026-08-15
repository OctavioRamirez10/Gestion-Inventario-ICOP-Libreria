package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    Optional<Categoria> findByNombre(String nombre);

    boolean existsByNombre(String nombre);

    // Validación case-insensitive: "Cuadernos" == "cuadernos"
    boolean existsByNombreIgnoreCase(String nombre);

    /**
     * Verifica si existe una categoría con el mismo nombre ignorando:
     * - Mayúsculas/minúsculas
     * - Acentos (á = a, é = e, etc.)
     * 
     * Ejemplos que se consideran duplicados:
     * - "Lápices" y "Lapices"
     * - "Útiles" y "utiles"
     * - "LIBRERÍA" y "libreria"
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Categoria c " +
            "WHERE LOWER(FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', " +
            "FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', " +
            "FUNCTION('REPLACE', FUNCTION('REPLACE', c.nombre, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), " +
            "'ú', 'u'), 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U')) = " +
            "LOWER(FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', " +
            "FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', " +
            "FUNCTION('REPLACE', FUNCTION('REPLACE', :nombre, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), " +
            "'ú', 'u'), 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'))")
    boolean existsByNombreIgnoreCaseAndAccents(@Param("nombre") String nombre);
}
