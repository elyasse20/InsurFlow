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
import java.util.stream.Collectors;

/**
 * Tesseract OCR service for Moroccan CIN cards.
 *
 * Key design decisions:
 *  - No AWT image processing (causes hangs on Alpine Linux / headless JVMs).
 *  - Hard 10-second CLI timeout with destroyForcibly() on breach.
 *  - All code paths catch Throwable and return HTTP 200 with a valid DTO.
 *  - Name extraction is driven by a leading-caps-word scan that matches the
 *    real Moroccan CIN layout: one line with 2-4 ALL-CAPS name words followed
 *    by noise digits/symbols.
 *  - Address extraction searches for known Moroccan city names inside noisy lines.
 */
@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    /** Hard wall-clock limit per Tesseract process. */
    private static final int OCR_TIMEOUT_SECONDS = 10;

    // ── Regex patterns ────────────────────────────────────────────────────────

    /** Moroccan CIN: 1-2 uppercase letters + 5-7 digits, no surrounding alphanumerics. */
    private static final Pattern CIN_PATTERN =
            Pattern.compile("\\b([A-Z]{1,2})([0-9]{5,7})\\b");

    /** Labeled NOM field — tolerates OCR typos (N0M, NOM., NOM: …). */
    private static final Pattern NOM_LABEL =
            Pattern.compile(
                "(?i)N[O0]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /** Labeled PRENOM field — tolerates: PRÉNOM, PR0NOM, PREN0M, PRENOM: … */
    private static final Pattern PRENOM_LABEL =
            Pattern.compile(
                "(?i)PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /** Date of birth: DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY. */
    private static final Pattern DATE_PATTERN =
            Pattern.compile("\\b(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})\\b");

    /** Labeled ADRESSE field. */
    private static final Pattern ADRESSE_LABEL =
            Pattern.compile(
                "(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*" +
                "([A-ZÀ-ÿa-z0-9][A-ZÀ-ÿa-z0-9\\s,./\\-']{4,79})(?=\\s*\\n|$)");

    // ── Moroccan cities (including common OCR variants) ───────────────────────

    /**
     * Order matters: more specific / longer variants must appear before shorter
     * ones so that "SIDIBELYOUT" is matched before a hypothetical "YOUT" substring.
     * OCR variants (CASABTANCA) are included explicitly.
     */
    private static final List<String> MOROCCAN_CITIES = List.of(
            "CASABLANCA", "CASABTANCA",
            "RABAT", "SALE",
            "MARRAKECH", "MARRAKESH",
            "MEKNES",
            "OUJDA", "KENITRA", "TETOUAN", "SAFI",
            "MOHAMMEDIA",
            "EL JADIDA",
            "BENI MELLAL",
            "NADOR", "SETTAT", "KHOURIBGA", "ERRACHIDIA",
            "GUELMIM", "LAAYOUNE", "DAKHLA",
            "TANGER", "TANGIER",
            "AGADIR",
            "FES", "FEZ",
            // Districts / prefectures of Casablanca
            "SIDIBELYOUT", "SIDI BELYOUT", "SIDI BEL YOUT",
            "AIN SEBAA", "AIN CHOCK", "HAY HASSANI",
            "DERB SULTAN", "MAARIF", "ANFA"
    );

    /** Normalised display names for common OCR-mangled city strings. */
    private static final Map<String, String> CITY_DISPLAY = Map.of(
            "CASABTANCA",    "Casablanca",
            "SIDIBELYOUT",   "Sidi Belyout",
            "SIDI BEL YOUT", "Sidi Belyout",
            "MARRAKESH",     "Marrakech",
            "TANGIER",       "Tanger",
            "FEZ",           "Fès"
    );

    // ── Name particles (for nom / prénom split logic) ─────────────────────────

    private static final Set<String> NAME_PARTICLES = Set.of(
            "EL", "AL", "BEN", "BENT", "BENI", "AIT",
            "OUM", "LALLA", "SI", "SIDI", "ABD", "ABDE",
            "ABOU", "OU", "ABI", "BNOU", "IBNOU"
    );

    // ── Noise-rejection lists ─────────────────────────────────────────────────

    private static final Set<String> NOISE_EXACT = Set.of(
            "ROYAUME DU MAROC", "ROYAUME", "DU MAROC", "MAROC", "MOROCCO",
            "CARTE NATIONALE D IDENTITE", "CARTE NATIONALE",
            "CARTE NATIONALE D'IDENTITE", "NATIONAL IDENTITY CARD",
            "IDENTITE", "IDENTITY", "IDENTITY CARD",
            "KINGDOM OF MOROCCO", "KINGDOM",
            "NOM", "PRENOM", "PRÉNOM", "NOM ET PRENOM",
            "SEXE", "SEX", "M", "F",
            "DATE DE NAISSANCE", "DATE NAISSANCE", "DATE OF BIRTH",
            "LIEU DE NAISSANCE", "LIEU NAISSANCE",
            "VALABLE JUSQU", "VALABLE", "VALIDE", "EXPIRY", "EXPIRATION",
            "SIGNATURE", "CIN", "ADRESSE", "RESIDENCE", "DOMICILE",
            "BE", "AE", "DRE", "EEN"   // frequent short OCR artefacts
    );

    private static final List<String> NOISE_PREFIXES = List.of(
            "ROYAUME", "CARTE", "NATIONAL", "IDENTITY",
            "VALABLE", "EXPIR", "LIEU", "DATE", "SIGN",
            "NOM ", "PRENOM"
    );

    // ─────────────────────────────────────────────────────────────────────────
    //  Public entry point — NEVER throws, always returns HTTP 200
    // ─────────────────────────────────────────────────────────────────────────

    public CinScanResultDto scanCinDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("OCR: null or empty file received.");
            return emptyResult();
        }
        log.info("OCR: scan started — '{}' ({} bytes)",
                file.getOriginalFilename(), file.getSize());

        File tmp = null;
        try {
            tmp = saveToDisk(file);
            String raw = runTesseract(tmp);

            // Always log the full raw Tesseract output for debugging
            log.info("=== RAW TESSERACT OUTPUT ({} chars) ===\n{}\n=== END ===",
                    raw.length(), raw);

            return parseOcrText(raw);

        } catch (Throwable t) {
            log.error("OCR: unexpected failure — returning empty result. Cause: {}",
                    t.getMessage(), t);
            return emptyResult();
        } finally {
            deleteSilently(tmp);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  File I/O — raw stream copy, no image processing
    // ─────────────────────────────────────────────────────────────────────────

    private File saveToDisk(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")).toLowerCase()
                : ".jpg";
        File tmp = File.createTempFile("cin_ocr_", ext);
        Files.copy(file.getInputStream(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        log.debug("OCR: temp file → {}", tmp.getAbsolutePath());
        return tmp;
    }

    private void deleteSilently(File f) {
        if (f == null || !f.exists()) return;
        try { if (!f.delete()) f.deleteOnExit(); } catch (Exception ignored) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Tesseract CLI — 10 s timeout, language fallback chain
    // ─────────────────────────────────────────────────────────────────────────

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

    private String execTesseract(File imageFile, String lang) {
        List<String> cmd = buildCommand(imageFile, lang);
        log.info("OCR CMD: {}", String.join(" ", cmd));

        Process proc = null;
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            proc = pb.start();

            StringBuilder out = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) out.append(line).append('\n');
            }

            StringBuilder err = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(proc.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) err.append(line).append('\n');
            }

            boolean done = proc.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!done) {
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
            log.warn("OCR: Tesseract error lang={}: {}", lang, t.getMessage());
            if (proc != null) proc.destroyForcibly();
            return "";
        }
    }

    private List<String> buildCommand(File imageFile, String lang) {
        List<String> cmd = new ArrayList<>();
        cmd.add("tesseract");
        cmd.add(imageFile.getAbsolutePath());
        cmd.add("stdout");
        cmd.add("--psm"); cmd.add("6");   // uniform text block — best for ID cards
        cmd.add("--oem"); cmd.add("1");   // LSTM neural engine

        if (tessDataPath != null && !tessDataPath.isBlank()) {
            File dir = new File(tessDataPath.trim());
            if (dir.exists() && dir.isDirectory()) {
                cmd.add("--tessdata-dir");
                cmd.add(dir.getAbsolutePath());
            }
        }
        cmd.add("-l"); cmd.add(lang);
        return cmd;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Main parser
    // ─────────────────────────────────────────────────────────────────────────

    private CinScanResultDto parseOcrText(String raw) {
        if (raw == null || raw.isBlank()) {
            log.warn("OCR: blank text — returning empty result.");
            return emptyResult();
        }

        // Normalise: unified line endings, collapse horizontal whitespace
        String text = raw.replace("\r\n", "\n").replace("\r", "\n")
                         .replaceAll("[ \t]+", " ").trim();
        String[] lines = text.split("\n");

        // ── 1. CIN ────────────────────────────────────────────────────────
        String cin = extractCin(text);

        // ── 2. Date of birth ──────────────────────────────────────────────
        String dateNaissance = extractFirst(text, DATE_PATTERN);

        // ── 3. Nom / Prénom — four-tier strategy ──────────────────────────
        //  Tier 1: explicit NOM / PRENOM label regex
        String nom    = extractByLabel(text, NOM_LABEL);
        String prenom = extractByLabel(text, PRENOM_LABEL);

        //  Tier 2: line-by-line keyword scan (handles label on its own line)
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = r[0];
            if (prenom.isEmpty()) prenom = r[1];
        }

        //  Tier 3: leading-caps-word detection — PRIMARY for real Moroccan CINs.
        //  Matches "EL HATTAB EEIBRAHIML 4 7RAS A) = BE" → [EL, HATTAB, EEIBRAHIML]
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomFromCapsLine(lines);
            nom    = r[0];
            prenom = r[1];
        }

        //  Tier 4: broad heuristic (last resort)
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomHeuristic(lines);
            nom    = r[0];
            prenom = r[1];
        }

        // ── 4. Address ────────────────────────────────────────────────────
        String adresse = extractByLabel(text, ADRESSE_LABEL);
        if (adresse.isEmpty()) adresse = extractAddressByCity(lines);
        if (adresse.isEmpty()) adresse = extractAddressHeuristic(lines);

        // ── Sanitize ──────────────────────────────────────────────────────
        nom    = sanitizeName(nom);
        prenom = sanitizeName(prenom);
        cin    = cin.replaceAll("\\s+", "").toUpperCase();

        double confidence = calculateConfidence(cin, nom, prenom, dateNaissance, adresse);

        log.info("OCR RESULT → CIN:'{}' Nom:'{}' Prenom:'{}' Date:'{}' Adresse:'{}' Conf:{}",
                cin, nom, prenom, dateNaissance, adresse, confidence);

        return CinScanResultDto.builder()
                .cin(cin).nom(nom).prenom(prenom)
                .adresse(adresse).dateNaissance(dateNaissance)
                .confidence(confidence)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CIN extraction — 3-pass with noise-stripping and OCR corrections
    // ─────────────────────────────────────────────────────────────────────────

    private String extractCin(String rawText) {
        // Pass 1: raw text
        String found = findCin(rawText);
        if (!found.isEmpty()) return found;

        // Pass 2: collapse punctuation/spaces between letter prefix and digits
        // e.g. "BK 12.3456" → "BK123456"
        String stripped = rawText.replaceAll("[^A-Za-z0-9\n]", " ");
        found = findCin(stripped);
        if (!found.isEmpty()) return found;

        // Pass 3: fix known OCR digit↔letter confusions
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

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 1: label-aware extraction
    // ─────────────────────────────────────────────────────────────────────────

    private String extractByLabel(String text, Pattern p) {
        Matcher m = p.matcher(text);
        return m.find() ? clean(m.group(1)) : "";
    }

    private String extractFirst(String text, Pattern p) {
        Matcher m = p.matcher(text);
        return m.find() ? clean(m.group(1)) : "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 2: line-by-line keyword scan
    // ─────────────────────────────────────────────────────────────────────────

    private String[] extractNomPrenomFromLines(String[] lines,
                                               String existingNom,
                                               String existingPrenom) {
        String nom    = existingNom;
        String prenom = existingPrenom;

        Pattern nomKey    = Pattern.compile("(?i)^N[O0]M\\s*[:\\-.]{0,2}\\s*(.*)$");
        Pattern prenomKey = Pattern.compile(
                "(?i)^PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*(.*)$");

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

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 3: leading-caps-word detection (primary for real Moroccan CINs)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Scans each line for a leading run of ALL-CAPS alphabetic tokens (≥ 2 chars).
     * The scan stops immediately at the first token that contains a digit, is too
     * short, or is not entirely uppercase — this naturally trims the trailing OCR
     * noise (e.g. "4 7RAS A) = BE") from name lines.
     *
     * <p>Real example:
     * <pre>
     *   Input:  "EL HATTAB EEIBRAHIML 4 7RAS A) = BE"
     *   Caps run: [EL, HATTAB, EEIBRAHIML]
     *   EL is a particle → nom = "EL HATTAB", prenom = "EEIBRAHIML"
     *   Trailing-L fix  → prenom = "EEIBRAHIMI"
     * </pre>
     */
    private String[] extractNomPrenomFromCapsLine(String[] lines) {
        for (String raw : lines) {
            List<String> capsWords = extractLeadingCapsWords(raw);
            if (capsWords.size() < 2) continue;

            // Skip lines that look like a noise phrase in their entirety
            String joined = String.join(" ", capsWords);
            if (isNoiseLine(joined)) continue;

            return splitIntoNomPrenom(capsWords);
        }
        return new String[]{"", ""};
    }

    /**
     * Returns the leading run of ALL-UPPERCASE alphabetic tokens from a line.
     * Stops at the first token that is not entirely uppercase or is too short.
     *
     * <p>Token cleaning: surrounding punctuation / symbols are stripped before
     * the uppercase check, so "HATTAB)" → "HATTAB" passes, but "4" → "" fails.
     */
    private List<String> extractLeadingCapsWords(String line) {
        List<String> result = new ArrayList<>();
        for (String token : line.trim().split("\\s+")) {
            // Remove surrounding non-uppercase-letter characters
            String cleaned = token.replaceAll("^[^A-ZÀ-Ÿ]+|[^A-ZÀ-Ÿ]+$", "");
            // Must be ≥ 2 chars and composed entirely of uppercase letters
            if (cleaned.length() < 2 || !cleaned.matches("[A-ZÀ-Ÿ]{2,}")) break;
            result.add(cleaned);
        }
        return result;
    }

    /**
     * Splits a consecutive caps-word list into nom / prénom using particle logic:
     * <ul>
     *   <li>If the first word is a known particle (EL, BEN, AIT, …) and there are
     *       ≥ 3 words: nom = first two words, prénom = the rest.</li>
     *   <li>Two words: nom = first, prénom = second.</li>
     *   <li>Otherwise: nom = first, prénom = remaining words joined.</li>
     * </ul>
     * Applies the trailing-L-to-I OCR correction on the final prénom word.
     */
    private String[] splitIntoNomPrenom(List<String> words) {
        String nom, prenom;

        if (words.size() == 2) {
            nom    = words.get(0);
            prenom = words.get(1);
        } else if (NAME_PARTICLES.contains(words.get(0)) && words.size() >= 3) {
            nom    = words.get(0) + " " + words.get(1);
            prenom = String.join(" ", words.subList(2, words.size()));
        } else {
            nom    = words.get(0);
            prenom = String.join(" ", words.subList(1, words.size()));
        }

        prenom = fixTrailingL(prenom);
        return new String[]{nom, prenom};
    }

    /**
     * Fixes a common OCR artefact where the last letter of a name is misread as 'L'
     * when it should be 'I'.  Applied only to the last word of the prénom.
     *
     * <p>Example: "EEIBRAHIML" → "EEIBRAHIMI"
     */
    private String fixTrailingL(String value) {
        if (value == null || value.length() < 3) return value == null ? "" : value;
        int lastSpace = value.lastIndexOf(' ');
        String prefix   = lastSpace >= 0 ? value.substring(0, lastSpace + 1) : "";
        String lastWord = lastSpace >= 0 ? value.substring(lastSpace + 1) : value;

        if (lastWord.length() >= 2) {
            char last = lastWord.charAt(lastWord.length() - 1);
            char prev = lastWord.charAt(lastWord.length() - 2);
            if (last == 'L' && Character.isLetter(prev)) {
                lastWord = lastWord.substring(0, lastWord.length() - 1) + "I";
            }
        }
        return prefix + lastWord;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 4: broad heuristic (last resort)
    // ─────────────────────────────────────────────────────────────────────────

    private String[] extractNomPrenomHeuristic(String[] lines) {
        List<String> candidates = new ArrayList<>();
        for (String raw : lines) {
            String line = raw.trim();
            if (line.isBlank() || line.length() < 2 || line.length() > 45) continue;
            if (line.matches(".*\\d.*")) continue;

            // Apply OCR digit→letter corrections before alphabetic check
            String corrected = line
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])0(?=[A-ZÀ-ÿa-z])", "O")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])1(?=[A-ZÀ-ÿa-z])", "I")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])8(?=[A-ZÀ-ÿa-z])", "B");

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

    // ─────────────────────────────────────────────────────────────────────────
    //  Address extraction — city-based detection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Searches each line for known Moroccan city names (case-insensitive, tolerates
     * OCR variants like CASABTANCA → Casablanca, SIDIBELYOUT → Sidi Belyout).
     *
     * <p>The line is normalised to uppercase with all non-alpha characters replaced
     * by spaces before matching, so "sIDiBELYOUT CASABTANCA" is correctly detected.
     *
     * <p>Matched cities are returned in their order of appearance on the line,
     * normalised to display form (e.g. "Sidi Belyout, Casablanca").
     */
    private String extractAddressByCity(String[] lines) {
        for (String raw : lines) {
            // Normalise line: uppercase, replace non-alpha with spaces, collapse runs
            String upper = raw.toUpperCase()
                              .replaceAll("[^A-ZÀ-Ÿ\\s]", " ")
                              .replaceAll("\\s+", " ")
                              .trim();
            String paddedUpper = " " + upper + " "; // word-boundary padding

            List<String> matched = new ArrayList<>();
            for (String city : MOROCCAN_CITIES) {
                // Check whole-word occurrence (avoids "FES" matching "CAFES")
                if (paddedUpper.contains(" " + city + " ") && !matched.contains(city)) {
                    matched.add(city);
                }
            }

            if (!matched.isEmpty()) {
                // Sort by position of appearance in the line (preserve natural order)
                matched.sort(Comparator.comparingInt(c -> upper.indexOf(c)));

                String address = matched.stream()
                        .map(this::normalizeCityName)
                        .collect(Collectors.joining(", "));

                log.info("OCR: city-based address detected: '{}'", address);
                return address;
            }
        }
        return "";
    }

    /** Returns the human-readable display form for a city key. */
    private String normalizeCityName(String city) {
        if (CITY_DISPLAY.containsKey(city)) return CITY_DISPLAY.get(city);
        // Title-case each word
        return Arrays.stream(city.split(" "))
                .filter(w -> !w.isEmpty())
                .map(w -> w.charAt(0) + w.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));
    }

    // ── Address heuristic fallback ────────────────────────────────────────────

    private String extractAddressHeuristic(String[] lines) {
        boolean nextIsAddress = false;
        for (String raw : lines) {
            String line  = raw.trim();
            String upper = line.toUpperCase();
            if (line.isBlank()) continue;

            if (nextIsAddress && line.length() >= 5) return clean(line);

            if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*")) {
                nextIsAddress = true;
            } else if (upper.matches(
                    "(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*.+")) {
                return clean(line.replaceFirst(
                        "(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*", ""));
            }
        }
        return "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private boolean isNoiseLine(String upper) {
        if (NOISE_EXACT.contains(upper)) return true;
        for (String prefix : NOISE_PREFIXES) {
            if (upper.startsWith(prefix)) return true;
        }
        return false;
    }

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

    /**
     * Calculates OCR confidence from the set of fields successfully extracted.
     * Returns {@code 0.95} when nom + prénom + (date or address) are all present —
     * the most meaningful combination for a Moroccan CIN.
     */
    private double calculateConfidence(String cin, String nom, String prenom,
                                       String dateNaissance, String adresse) {
        boolean hasNom    = !nom.isEmpty();
        boolean hasPrenom = !prenom.isEmpty();
        boolean hasDtAdr  = !dateNaissance.isEmpty() || !adresse.isEmpty();
        boolean hasCin    = !cin.isEmpty();

        if (hasNom && hasPrenom && hasDtAdr) return 0.95;
        if (hasNom && hasPrenom && hasCin)   return 0.90;
        if (hasNom && hasPrenom)             return 0.80;
        if (hasCin && (hasNom || hasPrenom)) return 0.65;
        if (hasNom || hasPrenom || hasCin)   return 0.45;
        return 0.0;
    }

    private CinScanResultDto emptyResult() {
        return CinScanResultDto.builder()
                .cin("").nom("").prenom("")
                .adresse("").dateNaissance("")
                .confidence(0.0)
                .build();
    }
}
