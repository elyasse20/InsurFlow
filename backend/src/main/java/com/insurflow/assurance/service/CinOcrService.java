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
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lightweight Tesseract OCR service for Moroccan CIN cards.
 *
 * Design constraints (Alpine Linux / Azure):
 *  - NO AWT image filters (RescaleOp, ConvolveOp, Graphics2D scaling) — they
 *    block the JVM on headless Alpine and cause 30-second timeouts.
 *  - The uploaded file is written to /tmp as-is and passed straight to the
 *    Tesseract CLI binary.
 *  - Tesseract is invoked with a hard 10-second timeout.
 *  - Every code path catches Throwable and returns HTTP 200 with a valid DTO;
 *    a 500 must never reach the client.
 */
@Service
@Slf4j
public class CinOcrService {

    /** Optional override for the Tesseract tessdata directory. */
    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    /** Hard wall-clock limit for a single Tesseract invocation. */
    private static final int OCR_TIMEOUT_SECONDS = 10;

    // ── Regex patterns ────────────────────────────────────────────────────────

    /**
     * Moroccan CIN: 1-2 uppercase letters immediately followed by 5-7 digits.
     * Applied after stripping non-alphanumeric noise from the OCR output.
     */
    private static final Pattern CIN_PATTERN =
            Pattern.compile("\\b([A-Z]{1,2})([0-9]{5,7})\\b");

    /** NOM label — tolerates OCR typos: N0M, NOM., NOM: … */
    private static final Pattern NOM_LABEL =
            Pattern.compile("(?i)N[O0]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /** PRENOM label — tolerates: PRÉNOM, PR0NOM, PREN0M, PRENOM: … */
    private static final Pattern PRENOM_LABEL =
            Pattern.compile("(?i)PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /** Date of birth: DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY */
    private static final Pattern DATE_PATTERN =
            Pattern.compile("\\b(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})\\b");

    /** ADRESSE label */
    private static final Pattern ADRESSE_LABEL =
            Pattern.compile("(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z0-9][A-ZÀ-ÿa-z0-9\\s,./\\-']{4,79})(?=\\s*\\n|$)");

    // ── Noise rejection sets ──────────────────────────────────────────────────

    private static final Set<String> NOISE_EXACT = Set.of(
            "ROYAUME DU MAROC", "ROYAUME", "DU MAROC", "MAROC", "MOROCCO",
            "CARTE NATIONALE D IDENTITE", "CARTE NATIONALE", "CARTE NATIONALE D'IDENTITE",
            "NATIONAL IDENTITY CARD", "IDENTITE", "IDENTITY", "IDENTITY CARD",
            "KINGDOM OF MOROCCO", "KINGDOM",
            "NOM", "PRENOM", "PRÉNOM", "NOM ET PRENOM",
            "SEXE", "SEX", "M", "F",
            "DATE DE NAISSANCE", "DATE NAISSANCE", "DATE OF BIRTH",
            "LIEU DE NAISSANCE", "LIEU NAISSANCE",
            "VALABLE JUSQU", "VALABLE", "VALIDE", "EXPIRY", "EXPIRATION",
            "SIGNATURE", "CIN", "ADRESSE", "RESIDENCE", "DOMICILE"
    );

    private static final List<String> NOISE_PREFIXES = List.of(
            "ROYAUME", "CARTE", "NATIONAL", "IDENTITY", "VALABLE",
            "EXPIR", "LIEU", "DATE", "SIGN", "NOM ", "PRENOM"
    );

    // ──────────────────────────────────────────────────────────────────────────
    //  Public entry point — NEVER throws, always returns HTTP 200
    // ──────────────────────────────────────────────────────────────────────────

    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("OCR: received null or empty file.");
            return emptyResult();
        }

        log.info("OCR: starting scan for '{}' ({} bytes)",
                file.getOriginalFilename(), file.getSize());

        File tmp = null;
        try {
            tmp = saveToDisk(file);
            String raw = runTesseract(tmp);

            // Always log the full OCR text so extraction failures are debuggable
            log.info("=== RAW TESSERACT OUTPUT ({} chars) ===\n{}\n=== END ===",
                    raw.length(), raw);

            return parseOcrText(raw);

        } catch (Throwable t) {
            // Catch-all: never let a 500 escape to the client
            log.error("OCR: unexpected error — returning empty result. Cause: {}", t.getMessage(), t);
            return emptyResult();
        } finally {
            deleteSilently(tmp);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  File I/O — simple stream copy, no image manipulation
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Writes the raw MultipartFile bytes directly to a temp file.
     * No image processing is performed — the file is passed as-is to Tesseract.
     */
    private File saveToDisk(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")).toLowerCase()
                : ".jpg";
        File tmp = File.createTempFile("cin_ocr_", ext);
        Files.copy(file.getInputStream(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        log.debug("OCR: temp file written → {}", tmp.getAbsolutePath());
        return tmp;
    }

    private void deleteSilently(File f) {
        if (f == null || !f.exists()) return;
        try { if (!f.delete()) f.deleteOnExit(); } catch (Exception ignored) {}
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tesseract CLI — 10-second hard timeout, language fallback
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Attempts OCR with the language chain {@code fra+eng → eng → fra}.
     * Returns the first non-blank result, or an empty string if all attempts fail.
     */
    private String runTesseract(File imageFile) {
        for (String lang : List.of("fra+eng", "eng", "fra")) {
            String result = execTesseract(imageFile, lang);
            if (!result.isBlank()) {
                log.info("OCR: success with lang='{}'", lang);
                return result;
            }
            log.warn("OCR: blank output for lang='{}', trying next.", lang);
        }
        log.error("OCR: all language attempts returned blank output.");
        return "";
    }

    /**
     * Executes one Tesseract CLI call:
     * <pre>tesseract &lt;file&gt; stdout --psm 6 --oem 1 [-tessdata-dir …] -l &lt;lang&gt;</pre>
     *
     * @param imageFile the image to process
     * @param lang      Tesseract language string, e.g. {@code "fra+eng"}
     * @return stdout text, or {@code ""} on any failure / timeout
     */
    private String execTesseract(File imageFile, String lang) {
        List<String> cmd = buildCommand(imageFile, lang);
        log.info("OCR: {}", String.join(" ", cmd));

        Process proc = null;
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            proc = pb.start();

            // Drain stdout on the calling thread
            StringBuilder out = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) out.append(line).append('\n');
            }

            // Drain stderr (log only — don't block)
            StringBuilder err = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) err.append(line).append('\n');
            }

            boolean finished = proc.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                log.error("OCR: Tesseract timed out after {}s (lang={})", OCR_TIMEOUT_SECONDS, lang);
                proc.destroyForcibly();
                return "";
            }

            int exit = proc.exitValue();
            if (exit != 0) {
                log.warn("OCR: Tesseract exit={} lang={} | stderr: {}",
                        exit, lang, err.toString().trim());
                return "";
            }

            return out.toString();

        } catch (Throwable t) {
            log.warn("OCR: Tesseract execution error lang={}: {}", lang, t.getMessage());
            if (proc != null) proc.destroyForcibly();
            return "";
        }
    }

    private List<String> buildCommand(File imageFile, String lang) {
        List<String> cmd = new ArrayList<>();
        cmd.add("tesseract");
        cmd.add(imageFile.getAbsolutePath());
        cmd.add("stdout");
        cmd.add("--psm");
        cmd.add("6");   // Uniform block of text — best for ID cards
        cmd.add("--oem");
        cmd.add("1");   // LSTM neural engine (most accurate)

        if (tessDataPath != null && !tessDataPath.isBlank()) {
            File dir = new File(tessDataPath.trim());
            if (dir.exists() && dir.isDirectory()) {
                cmd.add("--tessdata-dir");
                cmd.add(dir.getAbsolutePath());
            }
        }

        cmd.add("-l");
        cmd.add(lang);
        return cmd;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Field Extraction
    // ──────────────────────────────────────────────────────────────────────────

    private CinScanResultDto parseOcrText(String raw) {
        if (raw == null || raw.isBlank()) {
            log.warn("OCR: blank text — returning empty result.");
            return emptyResult();
        }

        // Normalize: unify line endings, collapse horizontal whitespace
        String text = raw.replace("\r\n", "\n")
                         .replace("\r", "\n")
                         .replaceAll("[ \t]+", " ")
                         .trim();
        String[] lines = text.split("\n");

        // 1 ── CIN number
        String cin = extractCin(text);

        // 2 ── Nom / Prénom  (three-tier fallback)
        String nom    = extractByLabel(text, NOM_LABEL);
        String prenom = extractByLabel(text, PRENOM_LABEL);

        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = r[0];
            if (prenom.isEmpty()) prenom = r[1];
        }

        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomHeuristic(lines);
            nom    = r[0];
            prenom = r[1];
        }

        // 3 ── Date of birth
        String dateNaissance = extractFirst(text, DATE_PATTERN);

        // 4 ── Address
        String adresse = extractByLabel(text, ADRESSE_LABEL);
        if (adresse.isEmpty()) adresse = extractAddressHeuristic(lines);

        // Sanitize
        nom    = sanitizeName(nom);
        prenom = sanitizeName(prenom);
        cin    = cin.replaceAll("\\s+", "").toUpperCase();

        double confidence = calculateConfidence(cin, nom, prenom);

        log.info("OCR RESULT → CIN:'{}' Nom:'{}' Prenom:'{}' Date:'{}' Adresse:'{}' Conf:{}",
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

    // ── CIN ───────────────────────────────────────────────────────────────────

    /**
     * Three-pass CIN search:
     * <ol>
     *   <li>Raw text as-is</li>
     *   <li>Non-alphanumeric characters stripped (collapses "B K 123 456" → "BK123456")</li>
     *   <li>Common OCR digit↔letter corrections applied (0→O, leading l/I→I)</li>
     * </ol>
     */
    private String extractCin(String rawText) {
        String found = findCin(rawText);
        if (!found.isEmpty()) return found;

        String stripped = rawText.replaceAll("[^A-Za-z0-9\n]", " ");
        found = findCin(stripped);
        if (!found.isEmpty()) return found;

        String corrected = rawText
                .replaceAll("(?<![0-9])0(?=[A-Z0-9]{5,7}\\b)", "O")
                .replaceAll("(?i)\\b([lI])([0-9]{5,7})\\b", "I$2");
        return findCin(corrected);
    }

    private String findCin(String text) {
        Matcher m = CIN_PATTERN.matcher(text.toUpperCase());
        while (m.find()) {
            String candidate = m.group(1) + m.group(2);
            if (candidate.matches("[A-Z]{1,2}[0-9]{5,7}")) return candidate;
        }
        return "";
    }

    // ── Label-aware extraction ─────────────────────────────────────────────

    private String extractByLabel(String text, Pattern p) {
        Matcher m = p.matcher(text);
        return m.find() ? clean(m.group(1)) : "";
    }

    private String extractFirst(String text, Pattern p) {
        Matcher m = p.matcher(text);
        return m.find() ? clean(m.group(1)) : "";
    }

    // ── Line-by-line name scan ────────────────────────────────────────────

    private String[] extractNomPrenomFromLines(String[] lines, String existingNom, String existingPrenom) {
        String nom    = existingNom;
        String prenom = existingPrenom;

        Pattern nomKey    = Pattern.compile("(?i)^N[O0]M\\s*[:\\-.]{0,2}\\s*(.*)$");
        Pattern prenomKey = Pattern.compile("(?i)^PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*(.*)$");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;

            if (nom.isEmpty()) {
                Matcher m = nomKey.matcher(line);
                if (m.matches()) {
                    String inline = m.group(1).trim();
                    nom = inline.length() >= 2 ? clean(inline) : peekNext(lines, i);
                }
            }
            if (prenom.isEmpty()) {
                Matcher m = prenomKey.matcher(line);
                if (m.matches()) {
                    String inline = m.group(1).trim();
                    prenom = inline.length() >= 2 ? clean(inline) : peekNext(lines, i);
                }
            }
            if (!nom.isEmpty() && !prenom.isEmpty()) break;
        }
        return new String[]{nom, prenom};
    }

    private String peekNext(String[] lines, int i) {
        for (int j = i + 1; j < lines.length; j++) {
            String next = lines[j].trim();
            if (!next.isBlank() && next.length() >= 2) return clean(next);
        }
        return "";
    }

    // ── Heuristic name extraction (no labels on card) ────────────────────────

    /**
     * Picks up to two prominent alphabetic lines that are not ID-card boilerplate.
     * Applies OCR digit→letter corrections before testing (0→O, 1→I, 8→B).
     */
    private String[] extractNomPrenomHeuristic(String[] lines) {
        List<String> candidates = new ArrayList<>();

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank() || line.length() < 2 || line.length() > 45) continue;
            if (line.matches(".*\\d.*")) continue;          // skip lines with digits

            // Fix common OCR digit-as-letter substitutions within a word
            String corrected = line
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])0(?=[A-ZÀ-ÿa-z])", "O")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])1(?=[A-ZÀ-ÿa-z])", "I")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])8(?=[A-ZÀ-ÿa-z])", "B");

            // Must be purely alphabetic after stripping spaces/hyphens/apostrophes
            if (!corrected.replaceAll("[\\s\\-']", "").matches("[A-ZÀ-Ÿa-zà-ÿ]+")) continue;

            if (isNoiseLine(corrected.toUpperCase().trim())) continue;

            candidates.add(corrected.trim());
            if (candidates.size() == 2) break;
        }

        return new String[]{
                candidates.size() > 0 ? candidates.get(0) : "",
                candidates.size() > 1 ? candidates.get(1) : ""
        };
    }

    private boolean isNoiseLine(String upper) {
        if (NOISE_EXACT.contains(upper)) return true;
        for (String prefix : NOISE_PREFIXES) {
            if (upper.startsWith(prefix)) return true;
        }
        return false;
    }

    // ── Address heuristic ─────────────────────────────────────────────────────

    private String extractAddressHeuristic(String[] lines) {
        boolean nextIsAddress = false;
        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank()) continue;
            String upper = line.toUpperCase();

            if (nextIsAddress && line.length() >= 5) return clean(line);

            if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*")) {
                nextIsAddress = true;
            } else if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*.+")) {
                return clean(line.replaceFirst(
                        "(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*", ""));
            }
        }
        return "";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String clean(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ").replaceAll("^[:\\-./\\s]+|[:\\-./\\s]+$", "");
    }

    private String sanitizeName(String val) {
        if (val == null || val.isBlank()) return "";
        String s = clean(val);
        if (s.length() < 2 || !s.matches(".*[A-Za-zÀ-ÿ].*")) return "";
        if (isNoiseLine(s.toUpperCase().trim())) return "";
        return s;
    }

    private double calculateConfidence(String cin, String nom, String prenom) {
        int n = 0;
        if (!cin.isEmpty())    n++;
        if (!nom.isEmpty())    n++;
        if (!prenom.isEmpty()) n++;
        return switch (n) {
            case 3  -> 0.95;
            case 2  -> 0.75;
            case 1  -> 0.45;
            default -> 0.0;
        };
    }

    private CinScanResultDto emptyResult() {
        return CinScanResultDto.builder()
                .cin("").nom("").prenom("")
                .adresse("").dateNaissance("")
                .confidence(0.0)
                .build();
    }
}
