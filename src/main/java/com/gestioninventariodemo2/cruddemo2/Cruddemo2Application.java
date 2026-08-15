package com.gestioninventariodemo2.cruddemo2;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Cruddemo2Application {

	public static void main(String[] args) {
		// ---- AÑADE ESTA LÍNEA AQUÍ ----
		// Establece la zona horaria para toda la JVM ANTES de que arranque Spring.
		TimeZone.setDefault(TimeZone.getTimeZone("America/Argentina/Buenos_Aires"));
		SpringApplication.run(Cruddemo2Application.class, args);

	}
}
