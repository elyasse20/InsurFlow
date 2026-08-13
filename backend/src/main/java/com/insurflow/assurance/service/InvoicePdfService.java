package com.insurflow.assurance.service;

import com.insurflow.assurance.model.Invoice;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class InvoicePdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Dynamically generates a PDF document byte array for a given Invoice using OpenPDF.
     */
    public byte[] generateInvoicePdf(Invoice invoice) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(15, 23, 42));
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(37, 99, 235));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(15, 23, 42));
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(51, 65, 85));
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(100, 116, 139));

            // 1. Header Table (Agency Branding + Document Title)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            // Agency Info
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.addElement(new Paragraph("INSURFLOW ASSURANCES", titleFont));
            leftCell.addElement(new Paragraph("Courtage & Gestion des Assurances", subtitleFont));
            leftCell.addElement(new Paragraph("125 Boulevard Zerktouni, Casablanca, Maroc", regularFont));
            leftCell.addElement(new Paragraph("Tél: +212 522-345678 | Email: contact@insurflow.com", regularFont));
            headerTable.addCell(leftCell);

            // Document Details
            String docTitle = switch (invoice.getType()) {
                case PROFORMA -> "DEVIS PROFORMA";
                case AVOIR -> "FACTURE D'AVOIR";
                default -> "FACTURE D'ASSURANCE";
            };

            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(new Paragraph(docTitle, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(225, 29, 72))));
            rightCell.addElement(new Paragraph("N°: " + invoice.getInvoiceNumber(), boldFont));
            rightCell.addElement(new Paragraph("Date: " + (invoice.getCreatedAt() != null ? invoice.getCreatedAt().format(DATE_FORMATTER) : "N/A"), regularFont));
            if (invoice.getDueDate() != null) {
                rightCell.addElement(new Paragraph("Échéance: " + invoice.getDueDate().format(DATE_FORMATTER), regularFont));
            }
            rightCell.addElement(new Paragraph("Statut: " + invoice.getStatus().name(), boldFont));
            headerTable.addCell(rightCell);

            document.add(headerTable);
            document.add(new Paragraph(" ")); // Spacer

            // Divider Line
            PdfPTable line = new PdfPTable(1);
            line.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell();
            lineCell.setFixedHeight(2);
            lineCell.setBackgroundColor(new Color(37, 99, 235));
            lineCell.setBorder(Rectangle.NO_BORDER);
            line.addCell(lineCell);
            document.add(line);
            document.add(new Paragraph(" "));

            // 2. Client & Policy Information Section
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50, 50});

            // Client Info Box
            PdfPCell clientCell = new PdfPCell();
            clientCell.setPadding(10);
            clientCell.setBackgroundColor(new Color(248, 250, 252));
            clientCell.setBorderColor(new Color(226, 232, 240));
            clientCell.addElement(new Paragraph("DESTINATAIRE (CLIENT)", subtitleFont));
            clientCell.addElement(new Paragraph("Nom / Raison Sociale : " + invoice.getClientName(), boldFont));
            clientCell.addElement(new Paragraph("Police N° : " + (invoice.getPolicyNumber() != null ? invoice.getPolicyNumber() : "N/A"), regularFont));
            infoTable.addCell(clientCell);

            // Insurance Policy Details Box
            PdfPCell policyCell = new PdfPCell();
            policyCell.setPadding(10);
            policyCell.setBackgroundColor(new Color(248, 250, 252));
            policyCell.setBorderColor(new Color(226, 232, 240));
            policyCell.addElement(new Paragraph("DÉTAILS CONTRAT", subtitleFont));
            policyCell.addElement(new Paragraph("Compagnie : " + (invoice.getCompagne() != null ? invoice.getCompagne() : "N/A"), boldFont));
            policyCell.addElement(new Paragraph("Branche : " + (invoice.getCategory() != null ? invoice.getCategory() : "N/A"), regularFont));
            infoTable.addCell(policyCell);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // 3. Itemized Financial Table
            PdfPTable itemTable = new PdfPTable(5);
            itemTable.setWidthPercentage(100);
            itemTable.setWidths(new float[]{40, 15, 15, 15, 15});

            // Headers
            String[] headers = {"Désignation", "Montant HT", "Taux TVA", "TVA (DH)", "Total TTC"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(37, 99, 235));
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemTable.addCell(cell);
            }

            // Line Item
            PdfPCell descCell = new PdfPCell(new Phrase("Prime d'Assurance - " + (invoice.getCategory() != null ? invoice.getCategory() : "Général"), regularFont));
            descCell.setPadding(6);
            itemTable.addCell(descCell);

            PdfPCell htCell = new PdfPCell(new Phrase(String.format("%.2f DH", invoice.getAmountHT()), regularFont));
            htCell.setPadding(6);
            htCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            itemTable.addCell(htCell);

            PdfPCell rateCell = new PdfPCell(new Phrase(String.format("%.1f %%", invoice.getTvaRate()), regularFont));
            rateCell.setPadding(6);
            rateCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            itemTable.addCell(rateCell);

            PdfPCell tvaCell = new PdfPCell(new Phrase(String.format("%.2f DH", invoice.getTvaAmount()), regularFont));
            tvaCell.setPadding(6);
            tvaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            itemTable.addCell(tvaCell);

            PdfPCell ttcCell = new PdfPCell(new Phrase(String.format("%.2f DH", invoice.getAmountTTC()), boldFont));
            ttcCell.setPadding(6);
            ttcCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            itemTable.addCell(ttcCell);

            document.add(itemTable);
            document.add(new Paragraph(" "));

            // 4. Summary Totals Box
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(40);
            summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.setWidths(new float[]{50, 50});

            addSummaryRow(summaryTable, "Total HT :", String.format("%.2f DH", invoice.getAmountHT()), regularFont);
            addSummaryRow(summaryTable, "TVA :", String.format("%.2f DH", invoice.getTvaAmount()), regularFont);
            addSummaryRow(summaryTable, "Total TTC :", String.format("%.2f DH", invoice.getAmountTTC()), boldFont);
            addSummaryRow(summaryTable, "Montant Réglé :", String.format("%.2f DH", invoice.getPaidAmount()), regularFont);
            addSummaryRow(summaryTable, "Solde Restant :", String.format("%.2f DH", invoice.getRemainingAmount()), boldFont);

            document.add(summaryTable);
            document.add(new Paragraph(" "));

            // 5. Footer & Legal Mentions
            Paragraph legal = new Paragraph("Arrêté la présente facture à la somme de " + String.format("%.2f DH", invoice.getAmountTTC()) + " TTC.", boldFont);
            document.add(legal);

            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph("InsurFlow Assurances SARL — ICE: 001847593000045 | IF: 40283921 | RC: 128475 Casablanca\nMerci de votre confiance !", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            log.info("✓ Generated PDF invoice for {}", invoice.getInvoiceNumber());
        } catch (Exception e) {
            log.error("Error generating PDF invoice for {}: ", invoice.getInvoiceNumber(), e);
        }

        return out.toByteArray();
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setPadding(4);
        labelCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, font));
        valueCell.setPadding(4);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        valueCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(valueCell);
    }
}
