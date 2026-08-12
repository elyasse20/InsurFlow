package com.insurflow.assurance.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

/**
 * Handles file upload and deletion on disk.
 * Equivalent of the Multer diskStorage configuration in clientRoutes.js / regelementRoutes.js.
 */
@Service
public class FileStorageService {

    private final Path uploadsRoot;

    public FileStorageService(@Value("${app.uploads-dir}") String uploadsDir) throws IOException {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadsRoot);
    }

    /**
     * Store a file under a subdirectory and return the relative path
     * that can be used in the '/api/uploads/**' URL.
     *
     * @param file      multipart file from the request
     * @param subdir    subdirectory name, e.g. "clients" or "regelements"
     * @return relative path like "clients/1720343232-abc.pdf"
     */
    public String store(MultipartFile file, String subdir) throws IOException {
        Path dir = uploadsRoot.resolve(subdir);
        Files.createDirectories(dir);

        String originalName = Paths.get(file.getOriginalFilename()).getFileName().toString();
        String filename = System.currentTimeMillis() + "-" + UUID.randomUUID() + getExtension(originalName);

        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return subdir + "/" + filename;
    }

    /** Delete a file by its relative path (as stored in the model's doc field) */
    public void delete(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        try {
            Files.deleteIfExists(uploadsRoot.resolve(relativePath));
        } catch (IOException ignored) {}
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot >= 0) ? filename.substring(dot) : "";
    }
}
