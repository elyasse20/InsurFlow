package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.CinScanResultDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.RescaleOp;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    // ── Scale factor for upsampling before OCR (higher = better accuracy, slower) ──
    private static final float SCALE_FACTOR = 2.0f;

    // ── Contrast / brightness amplification for RescaleOp ──
    private static final float CONTRAST_SCALE  = 1.6f;   // multiply pixel values
    private static final float CONTRAST_OFFSET = -60.0f; // shift darkens mid-tones

    // ── Moroccan CIN: 1-2 uppercase letters + 5-7 digits ──
    // Accepts spaces/dots between letters and digits (common OCR artefacts)
    // Applied on a pre-cleaned "alphanumeric-only" version of the text
    private static final Pattern CIN_PATTERN =
            Pattern.compile("\\b([A-Z]{1,2})([0-9]{5,7})\\b");

    // ── Label-aware patterns — tolerate OCR typos (0→O, accent loss, missing colon) ──
    private static final Pattern NOM_LABEL_PATTERN =
            Pattern.compile("(?i)N[O0]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    private static final Pattern PRENOM_LABEL_PATTERN =
            Pattern.compile("(?i)PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    private static final Pattern DATE_PATTERN =
            Pattern.compile("\\b(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})\\b");

    private static final Pattern ADRESSE_LABEL_PATTERN =
            Pattern.compile("(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z0-9][A-ZÀ-ÿa-z0-9\\s,./\\-']{4,79})(?=\\s*\\n|$)");

    // ── Noise phrases to skip when doing heuristic name detection ──
    // Listed as full-line noise (exact or prefix match on the uppercased line)
    private static final Set<String> NOISE_EXACT = new HashSet<>(Arrays.asList(
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
    ));

    // ── Prefixes: if a noise word starts the line, skip the whole line ──
    private static final List<String> NOISE_PREFIXES = Arrays.asList(
            "ROYAUME", "CARTE", "NATIONAL", "IDENTITY", "VALABLE",
            "EXPIR", "LIEU", "DATE", "SIGN", "NOM ", "PRENOM"
    );

    // ──────────────────────────────────────────────────────────────────────────
    //  Public entry point
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Performs image preprocessing + Tesseract OCR on an uploaded CIN image.
     * Always returns HTTP 200 with whatever partial data was successfully extracted.
     */
    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("scanCinDocument: null or empty file received.");
            return createEmptyResult();
        }

        log.info("OCR scan started — file: '{}', size: {} bytes",
                file.getOriginalFilename(), file.getSize());

        File rawTemp    = null;
        File cleanedTemp = null;
        String ocrText  = "";

        try {
            // 1. Save the raw upload to a temp file
            rawTemp = saveRawUpload(file);

            // 2. Preprocess image (grayscale + contrast + upscale) → new temp PNG
            cleanedTemp = preprocessImage(rawTemp);

            // 3. Run Tesseract on the preprocessed file
            File ocrInput = (cleanedTemp != null) ? cleanedTemp : rawTemp;
            ocrText = performOcr(ocrInput);

        } catch (Throwable t) {
            log.error("OCR processing failed for '{}': {}", file.getOriginalFilename(), t.getMessage(), t);
            return createEmptyResult();
        } finally {
            deleteSilently(rawTemp);
            deleteSilently(cleanedTemp);
        }

        // 4. Always log the raw OCR output so we can debug extraction issues
        log.info("=== RAW TESSERACT OUTPUT ({} chars) ===\n{}\n=== END RAW OUTPUT ===",
                ocrText.length(), ocrText);

        try {
            return parseOcrText(ocrText);
        } catch (Throwable t) {
            log.error("Failed to parse OCR text: {}", t.getMessage(), t);
            return createEmptyResult();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Image Preprocessing — grayscale + contrast boost + 2× upscale
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Saves the raw MultipartFile to a temp file preserving the original extension.
     */
    private File saveRawUpload(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")).toLowerCase()
                : ".tmp";
        File tmp = File.createTempFile("cin_raw_", ext);
        Files.copy(file.getInputStream(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return tmp;
    }

    /**
     * Preprocesses the uploaded image for better Tesseract accuracy:
     * <ol>
     *   <li>Convert to grayscale</li>
     *   <li>Apply contrast amplification via {@link RescaleOp}</li>
     *   <li>Sharpen with a 3×3 unsharp-mask kernel</li>
     *   <li>Upscale by {@link #SCALE_FACTOR} using bicubic interpolation</li>
     * </ol>
     * Returns {@code null} (silently) if the file is a PDF or if ImageIO cannot
     * read it — in that case the caller falls back to the raw file.
     */
    private File preprocessImage(File input) {
        String name = input.getName().toLowerCase();
        if (name.endsWith(".pdf")) {
            log.debug("Skipping image preprocessing for PDF input.");
            return null;
        }

        try {
            BufferedImage src = ImageIO.read(input);
            if (src == null) {
                log.warn("ImageIO could not read '{}' — skipping preprocessing.", input.getName());
                return null;
            }

            // Step 1: Convert to grayscale
            BufferedImage gray = toGrayscale(src);

            // Step 2: Boost contrast
            BufferedImage contrasted = boostContrast(gray);

            // Step 3: Sharpen (helps OCR on blurry/low-res scans)
            BufferedImage sharpened = sharpen(contrasted);

            // Step 4: Upscale
            BufferedImage upscaled = upscale(sharpened);

            // Step 5: Write to a new temp PNG (PNG is lossless — ideal for OCR)
            File out = File.createTempFile("cin_clean_", ".png");
            ImageIO.write(upscaled, "PNG", out);
            log.info("Preprocessed image saved: {} ({}×{})", out.getName(),
                    upscaled.getWidth(), upscaled.getHeight());
            return out;

        } catch (Exception e) {
            log.warn("Image preprocessing failed — using raw file. Reason: {}", e.getMessage());
            return null;
        }
    }

    /** Convert any image type to TYPE_BYTE_GRAY */
    private BufferedImage toGrayscale(BufferedImage src) {
        BufferedImage gray = new BufferedImage(src.getWidth(), src.getHeight(),
                BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = gray.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return gray;
    }

    /**
     * Amplify contrast using {@link RescaleOp}: out = in * scale + offset.
     * Pixels are clamped to [0, 255] automatically.
     */
    private BufferedImage boostContrast(BufferedImage gray) {
        RescaleOp op = new RescaleOp(CONTRAST_SCALE, CONTRAST_OFFSET, null);
        return op.filter(gray, null);
    }

    /**
     * Applies a 3×3 sharpening kernel (unsharp-mask style).
     * This enhances fine character edges after contrast boosting.
     */
    private BufferedImage sharpen(BufferedImage src) {
        float[] kernelData = {
                 0f, -1f,  0f,
                -1f,  5f, -1f,
                 0f, -1f,  0f
        };
        Kernel kernel = new Kernel(3, 3, kernelData);
        ConvolveOp op = new ConvolveOp(kernel, ConvolveOp.EDGE_NO_OP, null);
        return op.filter(src, null);
    }

    /**
     * Upscales using bicubic interpolation to the configured {@link #SCALE_FACTOR}.
     * Tesseract performs best on images with at least 300 DPI effective resolution.
     */
    private BufferedImage upscale(BufferedImage src) {
        int newW = Math.round(src.getWidth()  * SCALE_FACTOR);
        int newH = Math.round(src.getHeight() * SCALE_FACTOR);
        BufferedImage scaled = new BufferedImage(newW, newH, src.getType());
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,
                RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(src, 0, 0, newW, newH, null);
        g.dispose();
        return scaled;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tesseract CLI
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Runs Tesseract with a language fallback chain:
     * {@code fra+eng} → {@code eng} → {@code fra}.
     */
    private String performOcr(File imageFile) {
        if (imageFile == null || !imageFile.exists()) return "";

        for (String lang : List.of("fra+eng", "eng", "fra")) {
            String result = runTesseract(imageFile, lang);
            if (!result.isBlank()) {
                log.info("Tesseract succeeded with lang='{}'", lang);
                return result;
            }
            log.warn("Tesseract returned blank output for lang='{}', trying next.", lang);
        }
        log.error("All Tesseract language attempts returned blank output.");
        return "";
    }

    private String runTesseract(File imageFile, String lang) {
        try {
            List<String> cmd = new ArrayList<>();
            cmd.add("tesseract");
            cmd.add(imageFile.getAbsolutePath());
            cmd.add("stdout");

            // PSM 6 — treat input as a single uniform block of text (good for ID cards)
            cmd.add("--psm");
            cmd.add("6");

            // OEM 1 — use LSTM neural engine (most accurate on modern Tesseract)
            cmd.add("--oem");
            cmd.add("1");

            if (tessDataPath != null && !tessDataPath.isBlank()) {
                File dir = new File(tessDataPath.trim());
                if (dir.exists() && dir.isDirectory()) {
                    cmd.add("--tessdata-dir");
                    cmd.add(dir.getAbsolutePath());
                }
            }

            cmd.add("-l");
            cmd.add(lang);

            log.info("Tesseract CLI: {}", String.join(" ", cmd));

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            Process proc = pb.start();

            // Drain stdout
            StringBuilder out = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) out.append(line).append('\n');
            }

            // Drain stderr (log only)
            StringBuilder err = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) err.append(line).append('\n');
            }

            boolean done = proc.waitFor(30, TimeUnit.SECONDS);
            if (!done) {
                proc.destroyForcibly();
                log.error("Tesseract process timed out (lang={})", lang);
                return "";
            }

            int exit = proc.exitValue();
            if (exit != 0) {
                log.warn("Tesseract exit={} lang={} stderr: {}", exit, lang, err.toString().trim());
                return "";
            }

            return out.toString();

        } catch (Throwable t) {
            log.warn("Tesseract error lang={}: {}", lang, t.getMessage());
            return "";
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Field Extraction
    // ──────────────────────────────────────────────────────────────────────────

    private CinScanResultDto parseOcrText(String raw) {
        if (raw == null || raw.isBlank()) {
            log.warn("parseOcrText: blank input — returning empty result.");
            return createEmptyResult();
        }

        // Normalize line endings and collapse runs of spaces/tabs
        String text = raw.replace("\r\n", "\n").replace("\r", "\n")
                         .replaceAll("[ \t]+", " ").trim();
        String[] lines = text.split("\n");

        // ── 1. CIN number ──────────────────────────────────────────────────────
        String cin = extractCin(text);

        // ── 2. Nom / Prénom — three-tiered strategy ────────────────────────────
        // Tier 1: label-aware regex on the full text
        String nom    = extractByLabel(text, NOM_LABEL_PATTERN);
        String prenom = extractByLabel(text, PRENOM_LABEL_PATTERN);

        // Tier 2: line-by-line keyword scan (handles labels on separate lines)
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = r[0];
            if (prenom.isEmpty()) prenom = r[1];
        }

        // Tier 3: heuristic — pick prominent all-caps name-like lines (no label at all)
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomHeuristic(lines);
            nom    = r[0];
            prenom = r[1];
        }

        // ── 3. Date of birth ───────────────────────────────────────────────────
        String dateNaissance = extractFirst(text, DATE_PATTERN);

        // ── 4. Address ────────────────────────────────────────────────────────
        String adresse = extractByLabel(text, ADRESSE_LABEL_PATTERN);
        if (adresse.isEmpty()) adresse = extractAddressHeuristic(lines);

        // ── Sanitize ─────────────────────────────────────────────────────────
        nom    = sanitizeName(nom);
        prenom = sanitizeName(prenom);
        cin    = cin.replaceAll("\\s+", "").toUpperCase();

        double confidence = calculateConfidence(cin, nom, prenom);

        log.info("OCR RESULT → CIN:'{}' Nom:'{}' Prenom:'{}' Date:'{}' Adresse:'{}' Confidence:{}",
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

    // ── CIN Extraction ────────────────────────────────────────────────────────

    /**
     * Strips non-alphanumeric characters from the OCR text, then searches for
     * the CIN pattern {@code [A-Z]{1,2}[0-9]{5,7}}.
     * Spaces and punctuation between the letter prefix and digit suffix (common
     * OCR artefacts) are removed before matching.
     */
    private String extractCin(String rawText) {
        // Pass 1: try on the original text (most common case)
        String found = findCinInText(rawText);
        if (!found.isEmpty()) return found;

        // Pass 2: strip all non-alphanumeric chars to collapse "B K 123456" → "BK123456"
        String stripped = rawText.replaceAll("[^A-Za-z0-9]", " ");
        found = findCinInText(stripped);
        if (!found.isEmpty()) return found;

        // Pass 3: fix common digit↔letter OCR confusions then retry
        //   0→O already handled by regex; fix I→1 in the letter prefix area
        String corrected = rawText
                .replaceAll("(?<![0-9])0(?=[A-Z0-9]{5,7}\\b)", "O")  // leading 0 → O
                .replaceAll("(?i)\\b(l|I)([0-9]{5,7})\\b", "I$2");   // l/I + digits → I prefix
        return findCinInText(corrected);
    }

    private String findCinInText(String text) {
        Matcher m = CIN_PATTERN.matcher(text.toUpperCase());
        while (m.find()) {
            String candidate = m.group(1) + m.group(2);
            if (candidate.matches("[A-Z]{1,2}[0-9]{5,7}")) {
                return candidate;
            }
        }
        return "";
    }

    // ── Label-aware extraction ─────────────────────────────────────────────

    private String extractByLabel(String text, Pattern pattern) {
        Matcher m = pattern.matcher(text);
        return m.find() ? cleanValue(m.group(1)) : "";
    }

    private String extractFirst(String text, Pattern pattern) {
        Matcher m = pattern.matcher(text);
        return m.find() ? cleanValue(m.group(1)) : "";
    }

    // ── Line-by-line name scan ────────────────────────────────────────────

    /**
     * Scans each line for a NOM / PRENOM keyword prefix, then captures the value
     * either on the same line or on the immediately following non-blank line.
     * Handles common OCR typos: N0M, PR0NOM, PRÉNOM, PREN0M, etc.
     */
    private String[] extractNomPrenomFromLines(String[] lines, String existingNom, String existingPrenom) {
        String nom    = existingNom;
        String prenom = existingPrenom;

        // Compiled inline to avoid outer-scope static bloat
        Pattern nomKey    = Pattern.compile("(?i)^N[O0]M\\s*[:\\-.]{0,2}\\s*(.*)$");
        Pattern prenomKey = Pattern.compile("(?i)^PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*(.*)$");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;

            if (nom.isEmpty()) {
                Matcher m = nomKey.matcher(line);
                if (m.matches()) {
                    String inline = m.group(1).trim();
                    nom = inline.length() >= 2 ? cleanValue(inline) : peekNextLine(lines, i);
                }
            }

            if (prenom.isEmpty()) {
                Matcher m = prenomKey.matcher(line);
                if (m.matches()) {
                    String inline = m.group(1).trim();
                    prenom = inline.length() >= 2 ? cleanValue(inline) : peekNextLine(lines, i);
                }
            }

            if (!nom.isEmpty() && !prenom.isEmpty()) break;
        }

        return new String[]{nom, prenom};
    }

    private String peekNextLine(String[] lines, int i) {
        for (int j = i + 1; j < lines.length; j++) {
            String next = lines[j].trim();
            if (!next.isBlank() && next.length() >= 2) return cleanValue(next);
        }
        return "";
    }

    // ── Heuristic name extraction (no labels on card) ───────────────────────

    /**
     * Last-resort name extraction for biometric Moroccan CINs that display the
     * holder's name without any label.
     * <p>
     * Algorithm:
     * <ol>
     *   <li>Skip blank, digit-containing, or noise lines.</li>
     *   <li>Require the remaining content to be purely alphabetic (A-Z, accented,
     *       hyphens, apostrophes).</li>
     *   <li>Apply OCR digit-to-letter correction (0→O, 1→I, 8→B) on the
     *       candidate text before scoring.</li>
     *   <li>Collect up to two candidates — the first is treated as nom (family
     *       name, typically all-caps on Moroccan CINs), the second as prenom.</li>
     * </ol>
     */
    private String[] extractNomPrenomHeuristic(String[] lines) {
        List<String> candidates = new ArrayList<>();

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank() || line.length() < 2 || line.length() > 45) continue;

            // Skip lines with digits (dates, CIN, address numbers)
            if (line.matches(".*\\d.*")) continue;

            // Apply common OCR digit→letter corrections before testing
            String corrected = line
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])0(?=[A-ZÀ-ÿa-z])", "O")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])1(?=[A-ZÀ-ÿa-z])", "I")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])8(?=[A-ZÀ-ÿa-z])", "B");

            // Must be purely alpha + allowed punctuation after correction
            String stripped = corrected.replaceAll("[\\s\\-']", "");
            if (!stripped.matches("[A-ZÀ-Ÿa-zà-ÿ]+")) continue;

            // Reject noise phrases
            String upper = corrected.toUpperCase().trim();
            if (isNoiseLine(upper)) continue;

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

    // ── Address heuristic ────────────────────────────────────────────────────

    private String extractAddressHeuristic(String[] lines) {
        boolean nextIsAddress = false;
        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank()) continue;
            String upper = line.toUpperCase();

            if (nextIsAddress && line.length() >= 5) return cleanValue(line);

            if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*")) {
                nextIsAddress = true;
            } else if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*.+")) {
                return cleanValue(
                        line.replaceFirst("(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*", ""));
            }
        }
        return "";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String cleanValue(String raw) {
        if (raw == null) return "";
        return raw.trim()
                  .replaceAll("\\s+", " ")
                  .replaceAll("^[:\\-./\\s]+|[:\\-./\\s]+$", "");
    }

    private String sanitizeName(String val) {
        if (val == null || val.isBlank()) return "";
        String cleaned = cleanValue(val);
        if (cleaned.length() < 2) return "";
        if (!cleaned.matches(".*[A-Za-zÀ-ÿ].*")) return "";
        String upper = cleaned.toUpperCase();
        if (isNoiseLine(upper)) return "";
        return cleaned;
    }

    private double calculateConfidence(String cin, String nom, String prenom) {
        int found = 0;
        if (!cin.isEmpty())    found++;
        if (!nom.isEmpty())    found++;
        if (!prenom.isEmpty()) found++;
        return switch (found) {
            case 3  -> 0.95;
            case 2  -> 0.75;
            case 1  -> 0.45;
            default -> 0.0;
        };
    }

    private void deleteSilently(File f) {
        if (f == null || !f.exists()) return;
        try { if (!f.delete()) f.deleteOnExit(); } catch (Exception ignored) {}
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
