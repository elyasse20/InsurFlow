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
 *  - All code paths catch Throwable — never throws, always returns HTTP 200.
 *  - Supports dual-image scan (recto + verso): both images are OCR'd and merged.
 *
 * Moroccan CIN Recto field order (top → bottom):
 *   Line 1: Prénom (First Name)  — e.g. ELYASSE
 *   Line 2: Nom (Family Name)    — e.g. EL HATTAB ELIBRAHIMI
 *   CIN number printed under the photo, bottom-right corner.
 *   Birth date follows "Né le" label; expiry follows "Valable jusqu'au".
 */
@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    private static final int OCR_TIMEOUT_SECONDS = 10;

    // ── CIN regex ─────────────────────────────────────────────────────────────
    // Matches 1-2 uppercase letters + 4-7 digits anywhere in text (loose, no \b
    // dependency so it works even when surrounding chars are noise).
    // Applied on the alphanumeric-stripped version of each line for maximum coverage.
    private static final Pattern CIN_PATTERN =
            Pattern.compile("(?<![A-Z0-9])([A-Z]{1,2})[\\s.]?([0-9]{4,7})(?![0-9])",
                    Pattern.CASE_INSENSITIVE);

    // ── Date patterns ─────────────────────────────────────────────────────────
    // Standard date: DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
    private static final Pattern DATE_PATTERN =
            Pattern.compile("\\b(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})\\b");

    // "Né le" / "Née le" label — birth date follows on same line or next
    private static final Pattern NEE_LE_PATTERN =
            Pattern.compile("(?i)n[eé]e?\\s+le\\s+(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})");

    // "Valable jusqu'au" / "Valable" — expiry date
    private static final Pattern VALABLE_PATTERN =
            Pattern.compile("(?i)valable\\s+(?:jusqu(?:'|')au\\s+)?(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4})");

    // ── Label-aware name patterns ─────────────────────────────────────────────
    private static final Pattern NOM_LABEL =
            Pattern.compile(
                "(?i)N[O0]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    private static final Pattern PRENOM_LABEL =
            Pattern.compile(
                "(?i)PR[EÉeé][EÉeé]?N[O0o]M\\s*[:\\-.]{0,2}\\s*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    // ── Address label ─────────────────────────────────────────────────────────
    private static final Pattern ADRESSE_LABEL =
            Pattern.compile(
                "(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*" +
                "([A-ZÀ-ÿa-z0-9][A-ZÀ-ÿa-z0-9\\s,./\\-']{4,79})(?=\\s*\\n|$)");

    // ── Moroccan cities ───────────────────────────────────────────────────────
    private static final List<String> MOROCCAN_CITIES = List.of(
            "CASABLANCA", "CASABTANCA",
            "RABAT", "SALE",
            "MARRAKECH", "MARRAKESH",
            "MEKNES",
            "OUJDA", "KENITRA", "TETOUAN", "SAFI",
            "MOHAMMEDIA", "EL JADIDA", "BENI MELLAL",
            "NADOR", "SETTAT", "KHOURIBGA", "ERRACHIDIA",
            "GUELMIM", "LAAYOUNE", "DAKHLA",
            "TANGER", "TANGIER",
            "AGADIR",
            "FES", "FEZ",
            "SIDIBELYOUT", "SIDI BELYOUT", "SIDI BEL YOUT",
            "AIN SEBAA", "AIN CHOCK", "HAY HASSANI",
            "DERB SULTAN", "MAARIF", "ANFA"
    );

    private static final Map<String, String> CITY_DISPLAY = Map.of(
            "CASABTANCA",    "Casablanca",
            "SIDIBELYOUT",   "Sidi Belyout",
            "SIDI BEL YOUT", "Sidi Belyout",
            "MARRAKESH",     "Marrakech",
            "TANGIER",       "Tanger",
            "FEZ",           "Fès"
    );

    // ── Name particles ────────────────────────────────────────────────────────
    private static final Set<String> NAME_PARTICLES = Set.of(
            "EL", "AL", "BEN", "BENT", "BENI", "AIT",
            "OUM", "LALLA", "SI", "SIDI", "ABD", "ABDE",
            "ABOU", "OU", "ABI", "BNOU", "IBNOU"
    );

    // ── Noise rejection ───────────────────────────────────────────────────────
    private static final Set<String> NOISE_EXACT = Set.of(
            "ROYAUME DU MAROC", "ROYAUME", "DU MAROC", "MAROC", "MOROCCO",
            "CARTE NATIONALE D IDENTITE", "CARTE NATIONALE",
            "CARTE NATIONALE D'IDENTITE", "NATIONAL IDENTITY CARD",
            "IDENTITE", "IDENTITY", "IDENTITY CARD",
            "KINGDOM OF MOROCCO", "KINGDOM",
            "NOM", "PRENOM", "PRÉNOM", "NOM ET PRENOM",
            "SEXE", "SEX", "M", "F",
            "DATE DE NAISSANCE", "DATE NAISSANCE", "DATE OF BIRTH",
            "NEE LE", "NE LE", "NÉ LE", "NÉE LE",
            "LIEU DE NAISSANCE", "LIEU NAISSANCE",
            "VALABLE JUSQU", "VALABLE", "VALIDE", "EXPIRY", "EXPIRATION",
            "SIGNATURE", "CIN", "ADRESSE", "RESIDENCE", "DOMICILE",
            "BE", "AE", "DRE", "EEN"
    );

    private static final List<String> NOISE_PREFIXES = List.of(
            "ROYAUME", "CARTE", "NATIONAL", "IDENTITY",
            "VALABLE", "EXPIR", "LIEU", "DATE", "SIGN",
            "NOM ", "PRENOM", "NE LE", "NEE", "NÉ"
    );

    // ─────────────────────────────────────────────────────────────────────────
    //  Public entry points — NEVER throw, always return HTTP 200
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Scan a single CIN image (backward-compatible with the existing controller).
     */
    public CinScanResultDto scanCinDocument(MultipartFile file) {
        return scanCinDocuments(file, null);
    }

    /**
     * Scan recto + optional verso, merge extracted fields.
     * Fields found on the recto take priority; verso fills in any gaps.
     */
    public CinScanResultDto scanCinDocuments(MultipartFile recto, MultipartFile verso) {
        CinScanResultDto rectoResult = scanSingle(recto, "recto");
        if (verso == null || verso.isEmpty()) return rectoResult;

        CinScanResultDto versoResult = scanSingle(verso, "verso");
        return merge(rectoResult, versoResult);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal: scan one image
    // ─────────────────────────────────────────────────────────────────────────

    private CinScanResultDto scanSingle(MultipartFile file, String label) {
        if (file == null || file.isEmpty()) {
            log.warn("OCR [{}]: null or empty file — skipping.", label);
            return emptyResult();
        }
        log.info("OCR [{}]: scan started — '{}' ({} bytes)",
                label, file.getOriginalFilename(), file.getSize());

        File tmp = null;
        try {
            tmp = saveToDisk(file);
            String raw = runTesseract(tmp);
            log.info("=== RAW OCR [{}] ({} chars) ===\n{}\n=== END [{}] ===",
                    label, raw.length(), raw, label);
            return parseOcrText(raw);
        } catch (Throwable t) {
            log.error("OCR [{}]: unexpected failure — {}", label, t.getMessage(), t);
            return emptyResult();
        } finally {
            deleteSilently(tmp);
        }
    }

    /**
     * Merges two scan results: recto fields take priority; verso fills any gaps.
     * Confidence is recalculated from the merged fields.
     */
    private CinScanResultDto merge(CinScanResultDto r, CinScanResultDto v) {
        String cin           = first(r.getCin(),           v.getCin());
        String nom           = first(r.getNom(),           v.getNom());
        String prenom        = first(r.getPrenom(),        v.getPrenom());
        String adresse       = first(r.getAdresse(),       v.getAdresse());
        String dateNaissance = first(r.getDateNaissance(), v.getDateNaissance());
        String expiry        = first(r.getExpiry(),        v.getExpiry());

        double confidence = calculateConfidence(cin, nom, prenom, dateNaissance, adresse);
        log.info("OCR MERGED → CIN:'{}' Nom:'{}' Prenom:'{}' Date:'{}' Exp:'{}' Addr:'{}' Conf:{}",
                cin, nom, prenom, dateNaissance, expiry, adresse, confidence);

        return CinScanResultDto.builder()
                .cin(cin).nom(nom).prenom(prenom)
                .adresse(adresse).dateNaissance(dateNaissance)
                .expiry(expiry).confidence(confidence)
                .build();
    }

    private static String first(String a, String b) {
        return (a != null && !a.isBlank()) ? a.trim() : (b != null ? b.trim() : "");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  File I/O
    // ─────────────────────────────────────────────────────────────────────────

    private File saveToDisk(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")).toLowerCase()
                : ".jpg";
        File tmp = File.createTempFile("cin_ocr_", ext);
        Files.copy(file.getInputStream(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
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
            log.warn("OCR: blank for lang='{}', trying next.", lang);
        }
        log.error("OCR: all language attempts returned blank.");
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
                log.error("OCR: timed out after {}s (lang={})", OCR_TIMEOUT_SECONDS, lang);
                proc.destroyForcibly();
                return "";
            }
            int exit = proc.exitValue();
            if (exit != 0) {
                log.warn("OCR: exit={} lang={} stderr: {}", exit, lang, err.toString().trim());
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
        cmd.add("--psm"); cmd.add("6");
        cmd.add("--oem"); cmd.add("1");
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

        String text = raw.replace("\r\n", "\n").replace("\r", "\n")
                         .replaceAll("[ \t]+", " ").trim();
        String[] lines = text.split("\n");

        // ── 1. CIN (anywhere in document, 3-pass) ─────────────────────────
        String cin = extractCin(text, lines);

        // ── 2. Dates — distinguish birth date vs expiry ────────────────────
        String dateNaissance = "";
        String expiry        = "";

        // Try labeled patterns first
        Matcher neeMatcher = NEE_LE_PATTERN.matcher(text);
        if (neeMatcher.find()) dateNaissance = clean(neeMatcher.group(1));

        Matcher valMatcher = VALABLE_PATTERN.matcher(text);
        if (valMatcher.find()) expiry = clean(valMatcher.group(1));

        // If only one date found by unlabeled pattern, assign based on value:
        // earlier date = birth, later date = expiry
        if (dateNaissance.isEmpty() || expiry.isEmpty()) {
            List<String> allDates = extractAllDates(text);
            if (allDates.size() >= 2) {
                // Sort by date value (YYYY from position [6..10])
                allDates.sort(Comparator.comparing(d -> d.substring(6)));
                if (dateNaissance.isEmpty()) dateNaissance = allDates.get(0);
                if (expiry.isEmpty())        expiry        = allDates.get(allDates.size() - 1);
            } else if (allDates.size() == 1 && dateNaissance.isEmpty()) {
                // Single date: treat as birth date only if year looks like a birthyear
                String year = allDates.get(0).substring(6);
                int y = Integer.parseInt(year);
                if (y <= 2010) dateNaissance = allDates.get(0);
                else           expiry        = allDates.get(0);
            }
        }

        // ── 3. Nom / Prénom — correct Moroccan CIN field order ────────────
        //
        // On the official Moroccan CIN Recto:
        //   • Line 1 (directly under headers): PRÉNOM  (first name, often a single word)
        //   • Line 2 (below):                  NOM     (family name, often 2-3 words)
        //
        // Strategy: collect the first two distinct caps-word candidate lines,
        // then assign: candidates[0] → prénom, candidates[1] → nom.

        // Tier 1: explicit labels
        String nom    = extractByLabel(text, NOM_LABEL);
        String prenom = extractByLabel(text, PRENOM_LABEL);

        // Tier 2: line-by-line keyword scan
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = r[0];
            if (prenom.isEmpty()) prenom = r[1];
        }

        // Tier 3: caps-line scan — respects Moroccan CIN field order
        // (first caps line = prénom, second caps line = nom)
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomCapsOrder(lines);
            prenom = r[0];   // ← first caps candidate = prénom
            nom    = r[1];   // ← second caps candidate = nom
        }

        // Tier 4: broad heuristic (last resort)
        if (nom.isEmpty() && prenom.isEmpty()) {
            String[] r = extractNomPrenomHeuristic(lines);
            prenom = r[0];
            nom    = r[1];
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

        log.info("OCR RESULT → CIN:'{}' Prenom:'{}' Nom:'{}' DateNaissance:'{}' Expiry:'{}' Addr:'{}' Conf:{}",
                cin, prenom, nom, dateNaissance, expiry, adresse, confidence);

        return CinScanResultDto.builder()
                .cin(cin).nom(nom).prenom(prenom)
                .adresse(adresse).dateNaissance(dateNaissance)
                .expiry(expiry).confidence(confidence)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CIN extraction — 3-pass, line-by-line for bottom-of-card number
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Searches for the CIN number using three passes, scanning all lines so the
     * number printed under the photo (bottom-right) is not missed.
     */
    private String extractCin(String fullText, String[] lines) {
        // Pass 1: raw full text
        String found = findCin(fullText);
        if (!found.isEmpty()) return found;

        // Pass 2: scan each line individually after stripping noise chars
        for (String raw : lines) {
            // Strip non-alphanumeric so "BM.44511" → "BM44511"
            String stripped = raw.replaceAll("[^A-Za-z0-9]", "");
            found = findCin(stripped);
            if (!found.isEmpty()) return found;
        }

        // Pass 3: OCR digit↔letter corrections on full text
        String corrected = fullText
                .replaceAll("(?<![0-9])0(?=[A-Z0-9]{4,7}\\b)", "O")
                .replaceAll("(?i)\\b([lI])([0-9]{4,7})\\b", "I$2");
        return findCin(corrected);
    }

    private String findCin(String text) {
        Matcher m = CIN_PATTERN.matcher(text.toUpperCase());
        while (m.find()) {
            String letters = m.group(1);
            String digits  = m.group(2);
            String candidate = letters + digits;
            // Validate: 1-2 letters + 4-7 digits
            if (candidate.matches("[A-Z]{1,2}[0-9]{4,7}")) return candidate;
        }
        return "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Date extraction helpers
    // ─────────────────────────────────────────────────────────────────────────

    private List<String> extractAllDates(String text) {
        List<String> dates = new ArrayList<>();
        Matcher m = DATE_PATTERN.matcher(text);
        while (m.find()) {
            String d = clean(m.group(1));
            if (!dates.contains(d)) dates.add(d);
        }
        return dates;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 1: label-aware extraction
    // ─────────────────────────────────────────────────────────────────────────

    private String extractByLabel(String text, Pattern p) {
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
    //  Tier 3: caps-line scan — respects Moroccan CIN field order
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Collects up to two caps-line candidates and assigns them in Moroccan CIN order:
     * <ul>
     *   <li>Candidate 0 (first caps line encountered) → <b>Prénom</b></li>
     *   <li>Candidate 1 (second caps line)            → <b>Nom</b> (may include particle)</li>
     * </ul>
     *
     * <p>A single-word caps line is treated as a prénom (first name).
     * A multi-word caps line whose first word is a particle (EL, BEN …) is treated as
     * a family name.  If only one candidate is found, heuristic position decides.
     *
     * <p>Trailing-L-to-I OCR correction is applied to whichever field it belongs to.
     */
    private String[] extractNomPrenomCapsOrder(String[] lines) {
        List<String> candidates = new ArrayList<>();

        for (String raw : lines) {
            List<String> capsWords = extractLeadingCapsWords(raw);
            if (capsWords.isEmpty()) continue;

            String joined = String.join(" ", capsWords);
            if (isNoiseLine(joined)) continue;

            candidates.add(joined);
            if (candidates.size() == 2) break;
        }

        if (candidates.isEmpty()) return new String[]{"", ""};

        if (candidates.size() == 1) {
            String only = candidates.get(0);
            String[] words = only.split(" ");
            // Single word → prénom; multi-word starting with particle → nom
            if (words.length == 1) return new String[]{only, ""};
            if (NAME_PARTICLES.contains(words[0])) return new String[]{"", only};
            return new String[]{words[0],
                    fixTrailingL(String.join(" ", Arrays.copyOfRange(words, 1, words.length)))};
        }

        // Two candidates — first = prénom, second = nom
        String prenomRaw = candidates.get(0);
        String nomRaw    = candidates.get(1);

        // If first candidate is clearly a family name (starts with particle + has 2+ words),
        // and second is a single word — swap them
        String[] prenomWords = prenomRaw.split(" ");
        String[] nomWords    = nomRaw.split(" ");
        if (NAME_PARTICLES.contains(prenomWords[0]) && prenomWords.length >= 2
                && nomWords.length == 1) {
            String tmp = prenomRaw;
            prenomRaw  = nomRaw;
            nomRaw     = tmp;
        }

        return new String[]{
                fixTrailingL(prenomRaw),
                fixTrailingL(nomRaw)
        };
    }

    /**
     * Returns the leading run of ALL-UPPERCASE alphabetic tokens from a line.
     * Stops at the first token that is not entirely uppercase or is shorter than 2 chars.
     * Token-level punctuation/symbols are stripped before the uppercase check.
     */
    private List<String> extractLeadingCapsWords(String line) {
        List<String> result = new ArrayList<>();
        for (String token : line.trim().split("\\s+")) {
            String cleaned = token.replaceAll("^[^A-ZÀ-Ÿ]+|[^A-ZÀ-Ÿ]+$", "");
            if (cleaned.length() < 2 || !cleaned.matches("[A-ZÀ-Ÿ]{2,}")) break;
            result.add(cleaned);
        }
        return result;
    }

    /**
     * Fixes trailing 'L' misread as 'I' by Tesseract on the last word of a name.
     * Example: "EEIBRAHIML" → "EEIBRAHIMI"
     */
    private String fixTrailingL(String value) {
        if (value == null || value.length() < 3) return value == null ? "" : value;
        int lastSpace  = value.lastIndexOf(' ');
        String prefix  = lastSpace >= 0 ? value.substring(0, lastSpace + 1) : "";
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
            String corrected = line
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])0(?=[A-ZÀ-ÿa-z])", "O")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])1(?=[A-ZÀ-ÿa-z])", "I")
                    .replaceAll("(?<=[A-ZÀ-ÿa-z])8(?=[A-ZÀ-ÿa-z])", "B");
            if (!corrected.replaceAll("[\\s\\-']", "").matches("[A-ZÀ-Ÿa-zà-ÿ]+")) continue;
            if (isNoiseLine(corrected.toUpperCase().trim())) continue;
            candidates.add(corrected.trim());
            if (candidates.size() == 2) break;
        }
        // Heuristic order also respects CIN layout: first = prénom, second = nom
        return new String[]{
                candidates.size() > 0 ? candidates.get(0) : "",
                candidates.size() > 1 ? candidates.get(1) : ""
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Address extraction
    // ─────────────────────────────────────────────────────────────────────────

    private String extractAddressByCity(String[] lines) {
        for (String raw : lines) {
            String upper = raw.toUpperCase()
                              .replaceAll("[^A-ZÀ-Ÿ\\s]", " ")
                              .replaceAll("\\s+", " ").trim();
            String padded = " " + upper + " ";

            List<String> matched = new ArrayList<>();
            for (String city : MOROCCAN_CITIES) {
                if (padded.contains(" " + city + " ") && !matched.contains(city)) {
                    matched.add(city);
                }
            }
            if (!matched.isEmpty()) {
                matched.sort(Comparator.comparingInt(c -> upper.indexOf(c)));
                String address = matched.stream()
                        .map(this::normalizeCityName)
                        .collect(Collectors.joining(", "));
                log.info("OCR: city-based address: '{}'", address);
                return address;
            }
        }
        return "";
    }

    private String normalizeCityName(String city) {
        if (CITY_DISPLAY.containsKey(city)) return CITY_DISPLAY.get(city);
        return Arrays.stream(city.split(" "))
                .filter(w -> !w.isEmpty())
                .map(w -> w.charAt(0) + w.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));
    }

    private String extractAddressHeuristic(String[] lines) {
        boolean next = false;
        for (String raw : lines) {
            String line  = raw.trim();
            String upper = line.toUpperCase();
            if (line.isBlank()) continue;
            if (next && line.length() >= 5) return clean(line);
            if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*")) {
                next = true;
            } else if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*.+")) {
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
                .adresse("").dateNaissance("").expiry("")
                .confidence(0.0)
                .build();
    }
}
