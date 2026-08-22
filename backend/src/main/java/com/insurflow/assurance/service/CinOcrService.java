package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.CinScanResultDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    // ── Moroccan CIN number: 1-2 letters + 4-7 digits (no strict \b needed) ──
    // Also matches OCR artefacts like "B 123456" (space between letter and digits)
    private static final Pattern CIN_PATTERN =
            Pattern.compile("(?<![A-Z0-9])([A-Z]{1,2}\\s?[0-9]{4,7})(?![0-9])", Pattern.CASE_INSENSITIVE);

    // ── Label-based patterns – tolerates OCR typos (0 for O, accents, colons) ──
    private static final Pattern NOM_LABEL_PATTERN =
            Pattern.compile("(?i)N[O0]M\\s*[:\\-.]?\\s*([A-ZÀ-ÿa-z\\s\\-']{2,40}?)(?=\\r?\\n|$)");

    private static final Pattern PRENOM_LABEL_PATTERN =
            Pattern.compile("(?i)PR[EÉ][EÉ]?N[O0]M\\s*[:\\-.]?\\s*([A-ZÀ-ÿa-z\\s\\-']{2,40}?)(?=\\r?\\n|$)");

    private static final Pattern DATE_PATTERN =
            Pattern.compile("\\b(\\d{2}[\\./\\-]\\d{2}[\\./\\-]\\d{4})\\b");

    // Adresse: label-aware, capturing up to end of that line
    private static final Pattern ADRESSE_LABEL_PATTERN =
            Pattern.compile("(?i)(?:ADRESSE|RESIDENCE|DEMEURE|ADR)\\s*[:\\-.]?\\s*([A-ZÀ-ÿa-z0-9\\s,./\\-']{5,80}?)(?=\\r?\\n|$)");

    // ── Noise words to reject when doing heuristic name extraction ──
    private static final List<String> NOISE_TOKENS = Arrays.asList(
            "ROYAUME", "DU", "MAROC", "CARTE", "NATIONALE", "IDENTITE",
            "NATIONALE", "IDENTITY", "CARD", "KINGDOM", "MOROCCO",
            "SEXE", "SEX", "DATE", "NAISSANCE", "BIRTH", "EXPIRY",
            "EXPIRATION", "VALABLE", "SIGNATURE", "LIEU", "PLACE",
            "CIN", "NOM", "PRENOM", "ADRESSE", "RESIDENCE"
    );

    /**
     * Performs Tesseract OCR on an uploaded CIN image/file and extracts fields.
     * Always returns HTTP 200 with whatever partial data was extracted.
     */
    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("scanCinDocument called with null or empty file.");
            return createEmptyResult();
        }

        log.info("Processing OCR scan for: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        File tempFile = null;
        String ocrText = "";
        try {
            tempFile = convertMultipartToFile(file);
            ocrText = performOcr(tempFile);
        } catch (Throwable t) {
            log.error("Error during OCR processing for: {}", file.getOriginalFilename(), t);
            // Return empty but valid result — never throw
            return createEmptyResult();
        } finally {
            deleteSilently(tempFile);
        }

        log.info("Raw OCR text ({} chars):\n---\n{}\n---", ocrText.length(), ocrText);

        try {
            return parseOcrText(ocrText);
        } catch (Throwable t) {
            log.error("Unexpected error parsing OCR text: {}", t.getMessage(), t);
            return createEmptyResult();
        }
    }

    // ── File handling ────────────────────────────────────────────────────────

    private File convertMultipartToFile(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf("."))
                : ".tmp";
        File tmp = File.createTempFile("cin_ocr_", ext);
        Files.copy(file.getInputStream(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return tmp;
    }

    private void deleteSilently(File f) {
        if (f != null && f.exists()) {
            try { if (!f.delete()) f.deleteOnExit(); }
            catch (Exception ignored) {}
        }
    }

    // ── Tesseract CLI ────────────────────────────────────────────────────────

    private String performOcr(File imageFile) {
        if (imageFile == null || !imageFile.exists()) return "";

        // Try with fra+eng first, fall back to eng alone
        String result = runTesseract(imageFile, "fra+eng");
        if (result.isBlank()) {
            log.warn("fra+eng OCR returned empty output, retrying with eng only");
            result = runTesseract(imageFile, "eng");
        }
        if (result.isBlank()) {
            log.warn("eng OCR also empty, retrying with ara+fra+eng");
            result = runTesseract(imageFile, "ara+fra+eng");
        }
        return result;
    }

    private String runTesseract(File imageFile, String lang) {
        try {
            List<String> command = new ArrayList<>();
            command.add("tesseract");
            command.add(imageFile.getAbsolutePath());
            command.add("stdout");

            // Optional PSM hints for ID cards: PSM 6 = assume uniform block of text
            command.add("--psm");
            command.add("6");

            if (tessDataPath != null && !tessDataPath.isBlank()) {
                File dir = new File(tessDataPath.trim());
                if (dir.exists() && dir.isDirectory()) {
                    command.add("--tessdata-dir");
                    command.add(dir.getAbsolutePath());
                }
            }

            command.add("-l");
            command.add(lang);

            log.info("Tesseract command: {}", String.join(" ", command));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            StringBuilder stdout = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) stdout.append(line).append('\n');
            }

            StringBuilder stderr = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) stderr.append(line).append('\n');
            }

            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.error("Tesseract timed out after 30s for lang={}", lang);
                return "";
            }

            int exit = process.exitValue();
            if (exit != 0) {
                log.warn("Tesseract exited {} for lang={}. stderr: {}", exit, lang, stderr.toString().trim());
                return "";
            }

            return stdout.toString();

        } catch (Throwable t) {
            log.warn("Tesseract CLI error for lang={}: {}", lang, t.getMessage());
            return "";
        }
    }

    // ── Field Extraction ─────────────────────────────────────────────────────

    private CinScanResultDto parseOcrText(String raw) {
        if (raw == null || raw.isBlank()) {
            log.warn("OCR returned blank text — returning empty result");
            return createEmptyResult();
        }

        // Normalize: collapse multiple spaces, unify line endings
        String text = raw.replaceAll("\r\n", "\n").replaceAll("[ \\t]+", " ").trim();
        String[] lines = text.split("\n");

        // ── 1. CIN number ──────────────────────────────────────────────────
        String cin = extractCin(text);

        // ── 2. Nom / Prénom — multi-strategy ──────────────────────────────
        String nom    = extractByLabel(text, NOM_LABEL_PATTERN);
        String prenom = extractByLabel(text, PRENOM_LABEL_PATTERN);

        // Strategy 2b: scan lines for keyword prefix (handles "NOM XXXXX" on one line)
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] resolved = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = resolved[0];
            if (prenom.isEmpty()) prenom = resolved[1];
        }

        // Strategy 2c: heuristic — find the first all-caps line(s) that look like names
        // (used when card has no explicit label — common on biometric Moroccan CINs)
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] resolved = extractNomPrenomHeuristic(lines);
            nom    = resolved[0];
            prenom = resolved[1];
        }

        // ── 3. Date of birth ──────────────────────────────────────────────
        String dateNaissance = extractFirst(text, DATE_PATTERN);

        // ── 4. Address ────────────────────────────────────────────────────
        String adresse = extractByLabel(text, ADRESSE_LABEL_PATTERN);
        if (adresse.isEmpty()) {
            adresse = extractAddressHeuristic(lines);
        }

        // ── Sanitize ──────────────────────────────────────────────────────
        nom    = sanitizeName(nom);
        prenom = sanitizeName(prenom);
        cin    = cin.replaceAll("\\s+", "").toUpperCase();

        double confidence = calculateConfidence(cin, nom, prenom);

        log.info("OCR Result → CIN:'{}' Nom:'{}' Prenom:'{}' Date:'{}' Adresse:'{}' Confidence:{}",
                cin, nom, prenom, dateNaissance, adresse, confidence);

        return CinScanResultDto.builder()
                .cin(cin)
                .nom(nom)
                .prenom(prenom)
                .adresse(adresse)
                .dateNaissance(dateNaissance)
                .confidence(confidence)
                .build();
    }

    /** Extract CIN number — loose pattern, no strict word-boundary reliance */
    private String extractCin(String text) {
        Matcher m = CIN_PATTERN.matcher(text.toUpperCase());
        while (m.find()) {
            String candidate = m.group(1).replaceAll("\\s+", "").toUpperCase();
            // Must have at least one letter prefix
            if (candidate.matches("[A-Z]{1,2}[0-9]{4,7}")) {
                return candidate;
            }
        }
        return "";
    }

    /** Extract field using a label-aware regex (group 1 = value after label) */
    private String extractByLabel(String text, Pattern pattern) {
        Matcher m = pattern.matcher(text);
        if (m.find()) {
            return cleanValue(m.group(1));
        }
        return "";
    }

    /** Extract first match of a simple pattern (group 1) */
    private String extractFirst(String text, Pattern pattern) {
        Matcher m = pattern.matcher(text);
        return m.find() ? cleanValue(m.group(1)) : "";
    }

    /**
     * Line-by-line scan: find lines whose TRIMMED content starts with a known keyword.
     * Handles OCR variants like "NOM.", "N0M:", "PRÉNOM", "PREN0M", etc.
     */
    private String[] extractNomPrenomFromLines(String[] lines, String existingNom, String existingPrenom) {
        String nom    = existingNom;
        String prenom = existingPrenom;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;
            String upper = line.toUpperCase();

            // NOM keyword on the same line OR next line holds the value
            if (nom.isEmpty() && upper.matches("N[O0]M\\s*[:\\-.]?.*")) {
                String inline = line.replaceFirst("(?i)N[O0]M\\s*[:\\-.]?\\s*", "").trim();
                if (!inline.isBlank() && inline.length() >= 2) {
                    nom = cleanValue(inline);
                } else if (i + 1 < lines.length) {
                    // Value is on the next line
                    String nextLine = lines[i + 1].trim();
                    if (!nextLine.isBlank() && nextLine.length() >= 2) {
                        nom = cleanValue(nextLine);
                    }
                }
            }

            // PRENOM keyword (with many OCR typo variants)
            if (prenom.isEmpty() && upper.matches("PR[EÉ][EÉ]?N[O0]M\\s*[:\\-.]?.*")) {
                String inline = line.replaceFirst("(?i)PR[EÉ][EÉ]?N[O0]M\\s*[:\\-.]?\\s*", "").trim();
                if (!inline.isBlank() && inline.length() >= 2) {
                    prenom = cleanValue(inline);
                } else if (i + 1 < lines.length) {
                    String nextLine = lines[i + 1].trim();
                    if (!nextLine.isBlank() && nextLine.length() >= 2) {
                        prenom = cleanValue(nextLine);
                    }
                }
            }

            if (!nom.isEmpty() && !prenom.isEmpty()) break;
        }

        return new String[]{nom, prenom};
    }

    /**
     * Heuristic extraction for biometric Moroccan CINs that have NO explicit NOM/PRENOM labels.
     * Strategy: find consecutive all-uppercase lines (2-4 words, 2-25 chars each word)
     * that don't contain noise tokens and treat them as Nom / Prénom pairs.
     */
    private String[] extractNomPrenomHeuristic(String[] lines) {
        List<String> candidates = new ArrayList<>();

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank() || line.length() < 2) continue;

            // Reject lines that contain digits (likely dates, CIN numbers, addresses)
            if (line.matches(".*\\d.*")) continue;

            // Reject lines shorter than 2 chars or longer than 40
            if (line.length() > 40) continue;

            // Must be mostly alphabetic (allow spaces, hyphens, apostrophes)
            String normalized = line.replaceAll("[\\s\\-']", "");
            if (!normalized.matches("[A-ZÀ-Ÿa-zà-ÿ]+")) continue;

            // Reject noise tokens
            String upper = line.toUpperCase().trim();
            boolean isNoise = NOISE_TOKENS.stream().anyMatch(n -> upper.equals(n) || upper.startsWith(n + " "));
            if (isNoise) continue;

            candidates.add(line.trim());
            if (candidates.size() == 2) break;
        }

        String nom    = candidates.size() > 0 ? candidates.get(0) : "";
        String prenom = candidates.size() > 1 ? candidates.get(1) : "";
        return new String[]{nom, prenom};
    }

    /**
     * Heuristic address extraction: find the first line after an address-related keyword
     * or the first long line (>= 10 chars) containing digits or a city hint.
     */
    private String extractAddressHeuristic(String[] lines) {
        boolean nextIsAddress = false;
        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank()) continue;
            String upper = line.toUpperCase();

            if (nextIsAddress && line.length() >= 5) {
                return cleanValue(line);
            }

            if (upper.matches("(?:ADRESSE|RESIDENCE|DEMEURE|ADR)\\s*[:\\-.]?\\s*")) {
                nextIsAddress = true;
            } else if (upper.matches("(?:ADRESSE|RESIDENCE|DEMEURE|ADR)\\s*[:\\-.]?\\s*.+")) {
                // Inline address
                return cleanValue(line.replaceFirst("(?i)(?:ADRESSE|RESIDENCE|DEMEURE|ADR)\\s*[:\\-.]?\\s*", ""));
            }
        }
        return "";
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String cleanValue(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ").replaceAll("^[:\\-\\.\\s]+|[:\\-\\.\\s]+$", "");
    }

    private String sanitizeName(String val) {
        if (val == null || val.isBlank()) return "";
        String cleaned = cleanValue(val);

        // Reject if it matches a known noise phrase
        String upper = cleaned.toUpperCase();
        for (String noise : NOISE_TOKENS) {
            if (upper.equals(noise) || upper.startsWith(noise + " ")) return "";
        }

        // Must contain at least one letter and be at least 2 chars
        if (!cleaned.matches(".*[A-Za-zÀ-ÿ].*") || cleaned.length() < 2) return "";
        return cleaned;
    }

    private double calculateConfidence(String cin, String nom, String prenom) {
        int found = 0;
        if (!cin.isEmpty())    found++;
        if (!nom.isEmpty())    found++;
        if (!prenom.isEmpty()) found++;

        return switch (found) {
            case 3 -> 0.95;
            case 2 -> 0.75;
            case 1 -> 0.45;
            default -> 0.0;
        };
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
