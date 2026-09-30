package com.dermasense.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@Tag(name = "System", description = "System and health check endpoints")
public class HomeController {

    @GetMapping("/")
    @Operation(summary = "Redirect to Swagger UI")
    public RedirectView root() {
        return new RedirectView("/swagger-ui/index.html");
    }

    @GetMapping("/api/status")
    @Operation(summary = "Backend health and service info")
    public Map<String, Object> status() {
        return Map.of(
                "service", "DermaSense AI Auth & Profile Service",
                "status", "UP",
                "database", "MongoDB",
                "swaggerUi", "http://localhost:8080/swagger-ui/index.html",
                "frontend", "http://localhost:5173"
        );
    }
}
