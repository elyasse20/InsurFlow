package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.CinScanResultDto;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
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
    private static final Pattern CIN_PATTERN = Pattern.compile("(?i)\\b([A-Z]{1,2}\\s?[0-9]{4,7})\\b");
    private static final Pattern NOM_PATTERN = Pattern.compile("(?i)(?:NOM|LASTNAME|NOM\\s*:\\s*)([A-ZÀ-ÿ\\s-]{2,30})");
    private static final Pattern PRENOM_PATTERN = Pattern.compile("(?i)(?:PRENOM|PRÉNOM|FIRSTNAME|PRENOM\\s*:\\s*)([A-ZÀ-ÿ\\s-]{2,30})");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{2}[\\./\\-]\\d{2}[\\./\\-]\\d{4})\\b");
    private static final Pattern ADRESSE_PATTERN = Pattern.compile("(?i)(?:ADRESSE|RESIDENCE|DEMEURE)\\s*[:\\.]?\\s*([A-Z0-9À-ÿ\\s,./\\-]{5,60})");

    /**
     * Performs Tesseract OCR scanning on an uploaded CIN image/file
     * and extracts fields dynamically via Regex.
     * Never fails hard - always returns a valid CinScanResultDto.
     */
    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("scanCinDocument called with null or empty file. Returning empty result.");
            return createEmptyResult();
        }

        log.info("Processing Tesseract OCR scan for file: {} (size: {} bytes)", file.getOriginalFilename(), file.getSize());

        File tempFile = null;
        String ocrText = "";
        try {
            tempFile = convertMultipartToFile(file);
            ocrText = performOcr(tempFile);
        } catch (Throwable t) {
            log.error("Error during CIN document OCR processing for file: {}", file.getOriginalFilename(), t);
        } finally {
            if (tempFile != null && tempFile.exists()) {
                try {
                    boolean deleted = tempFile.delete();
                    if (!deleted) {
                        tempFile.deleteOnExit();
                    }
                } catch (Exception e) {
                    log.warn("Failed to delete temp OCR file: {}", tempFile.getAbsolutePath(), e);
                }
            }
        }

        log.info("Raw OCR Recognized Text:\n---\n{}\n---", ocrText);

        try {
            return parseOcrText(ocrText);
        } catch (Throwable t) {
            log.error("Unexpected error parsing OCR text: {}", t.getMessage(), t);
            return createEmptyResult();
        }
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

    /**
     * Dynamically resolves the best available Tesseract tessdata directory.
     */
    private String resolveTessDataPath() {
        // 1. Explicitly configured datapath
        if (tessDataPath != null && !tessDataPath.isBlank()) {
            File dir = new File(tessDataPath.trim());
            if (dir.exists() && dir.isDirectory()) {
                log.info("Using configured Tesseract datapath: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
            log.warn("Configured Tesseract datapath '{}' does not exist or is not a directory. Attempting auto-detection...", tessDataPath);
        }

        // 2. Environment variable TESSDATA_PREFIX
        String envPrefix = System.getenv("TESSDATA_PREFIX");
        if (envPrefix != null && !envPrefix.isBlank()) {
            File dir = new File(envPrefix.trim());
            if (dir.exists() && dir.isDirectory()) {
                log.info("Using TESSDATA_PREFIX datapath: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }

        // 3. Known Linux/Alpine paths detection
        String[] possiblePaths = {
            "/usr/share/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            "/usr/share/tesseract-ocr/tessdata",
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/local/share/tessdata"
        };

        for (String path : possiblePaths) {
            File dir = new File(path);
            if (dir.exists() && dir.isDirectory()) {
                log.info("Auto-detected existing Tesseract datapath: {}", path);
                return path;
            }
        }

        // 4. Default fallback
        log.warn("No existing Tesseract datapath directory found among known paths. Defaulting to /usr/share/tessdata");
        return "/usr/share/tessdata";
    }

    private String performOcr(File imageFile) {
        if (imageFile == null || !imageFile.exists()) {
            return "";
        }

        try {
            ITesseract tesseract = new Tesseract();
            String resolvedPath = resolveTessDataPath();
            tesseract.setDatapath(resolvedPath);

            // Attempt to use French + English if available
            try {
                File fraData = new File(resolvedPath, "fra.traineddata");
                File engData = new File(resolvedPath, "eng.traineddata");
                if (fraData.exists() && engData.exists()) {
                    tesseract.setLanguage("fra+eng");
                } else if (fraData.exists()) {
                    tesseract.setLanguage("fra");
                } else if (engData.exists()) {
                    tesseract.setLanguage("eng");
                }
            } catch (Exception e) {
                log.debug("Using default Tesseract language setting: {}", e.getMessage());
            }

            String result = tesseract.doOCR(imageFile);
            return result != null ? result : "";
        } catch (Throwable t) {
            log.warn("Tesseract OCR execution encountered an error: {}", t.getMessage());
            return "";
        }
    }

    private CinScanResultDto parseOcrText(String text) {
        if (text == null || text.isBlank()) {
            return createEmptyResult();
        }

        String cin = extractPattern(text, CIN_PATTERN);
        if (!cin.isEmpty()) {
            cin = cin.replaceAll("\\s+", "").toUpperCase();
        }

        String nom = extractPattern(text, NOM_PATTERN);
        String prenom = extractPattern(text, PRENOM_PATTERN);
        String dateNaissance = extractPattern(text, DATE_PATTERN);
        String adresse = extractPattern(text, ADRESSE_PATTERN);

        // Fallback for Nom/Prenom by scanning lines if labeled regexes didn't match
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                line = line.trim();
                String upperLine = line.toUpperCase();
                if (nom.isEmpty() && upperLine.startsWith("NOM")) {
                    nom = cleanFieldValue(line.replaceFirst("(?i)NOM\\s*:?", ""));
                } else if (prenom.isEmpty() && (upperLine.startsWith("PRENOM") || upperLine.startsWith("PRÉNOM") || upperLine.startsWith("PREN0M"))) {
                    prenom = cleanFieldValue(line.replaceFirst("(?i)PRÉ?N[O0]M\\s*:?", ""));
                }
            }
        }

        nom = sanitizeName(nom);
        prenom = sanitizeName(prenom);

        double confidence = calculateConfidence(cin, nom, prenom);

        log.info("OCR Extraction Completed -> CIN: '{}', Nom: '{}', Prenom: '{}', Date: '{}', Confidence: {}",
                cin, nom, prenom, dateNaissance, confidence);

        return CinScanResultDto.builder()
                .cin(cin)
                .nom(nom)
                .prenom(prenom)
                .adresse(adresse)
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

    private String sanitizeName(String val) {
        if (val == null) return "";
        String cleaned = val.trim().replaceAll("^[:\\-\\.\\s]+|[:\\-\\.\\s]+$", "");
        if (cleaned.equalsIgnoreCase("ROYAUME DU MAROC") ||
            cleaned.equalsIgnoreCase("CARTE NATIONALE") ||
            cleaned.equalsIgnoreCase("IDENTITE") ||
            cleaned.equalsIgnoreCase("NATIONALE")) {
            return "";
        }
        return cleaned;
    }

    private double calculateConfidence(String cin, String nom, String prenom) {
        int fieldsFound = 0;
        if (!cin.isEmpty()) fieldsFound++;
        if (!nom.isEmpty()) fieldsFound++;
        if (!prenom.isEmpty()) fieldsFound++;

        if (fieldsFound == 0) return 0.0;
        if (fieldsFound == 3) return 0.95;
        if (fieldsFound == 2) return 0.70;
        return 0.40;
    }

    private CinScanResultDto createEmptyResult() {
        return CinScanResultDto.builder()
                .cin("")
                .nom("")
                .prenom("")
                .adresse("")
                .dateNaissance("")
                .confidence(0.0)
                .build();
    }
}
