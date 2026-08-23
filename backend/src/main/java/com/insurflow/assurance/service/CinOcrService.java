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
 * Tesseract OCR service for Moroccan CIN cards (Recto + Verso).
 *
 * Design constraints:
 *  - No AWT image processing — hard 10-second CLI timeout, always HTTP 200.
 *  - Recto fields take priority for names/CIN; Verso takes priority for address.
 *
 * Moroccan CIN Recto layout (top → bottom):
 *   Header noise (ROYAUME DU MAROC, CARTE NATIONALE…)
 *   Line 1: Prénom  (single word, e.g. ELYASSE)
 *   Line 2: Nom     (multi-word, e.g. EL HATTAB ELIBRAHIMI)
 *   CIN number printed under the photo (e.g. BM44511)
 *
 * Moroccan CIN Verso layout:
 *   Nom العائلة: EL HATTAB ELIBRAHIMI
 *   Prénom الاسم: ELYASSE
 *   N° État Civil: 04022080        ← pure digits — NOT a CIN
 *   Né(e) le: 18.07.2002
 *   à SIDI BELYOUT                 ← birth city — NOT the home address
 *   Adresse / العنوان: RES ZINEB N 18 IMM 02 TIT MELLIL CASA  ← real address
 *   Valable jusqu'au: 04.02.2030
 */
@Service
@Slf4j
public class CinOcrService {

    @Value("${tesseract.datapath:}")
    private String tessDataPath;

    private static final int OCR_TIMEOUT_SECONDS = 10;

    // ── CIN patterns ──────────────────────────────────────────────────────────

    /**
     * Strict CIN: MUST begin with 1-2 uppercase letters, followed immediately by
     * 5-7 digits.  Pure-digit strings like "04022080" are never matched.
     * Applied on the uppercased, noise-stripped text.
     */
    private static final Pattern CIN_STRICT =
            Pattern.compile("(?<![A-Z0-9])([A-Z]{1,2})([0-9]{5,7})(?![0-9A-Z])");

    /**
     * "N° BM44511" — labeled CIN on the Verso, skipping any non-alphanumeric chars
     * between N° and the actual value.
     */
    private static final Pattern CIN_LABELED =
            Pattern.compile("(?i)n[°\\.o]\\s*([A-Z]{1,2}[0-9]{5,7})(?![0-9A-Z])");

    // ── Date patterns ─────────────────────────────────────────────────────────

    /**
     * Lenient date: accepts optional whitespace around the separator so that
     * "18. 07. 2002" or "18 .07.2002" (common OCR artifacts) are also captured.
     * Groups: (1) DD  (2) MM  (3) YYYY.
     */
    private static final Pattern DATE_LENIENT =
            Pattern.compile("\\b(\\d{2})\\s*[.\\-/]\\s*(\\d{2})\\s*[.\\-/]\\s*(\\d{4})\\b");

    /**
     * "Né le" / "Née le" label — birth date follows on the same line.
     * Also accepts OCR noise between "Né" and "le" (Arabic / garbled chars).
     */
    private static final Pattern NEE_LE_PATTERN =
            Pattern.compile(
                "(?i)n[eé]e?\\s+le\\s+([0-9]{2}[\\s.\\-/][0-9]{2}[\\s.\\-/][0-9]{4})");

    /**
     * Arabic birth date label: مزداد بتاريخ / مزدادة بتاريخ — followed by a date.
     */
    private static final Pattern ARABIC_BIRTH_PATTERN =
            Pattern.compile(
                "[\\u0645\\u0632\\u062f][^0-9\\n]{0,20}([0-9]{2}[.\\-/][0-9]{2}[.\\-/][0-9]{4})");

    /** "Valable jusqu'au" — expiry date. */
    private static final Pattern VALABLE_PATTERN =
            Pattern.compile(
                "(?i)valable\\s+(?:jusqu(?:'|\u2019|')au\\s+)?([0-9]{2}[.\\-/][0-9]{2}[.\\-/][0-9]{4})");

    // ── Name label patterns (tolerate Arabic between keyword and Latin value) ──

    /**
     * NOM label — French or bilingual (Nom العائلة: VALUE).
     * {@code [^A-Za-zÀ-ÿ0-9\\n]*} skips Arabic and punctuation between the
     * keyword and the actual Latin name value.
     */
    private static final Pattern NOM_LABEL =
            Pattern.compile(
                "(?i)N[O0]M[^A-Za-zÀ-ÿ0-9\\n]*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /**
     * PRENOM label — French or bilingual (Prénom الاسم: VALUE).
     */
    private static final Pattern PRENOM_LABEL =
            Pattern.compile(
                "(?i)PR[EÉeé][EÉeé]?N[O0o]M[^A-Za-zÀ-ÿ0-9\\n]*([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z\\s\\-']{1,39})(?=\\s*\\n|$)");

    /** ADRESSE label. */
    private static final Pattern ADRESSE_LABEL =
            Pattern.compile(
                "(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)[^A-Za-z0-9\\n]*" +
                "([A-Za-z0-9][A-Za-z0-9\\s,./\\-']{4,79})(?=\\s*\\n|$)");

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
            "DERB SULTAN", "MAARIF", "ANFA",
            // Tit Mellil — suburb south of Casablanca
            "TIT MELLIL", "TITMELLIL"
    );

    private static final Map<String, String> CITY_DISPLAY = Map.ofEntries(
            Map.entry("CASABTANCA",    "Casablanca"),
            Map.entry("SIDIBELYOUT",   "Sidi Belyout"),
            Map.entry("SIDI BEL YOUT","Sidi Belyout"),
            Map.entry("MARRAKESH",     "Marrakech"),
            Map.entry("TANGIER",       "Tanger"),
            Map.entry("FEZ",           "Fès"),
            Map.entry("TITMELLIL",     "Tit Mellil")
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
            "BE", "AE", "DRE", "EEN", "RAS"
    );

    private static final List<String> NOISE_PREFIXES = List.of(
            "ROYAUME", "CARTE", "NATIONAL", "IDENTITY",
            "VALABLE", "EXPIR", "LIEU", "DATE", "SIGN",
            "NOM ", "PRENOM", "NE LE", "NEE", "NÉ"
    );

    // ─────────────────────────────────────────────────────────────────────────
    //  Public entry points
    // ─────────────────────────────────────────────────────────────────────────

    public CinScanResultDto scanCinDocument(MultipartFile file) {
        return scanCinDocuments(file, null);
    }

    /**
     * Scan Recto + optional Verso, then merge:
     * <ul>
     *   <li>CIN, Nom, Prénom, DateNaissance — Recto takes priority (Verso fills gaps)</li>
     *   <li>Adresse — <b>Verso takes priority</b> (Verso has the real home address;
     *       Recto only has birth city)</li>
     * </ul>
     */
    public CinScanResultDto scanCinDocuments(MultipartFile recto, MultipartFile verso) {
        CinScanResultDto r = scanSingle(recto, "RECTO");
        if (verso == null || verso.isEmpty()) return r;

        CinScanResultDto v = scanSingle(verso, "VERSO");
        return merge(r, v);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal: scan one image
    // ─────────────────────────────────────────────────────────────────────────

    private CinScanResultDto scanSingle(MultipartFile file, String label) {
        if (file == null || file.isEmpty()) {
            log.warn("OCR [{}]: null/empty file — skipping.", label);
            return emptyResult();
        }
        log.info("OCR [{}]: '{}' ({} bytes)", label, file.getOriginalFilename(), file.getSize());

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
     * Merge Recto + Verso results.
     *
     * <p>Field priority:
     * <ul>
     *   <li>CIN, Nom, Prénom, DateNaissance → Recto first, Verso fills gaps</li>
     *   <li>Adresse → <b>Verso first</b>, Recto as fallback (Recto contains birth city,
     *       not home address)</li>
     * </ul>
     */
    private CinScanResultDto merge(CinScanResultDto r, CinScanResultDto v) {
        String cin           = first(r.getCin(),           v.getCin());
        String nom           = first(r.getNom(),           v.getNom());
        String prenom        = first(r.getPrenom(),        v.getPrenom());
        String dateNaissance = first(r.getDateNaissance(), v.getDateNaissance());
        String expiry        = first(r.getExpiry(),        v.getExpiry());
        // Verso address takes priority: Verso has residential address;
        // Recto has birth city (à SIDI BELYOUT …) which is NOT the home address.
        String adresse       = first(v.getAdresse(), r.getAdresse());

        double confidence = calculateConfidence(cin, nom, prenom, dateNaissance, adresse);
        log.info("OCR MERGED → CIN:'{}' Prenom:'{}' Nom:'{}' Date:'{}' Exp:'{}' Addr:'{}' Conf:{}",
                cin, prenom, nom, dateNaissance, expiry, adresse, confidence);

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
    //  Tesseract CLI — 10 s timeout, language fallback
    // ─────────────────────────────────────────────────────────────────────────

    private String runTesseract(File imageFile) {
        for (String lang : List.of("fra+eng", "eng", "fra")) {
            String result = execTesseract(imageFile, lang);
            if (!result.isBlank()) {
                log.info("OCR: success lang='{}'", lang);
                return result;
            }
            log.warn("OCR: blank for lang='{}', trying next.", lang);
        }
        log.error("OCR: all language attempts blank.");
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
                log.error("OCR: timeout after {}s lang={}", OCR_TIMEOUT_SECONDS, lang);
                proc.destroyForcibly();
                return "";
            }
            int exit = proc.exitValue();
            if (exit != 0) {
                log.warn("OCR: exit={} lang={} stderr:{}", exit, lang, err.toString().trim());
                return "";
            }
            return out.toString();
        } catch (Throwable t) {
            log.warn("OCR: exec error lang={}: {}", lang, t.getMessage());
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
            log.warn("OCR: blank text — empty result.");
            return emptyResult();
        }

        String text = raw.replace("\r\n", "\n").replace("\r", "\n")
                         .replaceAll("[ \t]+", " ").trim();
        String[] lines = text.split("\n");

        // ── 1. CIN ────────────────────────────────────────────────────────
        String cin = extractCin(text, lines);

        // ── 2. Dates ──────────────────────────────────────────────────────
        String dateNaissance = extractBirthDate(text);
        String expiry        = extractExpiry(text);

        // Fall back: if only one date found, classify by year
        if (dateNaissance.isEmpty() && expiry.isEmpty()) {
            List<String> allDates = extractAllDates(text);
            allDates.sort(Comparator.comparing(d -> yearOf(d)));
            if (allDates.size() >= 2) {
                dateNaissance = allDates.get(0);                       // earlier = birth
                expiry        = allDates.get(allDates.size() - 1);    // later   = expiry
            } else if (allDates.size() == 1) {
                int y = yearOf(allDates.get(0));
                if (y <= 2015) dateNaissance = allDates.get(0);
                else           expiry        = allDates.get(0);
            }
        }

        // ── 3. Nom / Prénom ───────────────────────────────────────────────
        //
        // Tier 1: explicit label regex (handles bilingual Verso labels like
        //         "Nom العائلة: EL HATTAB ELIBRAHIMI")
        String nom    = extractByLabel(text, NOM_LABEL);
        String prenom = extractByLabel(text, PRENOM_LABEL);

        // Tier 2: line keyword scan
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomFromLines(lines, nom, prenom);
            if (nom.isEmpty())    nom    = r[0];
            if (prenom.isEmpty()) prenom = r[1];
        }

        // Tier 3: caps-line scan — PRIMARY for bare Recto (no labels).
        // Runs whenever at least one of nom/prenom is still missing, so that
        // a Tier-2 nom does NOT block prenom extraction.
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomCapsOrder(lines);
            if (prenom.isEmpty() && !r[0].isEmpty()) prenom = r[0];
            if (nom.isEmpty()    && !r[1].isEmpty()) nom    = r[1];
        }

        // Tier 4: broad heuristic (last resort)
        if (nom.isEmpty() || prenom.isEmpty()) {
            String[] r = extractNomPrenomHeuristic(lines);
            if (prenom.isEmpty() && !r[0].isEmpty()) prenom = r[0];
            if (nom.isEmpty()    && !r[1].isEmpty()) nom    = r[1];
        }

        // ── 4. Address ────────────────────────────────────────────────────
        // extractVersoAddress is tried first — it specifically handles the
        // bilingual "Adresse / العنوان: RES ZINEB…" Verso format.
        String adresse = extractVersoAddress(lines);
        if (adresse.isEmpty()) adresse = extractByLabel(text, ADRESSE_LABEL);
        if (adresse.isEmpty()) adresse = extractAddressByCity(lines);
        if (adresse.isEmpty()) adresse = extractAddressHeuristic(lines);

        // ── Sanitize ──────────────────────────────────────────────────────
        nom    = sanitizeName(nom);
        prenom = sanitizeName(prenom);
        cin    = cin.replaceAll("\\s+", "").toUpperCase();

        double confidence = calculateConfidence(cin, nom, prenom, dateNaissance, adresse);

        log.info("OCR RESULT → CIN:'{}' Prenom:'{}' Nom:'{}' Date:'{}' Exp:'{}' Addr:'{}' Conf:{}",
                cin, prenom, nom, dateNaissance, expiry, adresse, confidence);

        return CinScanResultDto.builder()
                .cin(cin).nom(nom).prenom(prenom)
                .adresse(adresse).dateNaissance(dateNaissance)
                .expiry(expiry).confidence(confidence)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CIN extraction — strict: must start with 1-2 letters
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Three-pass CIN search.  Only strings that ACTUALLY begin with 1-2 uppercase
     * letters are matched — pure-digit État Civil numbers like "04022080" are
     * never accepted.
     */
    private String extractCin(String fullText, String[] lines) {
        // Pass 0: labeled "N° BM44511" (Verso)
        Matcher lm = CIN_LABELED.matcher(fullText.toUpperCase());
        while (lm.find()) {
            String c = lm.group(1).replaceAll("\\s+", "");
            if (isValidCin(c)) return c;
        }

        // Pass 1: raw full text
        String found = findCin(fullText);
        if (!found.isEmpty()) return found;

        // Pass 2: per-line, strip all non-alphanumeric so "BM.44511" → "BM44511"
        for (String raw : lines) {
            String stripped = raw.replaceAll("[^A-Za-z0-9]", "");
            found = findCin(stripped);
            if (!found.isEmpty()) return found;
        }

        // Pass 3: fix l/I→I prefix only when preceded by a letter (not start-of-string)
        // DO NOT do "0→O" at start of string to avoid false-positives like 04022080→O4022080
        String corrected = fullText
                .replaceAll("(?<=[A-Z])0(?=[A-Z0-9]{4,7}(?![0-9A-Z]))", "O")
                .replaceAll("(?i)(?<=[A-Z])[lI]([0-9]{5,7})(?![0-9A-Z])", "I$1");
        return findCin(corrected);
    }

    private String findCin(String text) {
        Matcher m = CIN_STRICT.matcher(text.toUpperCase());
        while (m.find()) {
            String candidate = m.group(1) + m.group(2);
            if (isValidCin(candidate)) return candidate;
        }
        return "";
    }

    private boolean isValidCin(String s) {
        // 1-2 letters then 5-7 digits
        return s != null && s.matches("[A-Z]{1,2}[0-9]{5,7}");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Date extraction
    // ─────────────────────────────────────────────────────────────────────────

    private String extractBirthDate(String text) {
        // "Né le" / "Née le"
        Matcher m = NEE_LE_PATTERN.matcher(text);
        if (m.find()) return normalizeDate(m.group(1));

        // Arabic birth label (مزداد بتاريخ)
        Matcher am = ARABIC_BIRTH_PATTERN.matcher(text);
        if (am.find()) return normalizeDate(am.group(1));

        return "";
    }

    private String extractExpiry(String text) {
        Matcher m = VALABLE_PATTERN.matcher(text);
        return m.find() ? normalizeDate(m.group(1)) : "";
    }

    /**
     * Extracts ALL dates from the text using the lenient pattern, returning
     * them in "DD.MM.YYYY" normalized form.
     */
    private List<String> extractAllDates(String text) {
        List<String> dates = new ArrayList<>();
        Matcher m = DATE_LENIENT.matcher(text);
        while (m.find()) {
            String d = m.group(1) + "." + m.group(2) + "." + m.group(3);
            if (!dates.contains(d)) dates.add(d);
        }
        return dates;
    }

    /** Normalises a raw date string to "DD.MM.YYYY", collapsing OCR spaces. */
    private String normalizeDate(String raw) {
        if (raw == null) return "";
        // Collapse spaces inside the date then re-parse
        Matcher m = DATE_LENIENT.matcher(raw.trim());
        if (m.find()) return m.group(1) + "." + m.group(2) + "." + m.group(3);
        return clean(raw);
    }

    private int yearOf(String date) {
        try { return Integer.parseInt(date.substring(6)); } catch (Exception e) { return 0; }
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
    //  Patterns accept Arabic between keyword and value: "NOM[^Latin]*LATINVALUE"
    // ─────────────────────────────────────────────────────────────────────────

    private String[] extractNomPrenomFromLines(String[] lines,
                                               String existingNom,
                                               String existingPrenom) {
        String nom    = existingNom;
        String prenom = existingPrenom;

        // [^A-Za-zÀ-ÿ0-9\n]* skips Arabic / punctuation between keyword and value
        Pattern nomKey    = Pattern.compile(
                "(?i)^N[O0]M[^A-Za-zÀ-ÿ0-9\\n]*([A-Za-zÀ-ÿ].*)$");
        Pattern prenomKey = Pattern.compile(
                "(?i)^PR[EÉeé][EÉeé]?N[O0o]M[^A-Za-zÀ-ÿ0-9\\n]*([A-Za-zÀ-ÿ].*)$");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;

            if (nom.isEmpty()) {
                Matcher m = nomKey.matcher(line);
                if (m.matches()) {
                    // Strip any trailing Arabic / non-Latin from the captured value
                    String inline = stripArabic(m.group(1)).trim();
                    nom = inline.length() >= 2 ? clean(inline) : peekNext(lines, i);
                }
            }
            if (prenom.isEmpty()) {
                Matcher m = prenomKey.matcher(line);
                if (m.matches()) {
                    String inline = stripArabic(m.group(1)).trim();
                    prenom = inline.length() >= 2 ? clean(inline) : peekNext(lines, i);
                }
            }
            if (!nom.isEmpty() && !prenom.isEmpty()) break;
        }
        return new String[]{nom, prenom};
    }

    private String peekNext(String[] lines, int i) {
        for (int j = i + 1; j < lines.length; j++) {
            String next = stripArabic(lines[j].trim()).trim();
            if (!next.isBlank() && next.length() >= 2) return clean(next);
        }
        return "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Tier 3: caps-line scan — PRIMARY for bare Recto (no bilingual labels)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Collects the first two leading-caps-word candidate lines and assigns them
     * in Moroccan CIN order:
     * <ul>
     *   <li>Candidate 0 (first caps line) → <b>Prénom</b> (e.g. ELYASSE)</li>
     *   <li>Candidate 1 (second caps line) → <b>Nom</b>   (e.g. EL HATTAB ELIBRAHIMI)</li>
     * </ul>
     *
     * <p>Smart swap: if candidate 0 starts with a particle (EL, BEN…) and has ≥ 2
     * words while candidate 1 is a single word, they are swapped.
     *
     * <p>OCR corrections applied:
     * <ul>
     *   <li>Trailing 'L' → 'I' on the last word (EEIBRAHIML → EEIBRAHIMI)</li>
     *   <li>Leading "EE" → "EL" when the word has ≥ 4 chars and EE is followed
     *       by a consonant (EEIBRAHIMI → ELIBRAHIMI)</li>
     * </ul>
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
            if (words.length == 1) return new String[]{fixNameOcr(only), ""};  // single word = prénom
            if (NAME_PARTICLES.contains(words[0]) && words.length >= 2)
                return new String[]{"", fixNameOcr(only)};                     // particle prefix = nom
            return new String[]{
                    fixNameOcr(words[0]),
                    fixNameOcr(String.join(" ", Arrays.copyOfRange(words, 1, words.length)))
            };
        }

        // Two candidates: first = prénom, second = nom (standard Recto layout)
        String prenomRaw = candidates.get(0);
        String nomRaw    = candidates.get(1);

        // Swap if first candidate looks like a family name (starts with particle + multi-word)
        // and second is a single word
        if (NAME_PARTICLES.contains(prenomRaw.split(" ")[0])
                && prenomRaw.split(" ").length >= 2
                && nomRaw.split(" ").length == 1) {
            String tmp = prenomRaw;
            prenomRaw  = nomRaw;
            nomRaw     = tmp;
        }

        return new String[]{fixNameOcr(prenomRaw), fixNameOcr(nomRaw)};
    }

    /**
     * Returns the leading run of ALL-UPPERCASE alphabetic tokens from a line.
     * Stops at the first token that is not all-uppercase or shorter than 2 chars.
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
     * Applies two OCR corrections to a name string:
     * <ol>
     *   <li><b>Trailing 'L' → 'I'</b> on the last word of the value.
     *       Example: {@code EEIBRAHIML → EEIBRAHIMI}</li>
     *   <li><b>Leading "EE" → "EL"</b> when the first word starts with "EE"
     *       followed by a consonant (not A/E/I/O/U) and the word has ≥ 4 chars.
     *       Example: {@code EEIBRAHIMI → ELIBRAHIMI}</li>
     * </ol>
     */
    private String fixNameOcr(String value) {
        if (value == null || value.isBlank()) return value == null ? "" : value;

        // Step 1: trailing L → I on the last word
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
        value = prefix + lastWord;

        // Step 2: EE → EL at the start of the first word (when followed by consonant)
        // Matches Moroccan OCR artifact where 'L' in 'EL' is misread as 'E'
        String[] words = value.split(" ");
        if (words[0].length() >= 4 && words[0].startsWith("EE")) {
            char third = words[0].charAt(2);
            // Only correct if third char is a consonant (not A,E,I,O,U)
            if ("BCDFGHJKLMNPQRSTVWXYZ".indexOf(third) >= 0) {
                words[0] = "EL" + words[0].substring(2);
                value = String.join(" ", words);
            }
        }

        return value;
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
        return new String[]{
                candidates.size() > 0 ? fixNameOcr(candidates.get(0)) : "",
                candidates.size() > 1 ? fixNameOcr(candidates.get(1)) : ""
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Address extraction
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Dedicated Verso address extractor.  Handles the bilingual label format:
     * {@code Adresse / العنوان: RES ZINEB N 18 IMM 02 TIT MELLIL CASA}
     *
     * <p>Strategy:
     * <ol>
     *   <li>Find any line that starts with "Adresse" (case-insensitive).</li>
     *   <li>Strip the label and any Arabic text; keep only the Latin portion.</li>
     *   <li>If no Latin address found on the same line, look at the next 1-2 lines.</li>
     * </ol>
     */
    private String extractVersoAddress(String[] lines) {
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!line.toUpperCase().startsWith("ADRESSE") &&
                !line.toUpperCase().startsWith("ADR")) continue;

            // Remove the keyword + anything non-Latin-alphanumeric after it
            String afterLabel = line.replaceFirst(
                    "(?i)^(?:adresse|r[eé]sidence|demeure|adr)[^A-Za-z0-9]*", "").trim();
            // Strip Arabic and other non-Latin characters
            String latin = stripArabic(afterLabel).trim();

            if (latin.length() >= 5 && latin.matches(".*[A-Za-z].*")) {
                log.info("OCR: Verso address (same line): '{}'", latin);
                return clean(latin);
            }

            // Address might be on the next line(s) after the label
            for (int j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                String next = stripArabic(lines[j].trim()).trim();
                if (next.length() >= 5 && next.matches(".*[A-Za-z0-9].*")) {
                    log.info("OCR: Verso address (next line): '{}'", next);
                    return clean(next);
                }
            }
        }
        return "";
    }

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
        boolean nextIsAddr = false;
        for (String raw : lines) {
            String line  = raw.trim();
            String upper = line.toUpperCase();
            if (line.isBlank()) continue;
            if (nextIsAddr && line.length() >= 5) return clean(stripArabic(line));
            if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*"))
                nextIsAddr = true;
            else if (upper.matches("(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*.+"))
                return clean(stripArabic(line)
                        .replaceFirst("(?i)(?:ADRESSE|R[EÉ]SIDENCE|DEMEURE|ADR)\\s*[:\\-.]{0,2}\\s*", ""));
        }
        return "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Strips Arabic-block characters (U+0600–U+06FF) and any surrounding
     * non-ASCII punctuation from a string, collapsing resulting whitespace.
     */
    private String stripArabic(String s) {
        if (s == null) return "";
        return s.replaceAll("[\\u0600-\\u06FF\\u0750-\\u077F]+", " ")
                .replaceAll("[^\\x20-\\x7E\\xC0-\\xFF]", " ")
                .replaceAll("\\s+", " ").trim();
    }

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
        String s = clean(stripArabic(val));
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

        if (hasNom && hasPrenom && hasDtAdr && hasCin) return 0.99;
        if (hasNom && hasPrenom && hasDtAdr)            return 0.95;
        if (hasNom && hasPrenom && hasCin)              return 0.90;
        if (hasNom && hasPrenom)                        return 0.80;
        if (hasCin && (hasNom || hasPrenom))            return 0.65;
        if (hasNom || hasPrenom || hasCin)              return 0.45;
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
