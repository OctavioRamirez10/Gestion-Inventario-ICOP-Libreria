package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaSelectDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSimpleDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Categoria;
import com.gestioninventariodemo2.cruddemo2.Repository.CategoriaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;

    /**
     * Crea una nueva categoría.
     */
    @Transactional
    public Categoria crearCategoria(CategoriaRequestDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre de la categoría es obligatorio.");
        }

        String nombreNormalizado = dto.getNombre().trim();

        // Validación case-insensitive e ignora acentos: "Lápices" == "Lapices" ==
        // "lapices"
        if (categoriaRepository.existsByNombreIgnoreCaseAndAccents(nombreNormalizado)) {
            throw new IllegalArgumentException("Ya existe una categoría con el nombre: " + nombreNormalizado);
        }

        Categoria categoria = Categoria.builder()
                .nombre(nombreNormalizado)
                .build();

        return categoriaRepository.save(categoria);
    }

    /**
     * Lista todas las categorías para selector (id + nombre).
     */
    @Transactional(readOnly = true)
    public List<CategoriaSelectDTO> listarCategoriasSelect() {
        return categoriaRepository.findAll()
                .stream()
                .map(c -> new CategoriaSelectDTO(c.getIdCategoria(), c.getNombre()))
                .collect(Collectors.toList());
    }

    /**
     * Lista todas las categorías con el conteo de productos.
     */
    @Transactional(readOnly = true)
    public List<CategoriaResponseDTO> listarTodas() {
        return categoriaRepository.findAll()
                .stream()
                .map(c -> CategoriaResponseDTO.builder()
                        .idCategoria(c.getIdCategoria())
                        .nombre(c.getNombre())
                        .cantidadProductos(c.getProductos() != null ? c.getProductos().size() : 0)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Obtiene una categoría por ID.
     */
    @Transactional(readOnly = true)
    public Categoria obtenerPorId(Long id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada con ID: " + id));
    }

    /**
     * Actualiza el nombre de una categoría existente.
     */
    @Transactional
    public Categoria actualizarCategoria(Long id, CategoriaRequestDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre de la categoría es obligatorio.");
        }

        Categoria categoria = obtenerPorId(id);
        String nombreNormalizado = dto.getNombre().trim();

        // Verificar que no exista otra categoría con el mismo nombre (case-insensitive
        // e ignora acentos)
        if (!categoria.getNombre().equalsIgnoreCase(nombreNormalizado)
                && categoriaRepository.existsByNombreIgnoreCaseAndAccents(nombreNormalizado)) {
            throw new IllegalArgumentException("Ya existe una categoría con el nombre: " + nombreNormalizado);
        }

        categoria.setNombre(nombreNormalizado);
        return categoriaRepository.save(categoria);
    }

    /**
     * Elimina una categoría si no tiene productos asociados.
     */
    @Transactional
    public void eliminarCategoria(Long id) {
        Categoria categoria = obtenerPorId(id);

        // Verificar si hay productos asociados
        if (categoria.getProductos() != null && !categoria.getProductos().isEmpty()) {
            int cantidadProductos = categoria.getProductos().size();
            throw new IllegalArgumentException(
                    "No se puede eliminar la categoría porque tiene " + cantidadProductos +
                            " producto(s) asociado(s). Por favor, reasigne los productos a otra categoría primero.");
        }

        categoriaRepository.deleteById(id);
    }

    /**
     * Obtiene los productos asociados a una categoría.
     */
    @Transactional(readOnly = true)
    public List<ProductoSimpleDTO> obtenerProductosPorCategoria(Long id) {
        Categoria categoria = obtenerPorId(id);

        if (categoria.getProductos() == null || categoria.getProductos().isEmpty()) {
            return List.of(); // Retorna lista vacía si no hay productos
        }

        return categoria.getProductos().stream()
                .map(p -> {
                    // Calcular stock total desde la tabla stock
                    int stockTotal = p.getStocks() != null
                            ? p.getStocks().stream().mapToInt(s -> s.getStockActual()).sum()
                            : 0;

                    return ProductoSimpleDTO.builder()
                            .idProducto(p.getIdProducto())
                            .nombreProducto(p.getNombre())
                            .descripcion(p.getDescripcion())
                            .precio(p.getPrecio())
                            .stock(stockTotal)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
