package com.insurflow.assurance.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves the uploads directory as static files under /api/uploads/**.
 * Mirrors: app.use("/api/uploads", express.static(join(__dirname, "uploads")))
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.uploads-dir}")
    private String uploadsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadsDir).toAbsolutePath().normalize();
        registry
            .addResourceHandler("/api/uploads/**")
            .addResourceLocations("file:" + uploadPath + "/");
    }
}
