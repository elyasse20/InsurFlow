import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { ClaimAnalysisRequest, ClaimAnalysisResponse, ClaimFinancialBreakdown, FraudRiskLevel } from '@/types';

const CLAIMS_SYSTEM_PROMPT = `You are InsurFlow Claims AI Analyzer, an expert Moroccan insurance claims auditor, loss adjuster, and actuarial fraud investigation assistant operating strictly under the Moroccan Insurance Code (Code des Assurances Loi n° 17-99) and ACAPS regulations.
Analyze the provided claim declaration, accident report (constat amiable), or police notice.
You must return a valid JSON object ONLY with the exact following schema:
{
  "executiveSummary": "Structured summary detailing incident date, circumstances, parties involved, and damage points.",
  "liabilityAssessment": "Clear liability breakdown and ACAPS convention fault percentage (e.g. 0% Non-responsable / 100% Recours adverse, 50/50, or 100% Responsable).",
  "financialBreakdown": {
    "estimatedDamage": <number>,
    "deductible": <number>,
    "netPayout": <number>,
    "currency": "MAD",
    "notes": "Brief note on deductible application"
  },
  "fraudRiskScore": <integer between 0 and 100>,
  "fraudRiskLevel": "FAIBLE" | "MOYEN" | "ÉLEVÉ",
  "riskFlags": ["List of identified anomalies, warning indicators, or positive verifications"],
  "recommendedActions": ["List of practical next steps for the insurance broker / claims adjuster"]
}
Detect the language of the prompt (French, English, or Arabic/Darija) and respond in the same language.`;

function evaluateFallbackClaimsEngine(req: ClaimAnalysisRequest): ClaimAnalysisResponse {
  const text = (req.claimText || '').trim();
  const tLower = text.toLowerCase();

  const isEnglish = /\b(accident|collision|damage|police|report|claim|stolen|theft|car|vehicle|highway|parking|rear-end)\b/i.test(text);

  let fraudScore = 15;
  const riskFlags: string[] = [];
  const recommendedActions: string[] = [];

  // Financial defaults
  let estimatedDamage = req.estimatedDamage ?? 8500;
  const deductible = req.deductible ?? 1500;

  // Extract amount if not explicitly provided
  if (!req.estimatedDamage) {
    const match = text.match(/(\d+[\s\d]*[\.,]?\d*)\s*(?:dh|mad|dhs)/i);
    if (match) {
      try {
        const clean = match[1].replace(/\s+/g, '').replace(',', '.');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed)) estimatedDamage = parsed;
      } catch {
        // Fallback to default estimatedDamage
      }
    }
  }

  // ── Heuristic Checks ────────────────────────────────────────────────────────
  const isSoloNoThirdParty =
    tLower.includes('sans tiers') ||
    tLower.includes('aucun tiers') ||
    tLower.includes('no third party') ||
    tLower.includes('seul') ||
    tLower.includes('obstacle fixe') ||
    tLower.includes('arbre') ||
    tLower.includes('poteau') ||
    (tLower.includes('parking') && !tLower.includes('véhicule b'));

  const isLateDeclaration =
    tLower.includes('retard') ||
    tLower.includes('10 jours') ||
    tLower.includes('15 jours') ||
    tLower.includes('3 semaines') ||
    tLower.includes('mois dernier') ||
    tLower.includes('late') ||
    tLower.includes('tardive');

  const isTheftOrBreakIn =
    tLower.includes('vol') ||
    tLower.includes('effraction') ||
    tLower.includes('vitre brisée') ||
    tLower.includes('serrure forcée') ||
    tLower.includes('stolen') ||
    tLower.includes('theft') ||
    tLower.includes('break-in');

  const isChainCollision =
    tLower.includes('chaîne') ||
    tLower.includes('chaine') ||
    tLower.includes('carambolage') ||
    tLower.includes('rear-end') ||
    tLower.includes('chain collision') ||
    tLower.includes('freinage');

  const isRecentSubscription =
    tLower.includes('récent') ||
    tLower.includes('souscrit hier') ||
    tLower.includes('nouvelle police') ||
    tLower.includes('3 jours') ||
    tLower.includes('recently subscribed');

  const isDisputeOrHitAndRun =
    tLower.includes('délit de fuite') ||
    tLower.includes('hit and run') ||
    tLower.includes('refus de signer') ||
    tLower.includes('conteste') ||
    tLower.includes('ivresse') ||
    tLower.includes('alcool');

  // Scoring
  if (isSoloNoThirdParty) {
    fraudScore += 25;
    riskFlags.push(
      isEnglish
        ? 'Single-vehicle accident / No identified third-party in parking (Verify authenticity and impact angle).'
        : 'Accident sans tiers identifié en stationnement / choc isolé (Vérifier absence de tentative de maquillage).'
    );
  }

  if (isLateDeclaration) {
    fraudScore += 20;
    riskFlags.push(
      isEnglish
        ? 'Late claim filing > 5 business days (Article 20 of Moroccan Insurance Code Law 17-99).'
        : 'Déclaration tardive > 5 jours ouvrés (Article 20 de la Loi n° 17-99 régissant les délais de notification).'
    );
    recommendedActions.push(
      isEnglish
        ? 'Check for valid force majeure justification for late notification under Law 17-99.'
        : 'Vérifier le motif légal du retard de déclaration (Cas fortuit ou force majeure selon Loi 17-99).'
    );
  }

  if (isRecentSubscription) {
    fraudScore += 30;
    riskFlags.push(
      isEnglish
        ? 'Claim occurred immediately following policy inception (High prior damage risk indicator).'
        : 'Sinistre survenu à proximité immédiate de la souscription du contrat (Indicateur d\'antériorité possible).'
    );
    recommendedActions.push(
      isEnglish
        ? 'Audit exact timestamp of premium receipt payment vs reported time of accident.'
        : 'Vérifier la date et l\'heure exactes de paiement de la quittance initiale avant l\'heure du sinistre.'
    );
  }

  if (isDisputeOrHitAndRun) {
    fraudScore += 35;
    riskFlags.push(
      isEnglish
        ? 'Hit-and-run / Refusal of joint statement (Potential traffic violation or disputed liability).'
        : 'Délit de fuite / Refus de constat ou suspicion d\'infraction pénale au Code de la Route.'
    );
    recommendedActions.push(
      isEnglish
        ? 'Request the official police / Royal Gendarmerie accident investigation report (Procès-Verbal).'
        : 'Exiger la communication du Procès-Verbal officiel de Police / Gendarmerie Royale.'
    );
  }

  if (isTheftOrBreakIn) {
    fraudScore += 15;
    riskFlags.push(
      isEnglish
        ? 'Theft / Forced entry claim: Mandatory official complaint filing required.'
        : 'Sinistre de type Vol / Effraction : Nécessité de dépôt de plainte formel auprès des autorités.'
    );
    recommendedActions.push(
      isEnglish
        ? 'Collect the original police complaint receipt and all sets of original vehicle keys.'
        : 'Exiger l\'original du récépissé de dépôt de plainte de police et les deux jeux de clés originaux.'
    );
  }

  if (isChainCollision) {
    fraudScore = Math.max(5, fraudScore - 5);
    riskFlags.push(
      isEnglish
        ? 'Chain collision with consistent kinematics (Multiple eyewitnesses and identified third parties).'
        : 'Accident en chaîne à cinématique cohérente (Multiples témoins et tiers identifiés).'
    );
  }

  fraudScore = Math.max(5, Math.min(95, fraudScore));

  let fraudLevel: FraudRiskLevel;
  if (fraudScore < 35) {
    fraudLevel = 'FAIBLE';
  } else if (fraudScore < 65) {
    fraudLevel = 'MOYEN';
  } else {
    fraudLevel = 'ÉLEVÉ';
  }

  // ── Liability Assessment ──────────────────────────────────────────────────
  let liabilityAssessment: string;
  if (isChainCollision) {
    liabilityAssessment = isEnglish
      ? '0% At-Fault (100% full recovery against the rear vehicle responsible under the Moroccan CISA/CID convention).'
      : '0% Responsable (Recours total 100% contre le véhicule suiveur responsable du carambolage selon la Convention CISA/CID).';
  } else if (isSoloNoThirdParty) {
    liabilityAssessment = isEnglish
      ? '100% At-Fault (Single vehicle loss / Solo impact). Covered under Comprehensive (Tous Risques) subject to policy deductible.'
      : '100% Responsable (Perte de contrôle / Stationnement sans tiers). Garantie Dommages au Véhicule / Tous Risques requise avec application de franchise.';
  } else if (isTheftOrBreakIn) {
    liabilityAssessment = isEnglish
      ? 'Not Applicable (Theft / Vandalism Loss). Covered under Theft & Break-in guarantee subject to expert inspection.'
      : 'Non applicable (Sinistre Vol/Vandalisme). Couverture au titre de la garantie Vol & Effraction sous réserve d\'expertise préalable.';
  } else if (tLower.includes('priorité') || tLower.includes('stop') || tLower.includes('priority')) {
    liabilityAssessment = isEnglish
      ? 'Liability governed by Right-of-Way rules (ACAPS Scale Case #10 / 100% adverse liability if third party failed to yield).'
      : 'Responsabilité déterminée selon le constat : Priorité à droite / Non-respect du panneau de signalisation (Barème ACAPS Cas N° 10 / Recours 100%).';
  } else {
    liabilityAssessment = isEnglish
      ? 'Shared or pending liability subject to box checkboxes on the joint accident statement (ACAPS convention grid).'
      : 'Responsabilité partagée sous réserve de l\'examen des croix cochées sur le constat amiable (Barème ACAPS Conventionnel).';
  }

  // ── Financial Breakdown ───────────────────────────────────────────────────
  const netPayout = Math.max(0, estimatedDamage - deductible);
  const financialBreakdown: ClaimFinancialBreakdown = {
    estimatedDamage,
    deductible,
    netPayout,
    currency: 'MAD',
    notes: isEnglish
      ? 'Net indemnity calculation after deduction of contractual franchise.'
      : "Calcul net d'indemnisation après imputation de la franchise contractuelle.",
  };

  // ── Standard Action Steps ────────────────────────────────────────────────
  if (recommendedActions.length === 0) {
    if (isEnglish) {
      recommendedActions.push('Appoint an ACAPS-certified auto loss adjuster for contradictory assessment.');
      recommendedActions.push('Verify policy validity and premium payment status on the date of loss.');
      recommendedActions.push('Register claim opening in Claims module and notify lead carrier.');
    } else {
      recommendedActions.push('Mandater un expert automobile agréé ACAPS pour chiffrage contradictoire.');
      recommendedActions.push('Vérifier la validité des quittances et le paiement de la prime à date du sinistre.');
      recommendedActions.push('Enregistrer l\'ouverture de dossier dans le module Sinistres et notifier la compagnie apéritrice.');
    }
  } else {
    if (isEnglish) {
      recommendedActions.push('Appoint an ACAPS-certified auto surveyor to cross-examine point-of-impact consistency.');
      recommendedActions.push('Formally notify the insurer with customary legal reservations.');
    } else {
      recommendedActions.push('Mandater un expert automobile agréé ACAPS pour vérification de conformité des points de choc.');
      recommendedActions.push('Notifier la compagnie d\'assurance avec mention des réserves d\'usage.');
    }
  }

  // ── Executive Summary ─────────────────────────────────────────────────────
  const client = req.clientName || (isEnglish ? 'InsurFlow Insured' : 'Assuré InsurFlow');
  const policy = req.policyNumber || `POL-${new Date().getFullYear()}-SN`;
  const date = req.incidentDate || new Date().toISOString().slice(0, 10);

  const summary = isEnglish
    ? `Insurance claim registered for client **${client}** (Policy **${policy}**). Incident occurred on ${date}.\n\n` +
      `• **Incident Type:** ${isChainCollision ? 'Chain collision on highway' : isTheftOrBreakIn ? 'Theft / Forced entry' : isSoloNoThirdParty ? 'Solo vehicle impact / No third party' : 'Standard collision'}\n` +
      `• **Circumstances:** ${text.length > 180 ? text.substring(0, 175) + '...' : text || 'Standard claim declaration'}\n` +
      `• **Estimated Financial Impact:** ${estimatedDamage.toLocaleString('en-US')} MAD (Contractual Deductible: ${deductible.toLocaleString('en-US')} MAD).`
    : `Déclaration de sinistre enregistrée pour le client **${client}** (Police n° **${policy}**). Événement survenu le ${date}.\n\n` +
      `• **Type d'incident :** ${isChainCollision ? 'Accident en chaîne sur voie rapide' : isTheftOrBreakIn ? 'Vol / Effraction matérielle' : isSoloNoThirdParty ? 'Choc isolé / Sans tiers identifié' : 'Collision matérielle standard'}\n` +
      `• **Description des faits :** ${text.length > 180 ? text.substring(0, 175) + '...' : text || 'Déclaration standard enregistrée'}\n` +
      `• **Impact financier estimé :** ${estimatedDamage.toLocaleString('fr-MA')} MAD (Franchise contractuelle : ${deductible.toLocaleString('fr-MA')} MAD).`;

  return {
    executiveSummary: summary,
    liabilityAssessment,
    financialBreakdown,
    fraudRiskScore: fraudScore,
    fraudRiskLevel: fraudLevel,
    riskFlags,
    recommendedActions,
  };
}

export async function POST(request: Request) {
  try {
    const body: ClaimAnalysisRequest = await request.json();

    if (!body.claimText || body.claimText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le texte de la déclaration de sinistre est obligatoire.' },
        { status: 400 }
      );
    }

    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    const apiKey = rawKey.trim();

    console.log('Claims Analyzer - GEMINI_API_KEY detected:', !!apiKey && apiKey.length > 0);

    if (apiKey.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Client Name: ${body.clientName || 'N/A'}
Policy Number: ${body.policyNumber || 'N/A'}
Incident Date: ${body.incidentDate || 'N/A'}
Category: ${body.category || 'AUTO'}
Estimated Damage: ${body.estimatedDamage || 'N/A'} MAD
Contractual Deductible: ${body.deductible || 'N/A'} MAD

Claim Statement / Report Text:
"""
${body.claimText}
"""`;

        let geminiResponse;
        try {
          geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: CLAIMS_SYSTEM_PROMPT,
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
        } catch (modelErr) {
          console.warn('Claims Analyzer: gemini-2.5-flash failed, attempting gemini-1.5-flash...', modelErr);
          geminiResponse = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            config: {
              systemInstruction: CLAIMS_SYSTEM_PROMPT,
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
        }

        const rawJson = geminiResponse?.text;
        if (rawJson && rawJson.trim().length > 0) {
          try {
            const parsed = JSON.parse(rawJson);
            if (parsed.executiveSummary && parsed.financialBreakdown) {
              return NextResponse.json(parsed as ClaimAnalysisResponse);
            }
          } catch (parseErr) {
            console.warn('Claims Analyzer: Failed to parse Gemini JSON output, using fallback:', parseErr);
          }
        }
      } catch (geminiErr) {
        console.error('Claims Analyzer: Gemini API Error:', geminiErr);
      }
    }

    // ── Deterministic Rule-Based Fallback Engine ──────────────────────────────
    const fallbackResult = evaluateFallbackClaimsEngine(body);
    return NextResponse.json(fallbackResult);
  } catch (error: any) {
    console.error('Error in Claims Analyzer API route:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse du sinistre par l'IA." },
      { status: 500 }
    );
  }
}
