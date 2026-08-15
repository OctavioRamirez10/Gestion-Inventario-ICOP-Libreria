

package com.gestioninventariodemo2.cruddemo2.Exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Excepción personalizada para manejar errores de stock insuficiente.
 * Devuelve un HTTP 400 (Bad Request).
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class StockInsuficienteException extends RuntimeException {

    public StockInsuficienteException(String message) {
        super(message);
    }
}