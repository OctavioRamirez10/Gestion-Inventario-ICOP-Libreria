package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.RolSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Rol;
import com.gestioninventariodemo2.cruddemo2.Repository.RolRepository;

@RestController
@RequestMapping("/api/roles")
public class RolController {

@Autowired
    private RolRepository rolRepository;

    // Método helper para mapear la entidad Rol a RolSelectDTO
    private RolSelectDTO toRolSelectDTO(Rol rol) {
        return RolSelectDTO.builder()
                .idRol(rol.getIdRol())
                .descripcion(rol.getDescripcion())
                .build();
    }

    // SIRVE PARA QUE EN UN SELECT SE MUESTRE LAS OPCIONES QUE HAY EN LA BASE DE DATOS
    @GetMapping
    public List<RolSelectDTO> listaDeRoles() { // <-- CAMBIO DE TIPO DE RETORNO
        return rolRepository.findAll().stream()
                .map(this::toRolSelectDTO) // Mapear cada entidad a DTO
                .collect(Collectors.toList());
    }
}