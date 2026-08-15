package com.gestioninventariodemo2.cruddemo2.Exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;


@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleServerError(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
    }

    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<String> handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<String> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email o contraseña incorrectos");
    }

    @ExceptionHandler(SoftDeleteException.class)
    public ResponseEntity<String> handleSoftDelete(SoftDeleteException ex){
        // Usamos 200 OK (o 202 Accepted) para indicar que la acción fue procesada exitosamente.
        return ResponseEntity.status(HttpStatus.OK).body(ex.getMessage()); 
    }


    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<Object> handleStockInsuficiente(StockInsuficienteException ex) {
        // Devuelve un JSON con el mensaje de error, que el frontend SÍ puede leer
        return new ResponseEntity<>(
            Map.of("message", ex.getMessage()), 
            HttpStatus.BAD_REQUEST
        );
    }

}
