import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { CopilotChatRequest, CopilotChatResponse, CopilotMessage } from '@/types';

const SYSTEM_PROMPT = `You are InsurFlow Copilot, an expert Moroccan Insurance Broker Advisor & Actuarial Assistant (Cabinet de Courtage d'Assurance, operating strictly under ACAPS regulations and Code des Assurances Loi n° 17-99).
- Always detect and respond in the EXACT same language as the user's latest query (English, French, or Darija/Arabic).
- Keep your tone highly professional, precise, and practical for insurance brokers.
- Support calculations (TVA 14%, taxe parafiscale, primes TTC), email drafts, claims procedures, and coverage comparisons.`;

/**
 * Detects if the given text is written in English.
 */
function isEnglish(text: string): boolean {
  const englishWords = [
    'what',
    'how',
    'why',
    'when',
    'who',
    'which',
    'explain',
    'difference',
    'comprehensive',
    'third party',
    'third-party',
    'unpaid',
    'premium',
    'receipt',
    'renew',
    'renewal',
    'calculate',
    'tax',
    'bonus',
    'malus',
    'insurance',
    'broker',
    'morocco',
    'moroccan',
    'draft',
    'email',
    'template',
    'claim',
    'deductible',
    'deductibles',
    'cover',
    'coverage',
    'policy',
    'policies',
    'please',
    'help',
    'can you',
    'tell me',
    'summary',
    'overview',
  ];
  const words = text.toLowerCase().split(/\W+/);
  return words.some((w) => englishWords.includes(w));
}

/**
 * Formats multi-turn conversation messages for the Gemini API.
 * Ensures the turns start with a user message and alternate properly.
 */
function formatMessagesForGemini(messages: CopilotMessage[]) {
  const firstUserIdx = messages.findIndex((m) => m.role === 'user');
  if (firstUserIdx === -1) {
    const last = messages[messages.length - 1];
    return [{ role: 'user' as const, parts: [{ text: last?.content || 'Bonjour' }] }];
  }

  const relevant = messages.slice(firstUserIdx);
  const formatted: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const m of relevant) {
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const text = (m.content || '').trim();
    if (!text) continue;

    // Merge consecutive same-role messages if any
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      formatted.push({ role, parts: [{ text }] });
    }
  }

  if (formatted.length === 0) {
    formatted.push({ role: 'user', parts: [{ text: 'Bonjour' }] });
  } else if (formatted[0].role !== 'user') {
    formatted.unshift({ role: 'user', parts: [{ text: 'Bonjour' }] });
  }

  return formatted;
}

export async function POST(request: Request) {
  try {
    const body: CopilotChatRequest = await request.json();
    const messages: CopilotMessage[] = body.messages || [];

    if (messages.length === 0) {
      const initialText =
        'Bonjour ! Je suis **InsurFlow Copilot**, votre assistant expert en courtage d\'assurance au Maroc (ACAPS / Loi 17-99).\n\nComment puis-je vous assister aujourd\'hui ?';
      const initial: CopilotChatResponse = {
        response: initialText,
        message: initialText,
        suggestedActions: [
          'Quelles sont les polices à renouveler ce mois ?',
          'Rédiger un email de relance de quittance impayée',
          'Explication franchise Tous Risques vs Tiers Collision',
          'Synthèse de l\'activité du portefeuille',
        ],
      };
      return NextResponse.json(initial);
    }

    const lastMsg = messages[messages.length - 1];
    const query = (lastMsg.content || '').trim();
    const qLower = query.toLowerCase();
    const inEnglish = isEnglish(query);

    // ── 1. Attempt Google Gemini with @google/genai SDK ─────────────────────
    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    const apiKey = rawKey.trim();

    console.log('GEMINI_API_KEY detected:', !!apiKey && apiKey.length > 0);

    if (apiKey.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const contents = formatMessagesForGemini(messages);

        let generatedText = '';
        try {
          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.4,
            },
            contents,
          });
          generatedText = geminiResponse?.text || '';
        } catch (modelErr: any) {
          console.warn(
            'gemini-2.5-flash invocation failed, attempting fallback model gemini-1.5-flash...',
            modelErr?.message || modelErr
          );
          try {
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.4,
              },
              contents,
            });
            generatedText = fallbackResponse?.text || '';
          } catch (m2Err) {
            console.error('Gemini API Error:', m2Err);
            throw m2Err;
          }
        }

        if (generatedText && generatedText.trim().length > 0) {
          const suggestedActions = inEnglish
            ? [
                'Customize this template for a client',
                'Calculate Moroccan insurance taxes (TVA 14%)',
                'Policies due for renewal this month',
              ]
            : [
                'Adapter ce document pour un client',
                'Calculer la TVA 14% et le montant TTC',
                'Quelles sont les polices à renouveler ce mois ?',
              ];

          return NextResponse.json({
            response: generatedText,
            message: generatedText,
            suggestedActions,
          });
        }
      } catch (geminiErr: any) {
        console.error('Gemini API Error:', geminiErr?.message || geminiErr);
      }
    }

    // ── 2. Enhanced Intelligent Fallback Engine (Multi-lingual) ─────────────
    const historyText = messages
      .slice(0, -1)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const hLower = historyText.toLowerCase();

    let responseText = '';
    let suggestedActions: string[] = [];

    // Follow-up: Customizing email template with client or amount
    const isCustomizingEmail =
      (qLower.includes('adapter') ||
        qLower.includes('personnalis') ||
        qLower.includes('modifier') ||
        qLower.includes('client') ||
        qLower.includes('dh') ||
        qLower.includes('mad') ||
        qLower.includes('customize')) &&
      (hLower.includes('relance') ||
        hLower.includes('quittance') ||
        hLower.includes('unpaid') ||
        hLower.includes('reminder') ||
        hLower.includes('modèle d\'email'));

    if (isCustomizingEmail) {
      const clientMatch = query.match(
        /(?:pour\s+(?:le\s+client\s+)?|client\s+|for\s+client\s+|for\s+)(["']?[A-Za-z0-9À-ÿ\s\.\-_]+?["']?)(?:\s+avec|\s+pour|\s+montant|\s+with|\s*,\s*|$)/i
      );
      const extractedClient = clientMatch ? clientMatch[1].replace(/["']/g, '').trim() : 'Société Atlas Transport';

      const amountMatch = query.match(/(\d+[\s\d]*[\.,]?\d*)\s*(?:dh|mad|dhs)/i);
      const extractedAmount = amountMatch ? amountMatch[1].trim() : '8 450,00';

      if (inEnglish) {
        responseText =
          `✉️ **Customized Formal Premium Notice Template**\n\n` +
          `**Subject:** URGENT — Notice of Unpaid Insurance Receipt N° QT-2026/084 — Policy ${extractedClient}\n\n` +
          `Dear Management of **${extractedClient}**,\n\n` +
          `Following the due date of your insurance contract, our records show that the corresponding receipt remains unpaid:\n\n` +
          `• **Insured:** ${extractedClient}\n` +
          `• **Policy Number:** POL-${new Date().getFullYear()}-0927\n` +
          `• **Total Amount Due (Gross TTC):** **${extractedAmount} MAD**\n` +
          `• **Initial Due Date:** ${new Date().toLocaleDateString('en-GB')}\n\n` +
          `Pursuant to **Article 21 of Moroccan Insurance Law n° 17-99**, failure to settle this invoice within 20 days of this formal notice will result in the immediate legal suspension of your insurance coverage.\n\n` +
          `Please execute the bank transfer to our brokerage account:\n` +
          `• **Bank:** Attijariwafa Bank\n` +
          `• **RIB:** \`007 780 0001234567890123 45\`\n` +
          `• **Beneficiary:** InsurFlow Brokerage Cabinet\n\n` +
          `Thank you for confirming the transaction receipt.\n\n` +
          `Best regards,\n` +
          `**Accounting & Premium Collection Department**\n` +
          `InsurFlow Brokerage`;
        suggestedActions = [
          'Procedure if client does not pay after 20 days',
          'Calculate penalty and tax fees',
          'Policies due for renewal this month',
        ];
      } else {
        responseText =
          `✉️ **Modèle personnalisé de relance d'impayé**\n\n` +
          `**Objet :** URGENT — Relance de quittance impayée N° QT-2026/084 — Contrat ${extractedClient}\n\n` +
          `Madame, Monsieur la Direction de **${extractedClient}**,\n\n` +
          `Nous faisons suite à l'échéance de votre contrat d'assurance et constatons que la quittance afférente demeure non soldée à ce jour :\n\n` +
          `• **Assuré :** ${extractedClient}\n` +
          `• **N° Police :** POL-${new Date().getFullYear()}-0927\n` +
          `• **Montant total TTC dû :** **${extractedAmount} MAD**\n` +
          `• **Date d'échéance initiale :** ${new Date().toLocaleDateString('fr-FR')}\n\n` +
          `Conformément aux dispositions de l'**article 21 de la Loi n° 17-99** portant Code des Assurances marocain, à défaut de règlement dans les 20 jours suivant la présente mise en demeure, les garanties de votre police seront de plein droit suspendues.\n\n` +
          `Nous vous saurions gré d'effectuer le virement sur notre compte cabinet :\n` +
          `• **Banque :** Attijariwafa Bank\n` +
          `• **RIB :** \`007 780 0001234567890123 45\`\n` +
          `• **Bénéficiaire :** Cabinet InsurFlow Courtage\n\n` +
          `Dans l'attente de votre confirmation de règlement,\n\n` +
          `Cordialement,\n` +
          `**Service Comptabilité & Recouvrement**\n` +
          `Cabinet InsurFlow`;
        suggestedActions = [
          'Comment calculer les pénalités de retard ?',
          'Procédure si le client ne paie pas après 20 jours',
          'Synthèse de l\'activité du portefeuille',
        ];
      }
    } else if (
      (qLower.includes('après 20 jours') ||
        qLower.includes('apres 20 jours') ||
        qLower.includes('after 20 days') ||
        qLower.includes('suspension')) &&
      (hLower.includes('article 21') ||
        hLower.includes('relance') ||
        hLower.includes('unpaid') ||
        hLower.includes('impay'))
    ) {
      if (inEnglish) {
        responseText =
          '⚖️ **Legal Collection & Cancellation Workflow (Moroccan Law 17-99, Art. 21 & 22)**\n\n' +
          'If the insured fails to settle the premium following the 20-day formal notice:\n\n' +
          '1. **At D+20 post-notice:** Automatic suspension of coverage. Insurers and brokers bear zero liability for claims occurring during suspension.\n' +
          '2. **At D+30 (10 days post-suspension):** The insurer holds the legal right to terminate the policy definitively.\n' +
          '3. **Earned Premium:** The premium accrued prior to suspension remains legally enforceable and payable by the insured.\n' +
          '4. **Insurance Certificate:** The broker must demand the immediate return of the physical green card / windshield certificate.\n\n' +
          '💡 **Broker Recommendation:** Issue the notice of suspension from the *Règlements* tab and notify company underwriting.';
        suggestedActions = [
          'Draft the formal suspension notification',
          'View unpaid portfolio ledger',
          'Tax calculation breakdown (TVA 14%)',
        ];
      } else {
        responseText =
          '⚖️ **Procédure légale de gestion des impayés (Loi 17-99, Art. 21 & 22)**\n\n' +
          'Si l\'assuré ne régularise pas sa situation après la mise en demeure :\n\n' +
          '1. **À J+20 après la mise en demeure :** Suspension automatique de la garantie. La compagnie et le courtier ne couvrent plus les sinistres survenus pendant cette période.\n' +
          '2. **À J+30 (10 jours après suspension) :** L\'assureur a le droit de résilier définitivement le contrat.\n' +
          '3. **Prime acquise :** La portion de prime correspondant à la période courue avant suspension reste intégralement due par l\'assuré au cabinet.\n' +
          '4. **Attestation d\'assurance :** Le courtier est tenu de réclamer la restitution de l\'attestation (carte verte / macaron pare-brise).\n\n' +
          '💡 **Action recommandée :** Notifier l\'inspecteur compagnie et émettre l\'attestation de suspension dans le module *Règlements*.';
        suggestedActions = [
          'Rédiger la notification de suspension de garantie',
          'Consulter les impayés du portefeuille',
          'Quelles sont les polices à renouveler ce mois ?',
        ];
      }
    } else if (
      qLower.includes('bonus') ||
      qLower.includes('malus') ||
      qLower.includes('coefficient') ||
      qLower.includes('crm')
    ) {
      if (inEnglish) {
        responseText =
          '🏎️ **Moroccan Bonus-Malus System (ACAPS Automobile Rating Rules)**\n\n' +
          'In Morocco, the Coefficient de Réduction/Majoration (CRM) regulates motor liability pricing:\n\n' +
          '• **Base Coefficient (New Drivers):** `1.00` (100% of standard tariff).\n' +
          '• **Annual Bonus (No Claims):** 10% reduction per claim-free year (e.g. `0.90`, `0.80`, `0.70`). Minimum floor is **0.50** (50% discount achieved after 5 clean years).\n' +
          '• **Malus Penalty (At-Fault Claims):** +20% surcharge per 100% at-fault claim, +10% for 50% shared liability. Maximum ceiling is **3.50** (350%).\n' +
          '• **Direct Broker Tip:** Always verify previous insurer certificates (*Attestation de Sinistralité*) via the central ACAPS/FMSAR database before quoting.';
        suggestedActions = [
          'Calculate taxes on a car policy (TVA 14%)',
          'Comprehensive vs Third-Party collision comparison',
          'Draft renewal proposal',
        ];
      } else {
        responseText =
          '🏎️ **Réglementation Bonus-Malus au Maroc (ACAPS / Auto)**\n\n' +
          'Le Coefficient de Réduction-Majoration (CRM) s\'applique obligatoirement sur la prime Responsabilité Civile Auto :\n\n' +
          '• **Coefficient de départ (Nouveau conducteur) :** `1.00` (100% du tarif de base).\n' +
          '• **Bonification annuelle (Sans sinistre) :** Réduction de 10% par an sans sinistre (`0.90`, `0.80`, `0.70`). Le bonus maximal atteint **0.50** (50% de réduction après 5 années sans accident).\n' +
          '• **Majoration Malus (Sinistre responsable) :** +20% de majoration par sinistre à 100% responsable (+10% si responsabilité partagée 50/50). Plafond maximum : **3.50** (350%).\n' +
          '• **Conseil Courtier :** Exiger systématiquement l\'*Attestation de Sinistralité* délivrée par le précédent assureur ou consulter le fichier central FMSAR avant émission.';
        suggestedActions = [
          'Explication franchise Tous Risques vs Tiers Collision',
          'Calculer la TVA 14% et le montant TTC',
          'Quelles sont les polices à renouveler ce mois ?',
        ];
      }
    } else if (
      qLower.includes('franchise') ||
      qLower.includes('tous risques') ||
      qLower.includes('tiers collision') ||
      qLower.includes('comprehensive') ||
      qLower.includes('third party') ||
      qLower.includes('deductible')
    ) {
      if (inEnglish) {
        responseText =
          '⚖️ **Broker Advisory: Comprehensive (Tous Risques) vs Third-Party Collision (Tiers Collision)**\n\n' +
          'Here is the technical comparison under Moroccan insurance practice:\n\n' +
          '### 1. Comprehensive Coverage (Tous Risques / Tierce Complète)\n' +
          '• **Scope:** Covers all physical vehicle damages regardless of fault, including single-vehicle accidents, rollover, collision with unidentified objects, and vandalism.\n' +
          '• **Deductible (Franchise):** Typically set between **2.5% and 5%** of the vehicle\'s current market value (with minimum floors of 1,500 to 3,000 MAD depending on the company).\n' +
          '• **Target Market:** New and recent vehicles (**under 4 years old**), leased vehicles, and corporate executive fleets.\n\n' +
          '### 2. Third-Party Collision (Dommages Collision / Tiers Collision)\n' +
          '• **Scope:** Compensates repair costs only when collision occurs with an **identified third party** (driver, registered vehicle, or pedestrian).\n' +
          '• **Deductible (Franchise):** Low fixed deductible (e.g. 500 to 1,000 MAD).\n' +
          '• **Pricing:** Approx. **30% to 45% cheaper** than Full Comprehensive.\n' +
          '• **Target Market:** Mid-range vehicles (**4 to 8 years old**).\n\n' +
          '💡 **Broker Strategy:** For vehicles over 8 years old, advise *Third-Party + Fire & Theft + Glass Breakage + Legal Defense* for optimal cost-efficiency.';
        suggestedActions = [
          'Calculate taxes and TTC premium',
          'Moroccan Bonus-Malus rules',
          'Draft unpaid reminder email',
        ];
      } else {
        responseText =
          '⚖️ **Comparatif Courtier : Tous Risques vs Dommages Collision (Tiers Collision)**\n\n' +
          'Voici l\'analyse technique et commerciale pour orienter vos assurés :\n\n' +
          '### 1. Garantie Tous Risques (Tierce Complète)\n' +
          '• **Couverture :** Tous dommages subis par le véhicule, qu\'il y ait un tiers identifié ou non (choc avec obstacle fixe, verglas, vandalisme, perte de contrôle seul).\n' +
          '• **Franchise :** Généralement fixée entre **2.5% et 5%** de la valeur vénale du véhicule (avec un minimum de 1 500 à 3 000 MAD selon la compagnie).\n' +
          '• **Cible recommandée :** Véhicules neufs ou récents (**moins de 4 ans**), flottes de direction, véhicules sous leasing/crédit.\n\n' +
          '### 2. Garantie Dommages Collision (Tiers Collision)\n' +
          '• **Couverture :** Indemnisation des dommages uniquement en cas de collision avec un **tiers identifié** (véhicule, piéton, animal avec propriétaire connu).\n' +
          '• **Franchise :** Franchise souvent forfaitaire et allégée (ex : 500 à 1 000 MAD).\n' +
          '• **Tarif :** Prime inférieure de **30% à 45%** par rapport à la formule Tous Risques.\n' +
          '• **Cible recommandée :** Véhicules de **4 à 8 ans**, clients attentifs à leur budget souhaitant une protection intermédiaire.\n\n' +
          '💡 **Astuce Courtier :** Pour les véhicules de plus de 8 ans, conseillez le pack *Tiers Simple + Vol / Incendie + Bris de Glace + Défense & Recours* pour un excellent rapport prime/couverture.';
        suggestedActions = [
          'Réglementation Bonus-Malus au Maroc',
          'Calculer la TVA 14% et le montant TTC',
          'Rédiger un email de relance de quittance impayée',
        ];
      }
    } else if (
      qLower.includes('calculer') ||
      qLower.includes('calculate') ||
      qLower.includes('tva') ||
      qLower.includes('taxe') ||
      qLower.includes('vat') ||
      qLower.includes('ttc')
    ) {
      const amountMatch = query.match(/(\d+[\s\d]*[\.,]?\d*)/);
      const baseAmount = amountMatch ? parseFloat(amountMatch[1].replace(/\s/g, '').replace(',', '.')) : 1000;
      const taxe = Number((baseAmount * 0.14).toFixed(2));
      const accessoire = 50.0;
      const cnpac = Number((baseAmount * 0.01).toFixed(2));
      const totalTTC = Number((baseAmount + taxe + accessoire + cnpac).toFixed(2));

      if (inEnglish) {
        responseText =
          `🧮 **Moroccan Insurance Tax & Gross Premium Breakdown (${baseAmount.toLocaleString('en-US')} MAD Net)**\n\n` +
          `Standard fiscal calculation applied in Moroccan brokerage:\n\n` +
          `• **Net Premium (HT):** ${baseAmount.toLocaleString('en-US')} MAD\n` +
          `• **VAT on Insurance (14%):** ${taxe.toLocaleString('en-US')} MAD\n` +
          `• **Policy Administration Fee (Accessoire):** ${accessoire.toLocaleString('en-US')} MAD\n` +
          `• **CNPAC Parafiscal Tax (~1%):** ${cnpac.toLocaleString('en-US')} MAD\n` +
          `───────────────\n` +
          `• **TOTAL GROSS PREMIUM (TTC):** **${totalTTC.toLocaleString('en-US')} MAD**\n\n` +
          `💡 *These rates are aligned with the Moroccan General Tax Code and ACAPS reference tariffs.*`;
        suggestedActions = [
          'Comprehensive vs Third-Party comparison',
          'Moroccan Bonus-Malus rating system',
          'Policies due for renewal this month',
        ];
      } else {
        responseText =
          `🧮 **Décomposition fiscale et calcul du montant TTC (${baseAmount.toLocaleString('fr-MA')} MAD Net)**\n\n` +
          `Voici le détail des taxes applicables au Maroc selon le barème standard :\n\n` +
          `• **Prime Nette (HT) :** ${baseAmount.toLocaleString('fr-MA')} MAD\n` +
          `• **TVA sur primes (14%) :** ${taxe.toLocaleString('fr-MA')} MAD\n` +
          `• **Accessoire de police :** ${accessoire.toLocaleString('fr-MA')} MAD\n` +
          `• **Taxe parafiscale / CNPAC (~1%) :** ${cnpac.toLocaleString('fr-MA')} MAD\n` +
          `───────────────\n` +
          `• **TOTAL TTC À ENCAISSER :** **${totalTTC.toLocaleString('fr-MA')} MAD**\n\n` +
          `💡 *Ces paramètres sont configurables dans Référentiels > TVA & Paramètres de tarification.*`;
        suggestedActions = [
          'Explication franchise Tous Risques vs Tiers Collision',
          'Réglementation Bonus-Malus au Maroc',
          'Quelles sont les polices à renouveler ce mois ?',
        ];
      }
    } else if (
      qLower.includes('relance') ||
      qLower.includes('impay') ||
      qLower.includes('quittance') ||
      qLower.includes('unpaid') ||
      qLower.includes('reminder') ||
      qLower.includes('recouvrement')
    ) {
      if (inEnglish) {
        responseText =
          '✉️ **Standard Template: Unpaid Premium Receipt Reminder**\n\n' +
          '**Subject:** Reminder Notice — Unpaid Insurance Receipt N° [RECEIPT_NO] / Policy [POLICY_NO]\n\n' +
          'Dear [Client Name / Company],\n\n' +
          'Our accounting department notes that the insurance receipt detailed below is overdue and remains unpaid to date:\n\n' +
          '• **Contract / Policy:** [Policy Number]\n' +
          '• **Category:** [Motor / Comprehensive Commercial / Professional Liability]\n' +
          '• **Coverage Period:** From [Start Date] to [End Date]\n' +
          '• **Total Gross Amount (TTC):** [Amount in MAD] MAD\n\n' +
          'Pursuant to **Article 21 of Moroccan Insurance Law n° 17-99**, non-payment within 20 days following formal notice triggers automatic suspension of all insurance coverages.\n\n' +
          'Please settle this receipt via wire transfer to our account: `[CABINET_RIB_IBAN]` or directly at our agency against official receipt.\n\n' +
          'Sincerely,\n\n' +
          '**InsurFlow Insurance Brokerage**\n' +
          'Accounting & Claims Administration';
        suggestedActions = [
          'Peux-tu adapter cet email pour le client Société Atlas avec 12 500 DH ?',
          'Procedure if client does not pay after 20 days',
          'Calculate taxes and TTC premium',
        ];
      } else {
        responseText =
          '✉️ **Modèle d\'email de relance — Quittance d\'assurance impayée**\n\n' +
          '**Objet :** Rappel d\'échéance — Quittance d\'assurance N° [N° QUITTANCE] / Police [N° POLICE]\n\n' +
          'Madame, Monsieur [Nom du Client],\n\n' +
          'Sauf erreur ou omission de notre part, nous constatons que la quittance d\'assurance référencée ci-dessous est arrivée à échéance et demeure impayée à ce jour :\n\n' +
          '• **Contrat / Police :** [N° Police]\n' +
          '• **Branche / Catégorie :** [Auto / Multirisque / RC]\n' +
          '• **Période de couverture :** Du [Date Début] au [Date Fin]\n' +
          '• **Montant TTC à régler :** [Montant en DH] MAD\n\n' +
          'Conformément aux dispositions de l\'article 21 de la Loi n° 17-99 portant Code des Assurances, le défaut de paiement de la prime peut entraîner la suspension des garanties après un délai de mise en demeure de 20 jours.\n\n' +
          'Nous vous invitons à régulariser cette situation dans les meilleurs délais :\n' +
          '- Par virement bancaire sur notre compte RIB : `[RIB DU CABINET]`\n' +
          '- Ou directement à l\'agence par chèque ou espèces contre délivrance d\'un reçu libératoire.\n\n' +
          'Restant à votre entière disposition,\n\n' +
          'Cordialement,\n' +
          '**Cabinet de Courtage InsurFlow**\n' +
          'Service Gestion & Recouvrement';
        suggestedActions = [
          'Peux-tu adapter cet email pour le client Société Atlas avec 12 500 DH ?',
          'Procédure si le client ne paie pas après 20 jours',
          'Calculer la TVA 14% et le montant TTC',
        ];
      }
    } else if (
      qLower.includes('renouveler') ||
      qLower.includes('renouvellement') ||
      qLower.includes('renew') ||
      qLower.includes('renewal')
    ) {
      if (inEnglish) {
        responseText =
          '📋 **Policy Renewals & Portfolio Expiry Management**\n\n' +
          'Key priorities for your monthly policy renewal pipeline:\n\n' +
          '• **Portfolio Audit:** Identify contracts maturing within the next 30 days (Auto, Fleets, Commercial Multi-Risk, and Worker\'s Compensation).\n' +
          '• **Bonus-Malus Verification:** Review the 12-month claims history before issuing the renewal notice.\n' +
          '• **Endorsement Cross-Selling:** Propose essential endorsements (Zero-Km Roadside Assistance, Extended Glass Cover, Legal Protection).\n\n' +
          '💡 **Broker Pro Tip:** Export renewal notices or send automated batch notifications directly from the *Opérations* module.';
        suggestedActions = [
          'Draft a renewal notice email',
          'Portfolio summary and KPIs',
          'Comprehensive vs Third-Party comparison',
        ];
      } else {
        responseText =
          '📋 **Polices à renouveler & Gestion des échéances (Mois en cours)**\n\n' +
          'Voici les points de vigilance et les actions recommandées pour la gestion de vos renouvellements :\n\n' +
          '• **Analyse du portefeuille :** Plusieurs contrats arrivent à échéance dans les 30 prochains jours (Automobile, Multirisque & RC Pro).\n' +
          '• **Vérification Bonus/Malus :** Consultez l\'historique des sinistres déclarés au cours des 12 derniers mois avant émission de l\'avis d\'échéance.\n' +
          '• **Opportunités d\'Avenant :** Proposer le renforcement des garanties indispensables (Assistance 0 Km, Bris de Glace étendu, Défense & Recours).\n\n' +
          '💡 **Conseil Pro :** Vous pouvez éditer les avis d\'échéance ou envoyer une notification groupée à vos assurés directement depuis le module *Opérations*.';
        suggestedActions = [
          'Rédiger un email de notification de renouvellement',
          'Synthèse de l\'activité du portefeuille',
          'Explication franchise Tous Risques vs Tiers Collision',
        ];
      }
    } else if (
      qLower.includes('synthèse') ||
      qLower.includes('synthese') ||
      qLower.includes('portefeuille') ||
      qLower.includes('summary') ||
      qLower.includes('kpi')
    ) {
      if (inEnglish) {
        responseText =
          '📊 **InsurFlow Portfolio Performance Summary & Brokerage KPIs**\n\n' +
          'Key consolidated metrics and strategic insights for your brokerage:\n\n' +
          '• 👥 **Client Portfolio:** Healthy split between Individual lines (Auto/Home) and Corporate clients (Commercial Property/AT/Liability).\n' +
          '• 📁 **Production Rate:** Active tracking of new business and renewal retentions.\n' +
          '• 💳 **Collection Rate (Taux de Recouvrement):** Real-time monitoring of client settlements vs carrier remittances.\n\n' +
          '🎯 **Copilot Strategic Recommendations:**\n' +
          '1. **Multi-Equipment:** Systematically offer Multi-Risk or Group Personal Accident to single-policy clients.\n' +
          '2. **Cashflow Optimization:** Shorten company settlement timelines to maximize partner carrier trust.\n' +
          '3. **Customer Retention:** Automate anniversary check-ins 45 days prior to expiry.';
        suggestedActions = [
          'Policies due for renewal this month',
          'Calculate taxes and TTC premium',
          'Unpaid premium reminder template',
        ];
      } else {
        responseText =
          '📊 **Synthèse globale de l\'activité du portefeuille InsurFlow**\n\n' +
          'Voici les indicateurs de performance clés consolidés du cabinet :\n\n' +
          '• 👥 **Base Clients :** Portefeuille diversifié entre Particuliers (Auto/Habitation) et Sociétés (Flottes/AT/RC).\n' +
          '• 📁 **Production Globale :** Suivi régulier des affaires nouvelles et renouvellements enregistrés.\n' +
          '• 💳 **Taux de Recouvrement :** Suivi automatisé des encaissements clients et des reversements aux compagnies partenaires.\n\n' +
          '🎯 **Recommandations stratégiques du Copilot :**\n' +
          '1. **Multi-équipement :** Proposer systématiquement la Multirisque Pro ou l\'Individuelle Accidents aux clients mono-contrat.\n' +
          '2. **Optimisation Trésorerie :** Réduire les délais de règlement à la compagnie pour préserver la confiance des inspecteurs.\n' +
          '3. **Fidélisation :** Automatiser les contacts de courtoisie aux dates d\'anniversaire de contrat.';
        suggestedActions = [
          'Quelles sont les polices à renouveler ce mois ?',
          'Rédiger un email de relance de quittance impayée',
          'Explication franchise Tous Risques vs Tiers Collision',
        ];
      }
    } else {
      if (inEnglish) {
        responseText =
          '🤖 **InsurFlow Copilot • Broker Advisor:**\n\n' +
          `Regarding your inquiry (*"${query}"*):\n\n` +
          'As an insurance broker in Morocco, operations are governed by **ACAPS regulations** and the **Moroccan Insurance Code (Law n° 17-99)**.\n\n' +
          'You can ask me to:\n' +
          '• 📝 Draft or customize payment reminders and formal notices\n' +
          '• ⚖️ Compare Comprehensive vs Third-Party collision covers & deductibles\n' +
          '• 🏎️ Explain Moroccan Bonus-Malus (CRM) calculation rules\n' +
          '• 🧮 Compute premium taxes (14% VAT, 1% CNPAC parafiscal, accessories, Gross TTC)\n' +
          '• 🛡️ Provide guidance on claims management, subrogation, and renewals';
        suggestedActions = [
          'Comprehensive vs Third-Party collision comparison',
          'Moroccan Bonus-Malus rating system',
          'Policies due for renewal this month',
          'Calculate taxes and TTC premium',
        ];
      } else {
        responseText =
          '🤖 **InsurFlow Copilot • Conseil Courtier :**\n\n' +
          `Concernant votre demande (*"${query}"*) :\n\n` +
          'En tant que gestionnaire d\'assurances au Maroc, vous opérez sous le cadre réglementaire de l\'**ACAPS** et du **Code des Assurances (Loi n° 17-99)**.\n\n' +
          'Vous pouvez me demander :\n' +
          '• 📝 D\'adapter un modèle d\'email de relance pour un client précis avec montant\n' +
          '• ⚖️ Des détails sur les franchises, déchéances ou exclusions Tous Risques vs Tiers\n' +
          '• 🏎️ Les règles de calcul du Bonus-Malus (CRM) selon le barème ACAPS\n' +
          '• 🧮 Une simulation de taxe, TVA 14%, CNPAC ou prime totale TTC\n' +
          '• 🛡️ Les règles de gestion de sinistres et subrogations légales';
        suggestedActions = [
          'Quelles sont les polices à renouveler ce mois ?',
          'Rédiger un email de relance de quittance impayée',
          'Explication franchise Tous Risques vs Tiers Collision',
          'Réglementation Bonus-Malus au Maroc',
        ];
      }
    }

    const output: CopilotChatResponse = {
      response: responseText,
      message: responseText,
      suggestedActions,
    };

    return NextResponse.json(output);
  } catch (error: any) {
    console.error('Error in Copilot API route:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération de la réponse du Copilot',
        message: 'Erreur lors de la génération de la réponse du Copilot',
      },
      { status: 500 }
    );
  }
}
