package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.CinScanResultDto;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    // Regex Patterns for Moroccan CIN Extraction
    private static final Pattern CIN_PATTERN = Pattern.compile("(?i)\\b([A-Z]{1,2}[0-9]{4,6})\\b");
    private static final Pattern NOM_PATTERN = Pattern.compile("(?i)(?:NOM|LASTNAME|NOM\\s*:\\s*)([A-Z\\s-]{2,30})");
    private static final Pattern PRENOM_PATTERN = Pattern.compile("(?i)(?:PRENOM|PRÉNOM|FIRSTNAME|PRENOM\\s*:\\s*)([A-Z\\s-]{2,30})");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{2}[\\./\\-]\\d{2}[\\./\\-]\\d{4})\\b");

    /**
     * Performs Tesseract OCR scanning on an uploaded CIN image/file
     * and extracts fields dynamically via Regex.
     */
    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        log.info("Processing Tesseract OCR scan for file: {} (size: {} bytes)", file.getOriginalFilename(), file.getSize());

        File tempFile = null;
        String ocrText = "";
        try {
            tempFile = convertMultipartToFile(file);
            ocrText = performOcr(tempFile);
        } catch (Exception e) {
            log.error("Failed to perform Tesseract OCR scan on file: {}", file.getOriginalFilename(), e);
        } finally {
            if (tempFile != null && tempFile.exists()) {
                boolean deleted = tempFile.delete();
                if (!deleted) {
                    tempFile.deleteOnExit();
                }
            }
        }

        return parseOcrText(ocrText);
    }

    private File convertMultipartToFile(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = ".tmp";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        File tempFile = File.createTempFile("cin_ocr_", extension);
        Files.copy(file.getInputStream(), tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return tempFile;
    }

    private String performOcr(File imageFile) throws TesseractException {
        ITesseract tesseract = new Tesseract();

        if (tessDataPath != null && !tessDataPath.isBlank()) {
            tesseract.setDatapath(tessDataPath);
        }

        return tesseract.doOCR(imageFile);
    }

    private CinScanResultDto parseOcrText(String text) {
        if (text == null || text.isBlank()) {
            return CinScanResultDto.builder()
                    .cin("")
                    .nom("")
                    .prenom("")
                    .adresse("")
                    .dateNaissance("")
                    .confidence(0.0)
                    .build();
        }

        String cin = extractPattern(text, CIN_PATTERN);
        String nom = extractPattern(text, NOM_PATTERN);
        String prenom = extractPattern(text, PRENOM_PATTERN);
        String dateNaissance = extractPattern(text, DATE_PATTERN);

        // Fallback for Nom/Prenom by scanning lines if labeled regexes didn't match
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                line = line.trim();
                String upperLine = line.toUpperCase();
                if (nom.isEmpty() && upperLine.startsWith("NOM")) {
                    nom = cleanFieldValue(line.replaceFirst("(?i)NOM\\s*:?", ""));
                } else if (prenom.isEmpty() && (upperLine.startsWith("PRENOM") || upperLine.startsWith("PRÉNOM"))) {
                    prenom = cleanFieldValue(line.replaceFirst("(?i)PRÉ?NOM\\s*:?", ""));
                }
            }
        }

        double confidence = calculateConfidence(cin, nom, prenom);

        log.info("OCR Extraction Completed -> CIN: '{}', Nom: '{}', Prenom: '{}', Confidence: {}",
                cin, nom, prenom, confidence);

        return CinScanResultDto.builder()
                .cin(cin)
                .nom(nom)
                .prenom(prenom)
                .adresse("")
                .dateNaissance(dateNaissance)
                .confidence(confidence)
                .build();
    }

    private String extractPattern(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return cleanFieldValue(matcher.group(1));
        }
        return "";
    }

    private String cleanFieldValue(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ");
    }

    private double calculateConfidence(String cin, String nom, String prenom) {
        int fieldsFound = 0;
        if (!cin.isEmpty()) fieldsFound++;
        if (!nom.isEmpty()) fieldsFound++;
        if (!prenom.isEmpty()) fieldsFound++;

        if (fieldsFound == 0) return 0.0;
        return fieldsFound / 3.0;
    }
}
