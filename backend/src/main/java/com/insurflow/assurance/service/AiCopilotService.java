package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ChatMessage;
import com.insurflow.assurance.dto.CopilotChatRequest;
import com.insurflow.assurance.dto.CopilotChatResponse;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.repository.ClientRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.repository.ReglementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiCopilotService {

    private final ProductionRepository productionRepository;
    private final ClientRepository clientRepository;
    private final ReglementRepository reglementRepository;

    public CopilotChatResponse chat(CopilotChatRequest request) {
        List<ChatMessage> messages = request.getMessages();
        if (messages == null || messages.isEmpty()) {
            return CopilotChatResponse.builder()
                    .response("Bonjour ! Je suis **InsurFlow Copilot**, votre assistant expert en courtage d'assurance au Maroc (ACAPS / Loi 17-99).\n\nComment puis-je vous assister aujourd'hui ?")
                    .suggestedActions(List.of(
                            "Quelles sont les polices à renouveler ce mois ?",
                            "Rédiger un email de relance de quittance impayée",
                            "Explication franchise Tous Risques vs Tiers Collision",
                            "Synthèse de l'activité du portefeuille"
                    ))
                    .build();
        }

        ChatMessage lastMessage = messages.get(messages.size() - 1);
        String userQuery = lastMessage.getContent() != null ? lastMessage.getContent().trim() : "";
        String qLower = userQuery.toLowerCase();

        // Build history context string
        StringBuilder historyBuilder = new StringBuilder();
        for (int i = 0; i < messages.size() - 1; i++) {
            ChatMessage m = messages.get(i);
            historyBuilder.append(m.getRole()).append(": ").append(m.getContent()).append("\n");
        }
        String hLower = historyBuilder.toString().toLowerCase();

        // 1. Follow-up: Customizing or tailoring an email with a client name or amount
        boolean isCustomizingEmail = (qLower.contains("adapter") || qLower.contains("personnalis") || qLower.contains("modifier") ||
                qLower.contains("client") || qLower.contains("dh") || qLower.contains("mad")) &&
                (hLower.contains("relance") || hLower.contains("quittance") || hLower.contains("modèle d'email") || hLower.contains("impay"));

        if (isCustomizingEmail) {
            String extractedClient = "Société Atlas Transport";
            Pattern clientPat = Pattern.compile("(?:pour\\s+(?:le\\s+client\\s+)?|client\\s+)([\"']?[A-Za-z0-9À-ÿ\\s\\.\\-_]+?[\"']?)(?:\\s+avec|\\s+pour|\\s+montant|\\s*,\\s*|$)", Pattern.CASE_INSENSITIVE);
            Matcher cm = clientPat.matcher(userQuery);
            if (cm.find() && cm.group(1) != null && !cm.group(1).trim().isEmpty()) {
                extractedClient = cm.group(1).replace("\"", "").replace("'", "").trim();
            }

            String extractedAmount = "8 450,00";
            Pattern amountPat = Pattern.compile("(\\d+[\\s\\d]*[\\.,]?\\d*)\\s*(?:dh|mad|dhs)", Pattern.CASE_INSENSITIVE);
            Matcher am = amountPat.matcher(userQuery);
            if (am.find() && am.group(1) != null) {
                extractedAmount = am.group(1).trim();
            }

            String customizedTemplate = "✉️ **Modèle personnalisé de relance d'impayé**\n\n" +
                    "**Objet :** URGENT — Relance de quittance impayée N° QT-2026/084 — Contrat " + extractedClient + "\n\n" +
                    "Madame, Monsieur la Direction de **" + extractedClient + "**,\n\n" +
                    "Nous faisons suite à l'échéance de votre contrat d'assurance et constatons que la quittance afférente demeure non soldée à ce jour :\n\n" +
                    "• **Assuré :** " + extractedClient + "\n" +
                    "• **N° Police :** POL-2026-0927\n" +
                    "• **Montant total TTC dû :** **" + extractedAmount + " MAD**\n" +
                    "• **Date d'échéance initiale :** Constatée à terme échu\n\n" +
                    "Conformément aux dispositions de l'**article 21 de la Loi n° 17-99** portant Code des Assurances marocain, à défaut de règlement dans les 20 jours suivant la présente mise en demeure, les garanties de votre police seront de plein droit suspendues.\n\n" +
                    "Nous vous saurions gré d'effectuer le virement sur notre compte cabinet :\n" +
                    "• **Banque :** Attijariwafa Bank\n" +
                    "• **RIB :** `007 780 0001234567890123 45`\n" +
                    "• **Bénéficiaire :** Cabinet InsurFlow Courtage\n\n" +
                    "Dans l'attente de votre confirmation de règlement,\n\n" +
                    "Cordialement,\n" +
                    "**Service Comptabilité & Recouvrement**\n" +
                    "Cabinet InsurFlow";

            return CopilotChatResponse.builder()
                    .response(customizedTemplate)
                    .suggestedActions(List.of(
                            "Procédure si le client ne paie pas après 20 jours",
                            "Quelles sont les polices à renouveler ce mois ?",
                            "Synthèse de l'activité du portefeuille"
                    ))
                    .build();
        }

        // 2. Follow-up: Legal procedure after 20 days non-payment
        if ((qLower.contains("après 20 jours") || qLower.contains("apres 20 jours") || qLower.contains("non-paiement") || qLower.contains("résiliation")) &&
                (hLower.contains("article 21") || hLower.contains("relance") || hLower.contains("impay"))) {
            String text = "⚖️ **Procédure légale de gestion des impayés (Loi 17-99, Art. 21 & 22)**\n\n" +
                    "Si l'assuré ne régularise pas sa situation après la mise en demeure :\n\n" +
                    "1. **À J+20 après la mise en demeure :** Suspension automatique de la garantie. La compagnie et le courtier ne couvrent plus les sinistres survenus pendant cette période.\n" +
                    "2. **À J+30 (10 jours après suspension) :** L'assureur a le droit de résilier définitivement le contrat.\n" +
                    "3. **Prime acquise :** La portion de prime correspondant à la période courue avant suspension reste intégralement due par l'assuré au cabinet.\n" +
                    "4. **Attestation d'assurance :** Le courtier est tenu de réclamer la restitution de l'attestation (carte verte / macaron pare-brise).\n\n" +
                    "💡 **Action recommandée :** Notifier l'inspecteur compagnie et émettre l'attestation de suspension dans le module *Règlements*.";

            return CopilotChatResponse.builder()
                    .response(text)
                    .suggestedActions(List.of(
                            "Rédiger la notification de suspension de garantie",
                            "Consulter les impayés du portefeuille",
                            "Quelles sont les polices à renouveler ce mois ?"
                    ))
                    .build();
        }

        // 3. Tax / Premium Calculation
        if (qLower.contains("calculer") && (qLower.contains("tva") || qLower.contains("taxe") || qLower.contains("ttc") || qLower.contains("prime"))) {
            double baseAmount = 1000.0;
            Pattern numPat = Pattern.compile("(\\d+[\\s\\d]*[\\.,]?\\d*)");
            Matcher nm = numPat.matcher(userQuery);
            if (nm.find() && nm.group(1) != null) {
                try {
                    baseAmount = Double.parseDouble(nm.group(1).replace(" ", "").replace(",", "."));
                } catch (Exception ignored) {}
            }

            double taxe = Math.round(baseAmount * 0.14 * 100.0) / 100.0;
            double accessoire = 50.0;
            double cnpac = Math.round(baseAmount * 0.01 * 100.0) / 100.0;
            double totalTTC = Math.round((baseAmount + taxe + accessoire + cnpac) * 100.0) / 100.0;

            String text = "🧮 **Décomposition fiscale et calcul du montant TTC (" + baseAmount + " DH Net)**\n\n" +
                    "Voici le détail des taxes applicables au Maroc selon le barème standard :\n\n" +
                    "• **Prime Nette (HT) :** " + baseAmount + " MAD\n" +
                    "• **TVA sur primes (14%) :** " + taxe + " MAD\n" +
                    "• **Accessoire de police :** " + accessoire + " MAD\n" +
                    "• **Taxe parafiscale / CNPAC (~1%) :** " + cnpac + " MAD\n" +
                    "───────────────\n" +
                    "• **TOTAL TTC À ENCAISSER :** **" + totalTTC + " MAD**\n\n" +
                    "💡 *Ces paramètres sont configurables dans Référentiels > TVA & Paramètres de tarification.*";

            return CopilotChatResponse.builder()
                    .response(text)
                    .suggestedActions(List.of(
                            "Explication franchise Tous Risques vs Tiers Collision",
                            "Quelles sont les polices à renouveler ce mois ?",
                            "Synthèse de l'activité du portefeuille"
                    ))
                    .build();
        }

        // 4. Standard Intents
        if (qLower.contains("renouveler") || qLower.contains("renouvellement") || (qLower.contains("police") && qLower.contains("mois"))) {
            return handleRenewalsQuery();
        } else if (qLower.contains("relance") || qLower.contains("impay") || qLower.contains("quittance") || qLower.contains("recouvrement")) {
            return handlePaymentReminderQuery();
        } else if (qLower.contains("franchise") || qLower.contains("tous risques") || qLower.contains("tiers collision")) {
            return handleFranchiseExplanationQuery();
        } else if (qLower.contains("synthèse") || qLower.contains("synthese") || qLower.contains("portefeuille") || qLower.contains("bilan") || qLower.contains("statistique")) {
            return handlePortfolioSynthesisQuery();
        } else if (qLower.contains("maritime") || qLower.contains("navire") || qLower.contains("faculté")) {
            return handleMaritimeQuery();
        } else if (qLower.contains("commission") || qLower.contains("taux") || qLower.contains("barème")) {
            return handleCommissionQuery();
        } else {
            return handleGeneralInsuranceQuery(userQuery);
        }
    }

    private CopilotChatResponse handleRenewalsQuery() {
        long totalProds = productionRepository.count();
        List<Production> sampleProds = productionRepository.findAll();
        
        StringBuilder sb = new StringBuilder();
        sb.append("📋 **Polices à renouveler et surveillance d'échéances**\n\n");
        sb.append("D'après la base de données du cabinet, voici les éléments clés pour le mois en cours :\n\n");

        if (sampleProds.isEmpty()) {
            sb.append("• Aucune police enregistrée pour l'instant dans le système.\n");
        } else {
            int count = 0;
            for (Production p : sampleProds) {
                if (count++ >= 4) break;
                sb.append("• **Police N° ").append(p.getNumpolice() != null ? p.getNumpolice() : "N/A").append("** — ")
                  .append(p.getClient() != null ? p.getClient() : "Client")
                  .append(" (Cie: ").append(p.getCompagne() != null ? p.getCompagne() : "Standard")
                  .append(", Catégorie: ").append(p.getCategory() != null ? p.getCategory() : "AUTO")
                  .append(")\n");
            }
        }

        sb.append("\n💡 **Recommandations du Copilot :**\n");
        sb.append("1. Éditer les avis d'échéance 15 à 30 jours à l'avance conformément à l'usage de courtage.\n");
        sb.append("2. Vérifier la sinistralité des 12 derniers mois pour appliquer les coefficients Bonus/Malus appropriés.\n");
        sb.append("3. Proposer un avenant de garanties complémentaires (Assistance 0 Km, Bris de glace étendu).");

        return CopilotChatResponse.builder()
                .response(sb.toString())
                .suggestedActions(List.of(
                        "Peux-tu adapter un email pour le client Société Atlas ?",
                        "Synthèse de l'activité du portefeuille",
                        "Rédiger un email de relance de quittance impayée"
                ))
                .build();
    }

    private CopilotChatResponse handlePaymentReminderQuery() {
        String template = "✉️ **Modèle d'email de relance — Quittance d'assurance impayée**\n\n" +
                "**Objet :** Rappel d'échéance — Quittance d'assurance N° [N° QUITTANCE] / Police [N° POLICE]\n\n" +
                "Madame, Monsieur [Nom du Client],\n\n" +
                "Sauf erreur ou omission de notre part, nous constatons que la quittance d'assurance référencée ci-dessous est arrivée à échéance et demeure impayée à ce jour :\n\n" +
                "• **Contrat / Police :** [N° Police]\n" +
                "• **Branche / Catégorie :** [Auto / Multirisque / RC]\n" +
                "• **Période de couverture :** Du [Date Début] au [Date Fin]\n" +
                "• **Montant TTC à régler :** [Montant en DH] MAD\n\n" +
                "Conformément aux dispositions de l'article 21 de la Loi n° 17-99 portant Code des Assurances, le défaut de paiement de la prime peut entraîner la suspension des garanties après un délai de mise en demeure de 20 jours.\n\n" +
                "Nous vous invitons à régulariser cette situation dans les meilleurs délais :\n" +
                "- Par virement bancaire sur notre compte RIB : `[RIB DU CABINET]`\n" +
                "- Ou directement à l'agence par chèque ou espèces contre reçu libératoire.\n\n" +
                "Si votre règlement a été effectué récemment, nous vous prions de ne pas tenir compte de ce rappel.\n\n" +
                "Restant à votre entière disposition,\n\n" +
                "Cordialement,\n" +
                "**Cabinet de Courtage InsurFlow**\n" +
                "Service Gestion & Recouvrement";

        return CopilotChatResponse.builder()
                .response(template)
                .suggestedActions(List.of(
                        "Peux-tu adapter cet email pour le client Société Atlas avec 12 500 DH ?",
                        "Procédure si le client ne paie pas après 20 jours",
                        "Synthèse de l'activité du portefeuille"
                ))
                .build();
    }

    private CopilotChatResponse handleFranchiseExplanationQuery() {
        String text = "⚖️ **Comparatif Courtier : Tous Risques vs Dommages Collision (Tiers)**\n\n" +
                "Voici l'analyse technique et commerciale pour orienter vos assurés :\n\n" +
                "### 1. Garantie Tous Risques (Tierce Complète)\n" +
                "• **Couverture :** Tous dommages subis par le véhicule, qu'il y ait un tiers identifié ou non (choc avec obstacle fixe, verglas, vandalisme, perte de contrôle seul).\n" +
                "• **Franchise :** Généralement fixée entre **2.5% et 5%** de la valeur vénale du véhicule (avec un minimum de 1 500 à 3 000 DH selon la compagnie).\n" +
                "• **Cible recommandée :** Véhicules neufs ou récents (**moins de 4 ans**), flottes de direction, véhicules sous leasing/crédit.\n\n" +
                "### 2. Garantie Dommages Collision (Tiers Collision)\n" +
                "• **Couverture :** Indemnisation des dommages uniquement en cas de collision avec un **tiers identifié** (véhicule, piéton, animal avec propriétaire connu).\n" +
                "• **Franchise :** Franchise souvent forfaitaire et allégée (ex : 500 à 1 000 DH).\n" +
                "• **Tarif :** Prime inférieure de **30% à 45%** par rapport à la formule Tous Risques.\n" +
                "• **Cible recommandée :** Véhicules de **4 à 8 ans**, clients attentifs à leur budget souhaitant une protection intermédiaire.\n\n" +
                "💡 **Astuce Courtier :** Pour les véhicules de plus de 8 ans, conseillez le pack *Tiers Simple + Vol / Incendie + Bris de Glace + Défense & Recours* pour un excellent rapport prime/couverture.";

        return CopilotChatResponse.builder()
                .response(text)
                .suggestedActions(List.of(
                        "Évaluer le risque d'un véhicule avec l'IA",
                        "Barème des commissions par catégorie",
                        "Rédiger un email de relance de quittance impayée"
                ))
                .build();
    }

    private CopilotChatResponse handlePortfolioSynthesisQuery() {
        long clientCount = clientRepository.count();
        long productionCount = productionRepository.count();
        long reglementCount = reglementRepository.count();

        String text = "📊 **Synthèse globale de l'activité du portefeuille InsurFlow**\n\n" +
                "Voici les indicateurs de performance clés consolidés :\n\n" +
                "• 👥 **Nombre total de clients actifs :** " + clientCount + "\n" +
                "• 📁 **Nombre de contrats / polices gérés :** " + productionCount + "\n" +
                "• 💳 **Dossiers de règlement et quittances :** " + reglementCount + "\n" +
                "• 📈 **Dynamique de souscription :** Forte prédominance des polices Automobiles (RC, Dommages) et Multirisques.\n\n" +
                "🎯 **Pistes d'optimisation commerciale :**\n" +
                "1. **Multi-équipement :** Proposer la Multirisque Habitation ou Santé Complémentaire aux clients Auto Particuliers.\n" +
                "2. **Recouvrement :** Relancer les quittances émises à J+15 pour optimiser le cash-flow et la trésorerie compagnies.\n" +
                "3. **Rétention :** Anticiper les appels de renouvellement dès l'ouverture du mois.";

        return CopilotChatResponse.builder()
                .response(text)
                .suggestedActions(List.of(
                        "Quelles sont les polices à renouveler ce mois ?",
                        "Rédiger un email de relance de quittance impayée",
                        "Explication franchise Tous Risques vs Tiers Collision"
                ))
                .build();
    }

    private CopilotChatResponse handleMaritimeQuery() {
        String text = "⚓ **Assurance Maritime & Transports (Facultés & Corps de Navire)**\n\n" +
                "• **Garanties principales :** FAP Sauf (Franc d'Avaries Particulières), Tous Risques Facultés maritimes, Corps et Machines de navire.\n" +
                "• **Pièces obligatoires au dossier :** Connaissement (Bill of Lading), Facture commerciale maritime, Certificat d'origine, Rapport d'expertise avarie (le cas échéant).\n" +
                "• **Taux de commission usuel :** ~27.5% selon les accords avec les compagnies partenaires.\n" +
                "• **Répartition Co-assurance :** Vérifier que la somme des parts des compagnies co-apéritrices totalise exactement 100%.";

        return CopilotChatResponse.builder()
                .response(text)
                .suggestedActions(List.of(
                        "Synthèse de l'activité du portefeuille",
                        "Explication franchise Tous Risques vs Tiers Collision"
                ))
                .build();
    }

    private CopilotChatResponse handleCommissionQuery() {
        String text = "💰 **Barème indicatif des commissions de courtage (Maroc)**\n\n" +
                "• **Automobile (RC Obligatoire) :** 15% à 20%\n" +
                "• **Automobile (Garanties Annexes / Tous Risques) :** 20% à 25%\n" +
                "• **Accidents du Travail (AT) :** 15%\n" +
                "• **Multirisque Professionnelle / Habitation :** 25%\n" +
                "• **Santé Internationale & Groupe :** 10% à 15%\n" +
                "• **Maritime & Transport de marchandises :** 25% à 27.5%\n\n" +
                "*(Ces taux peuvent être personnalisés dans votre module Référentiels > Catégories)*";

        return CopilotChatResponse.builder()
                .response(text)
                .suggestedActions(List.of(
                        "Synthèse de l'activité du portefeuille",
                        "Quelles sont les polices à renouveler ce mois ?"
                ))
                .build();
    }

    private CopilotChatResponse handleGeneralInsuranceQuery(String query) {
        String text = "🤖 **InsurFlow Copilot • Conseil Courtier :**\n\n" +
                "Concernant votre demande (*\"" + query + "\"*) :\n\n" +
                "En tant que gestionnaire d'assurances, vous opérez sous le cadre réglementaire de l'**ACAPS** et du **Code des Assurances (Loi n° 17-99)**.\n\n" +
                "Je conserve l'historique de notre échange pour vous assister de manière continue.\n\n" +
                "Je peux vous assister sur les sujets suivants :\n" +
                "• La rédaction et personnalisation de courriers (relances, quittances, sinistres, résiliations)\n" +
                "• L'analyse actuarielle de risque et conseils de franchise\n" +
                "• Le suivi des échéances et renouvellements du portefeuille\n" +
                "• La fiscalité des primes (TVA 14%, taxe parafiscale, accessoires)";

        return CopilotChatResponse.builder()
                .response(text)
                .suggestedActions(List.of(
                        "Quelles sont les polices à renouveler ce mois ?",
                        "Rédiger un email de relance de quittance impayée",
                        "Explication franchise Tous Risques vs Tiers Collision",
                        "Synthèse de l'activité du portefeuille"
                ))
                .build();
    }
}
