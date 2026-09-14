import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { CopilotChatRequest, CopilotChatResponse, CopilotMessage } from '@/types';

const SYSTEM_PROMPT = `Tu es InsurFlow Copilot, l'assistant expert en courtage et gestion d'assurance au Maroc (réglementation ACAPS et Code des Assurances Loi n° 17-99).

RÈGLES FONDAMENTALES D'INTERACTION :
1. RÉPONSE DIRECTE & SANS BLABLA :
   - Réponds DIRECTEMENT et concrètement à la question posée dès le premier mot.
   - INTERDICTION STRICTE de répéter la question de l'utilisateur entre parenthèses ou de commencer par des formules creuses du type "Concernant votre demande...", "En tant qu'assistant...", ou "En tant que courtier au Maroc...".
   - Ne pas ajouter de salutations ou phrases de bienvenue si un dialogue est déjà engagé. Va droit à la réponse utile.

2. ADAPTATION LINGUISTIQUE NATURELLE (DARIJA / FRANÇAIS / ANGLAIS) :
   - Si la question est posée en Darija marocaine (en alphabet arabe ou latin/arabizi), réponds impérativement en Darija marocaine fluide, claire et professionnelle avec le vocabulaire d'assurance usuel au Maroc (ex: constat amiable, carte grise, rokhsat siya9a, wékala d'assurance, ta3wid, khlass d-prime, inzar, tachdid, etc.).
   - Si la question est en français, réponds en français juridique et technique impeccable.
   - Si la question est en anglais, réponds en anglais professionnel direct.

3. CONNAISSANCES MÉTIER ACAPS & CODE DES ASSURANCES MAROCAIN (LOI 17-99) :
   - Délais légaux de déclaration de sinistre (Article 20 de la Loi 17-99) :
     * Règle générale : 5 jours ouvrés à compter de la survenance du sinistre ou du moment où l'assuré en a eu connaissance.
     * Cas de vol : 24 à 48 heures ouvrées avec dépôt de plainte obligatoire auprès de la Police ou de la Gendarmerie Royale (PV de déclaration de vol).
     * Mortalité du bétail / grêle : 48 heures.
   - Sinistre Bris de Glace (dossier & pièces requises pour indemnisation) :
     * 1. Copie de la carte grise du véhicule (chahadat tasjil).
     * 2. Copie du permis de conduire valide au moment des faits.
     * 3. Attestation d'assurance en cours de validité (carte verte).
     * 4. Devis ou facture proforma de réparation/remplacement chez un vitrier agréé ou garage conventionné.
     * 5. Déclaration de sinistre bris de glace signée par l'assuré.
     * 6. Photos nettes des impacts ou fissures du vitrage avant toute intervention.
   - Impayés, Mise en demeure & Suspension (Articles 21 & 22 de la Loi 17-99) :
     * Mise en demeure (Inzar) : peut être notifiée au plus tôt 20 jours après l'échéance de la prime impayée (par lettre recommandée ou acte d'huissier).
     * Suspension de garantie : prend effet de plein droit 10 jours après l'expiration du délai de 20 jours de la mise en demeure (soit 30 jours au total après l'échéance). Durant cette suspension, aucun sinistre n'est pris en charge.
     * Résiliation : l'assureur a le droit de résilier le contrat 10 jours après la prise d'effet de la suspension si la quittance reste impayée.
     * Prime acquise : la prime correspondant à la période courue avant suspension reste légalement due au cabinet de courtage.
   - Fiscalité marocaine des primes : TVA 14%, Taxe parafiscale / CNPAC (~1%), Frais d'accessoires de police. Calcul précis Prime Nette -> Taxes -> Prime Totale TTC.
   - CRM / Bonus-Malus ACAPS : Barème officiel marocain (réduction maximale 50% après années sans sinistre, majoration en cas de sinistre responsable).

4. FORMAT DE RESTITUTION :
   - Format Markdown clair et aéré : titres en gras, listes à puces soignées, chiffres clés en évidence.
   - Termine OBLIGATOIREMENT ta réponse par 3 ou 4 suggestions de questions de suivi pertinentes, chacune sur une ligne séparée débutant impérativement par "[SUGGESTION] ".
Exemple :
[SUGGESTION] Délais de déclaration pour un sinistre vol
[SUGGESTION] Calculer la TVA 14% sur une prime nette de 5 000 DH
[SUGGESTION] Modèle de mise en demeure Article 21`;

/**
 * Formats multi-turn conversation messages for Google Generative AI (@google/generative-ai).
 * Ensures turns alternate properly and begins with a 'user' turn.
 */
function formatMessagesForGemini(messages: CopilotMessage[]): Content[] {
  const firstUserIdx = messages.findIndex((m) => m.role === 'user');
  if (firstUserIdx === -1) {
    const last = messages[messages.length - 1];
    return [{ role: 'user', parts: [{ text: last?.content || 'Bonjour' }] }];
  }

  const relevant = messages.slice(firstUserIdx);
  const formatted: Content[] = [];

  for (const m of relevant) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = (m.content || '').trim();
    if (!text) continue;

    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      const prevText = formatted[formatted.length - 1].parts[0]?.text || '';
      formatted[formatted.length - 1].parts[0] = {
        text: `${prevText}\n\n${text}`,
      };
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

/**
 * Parses suggested actions out of Gemini's response text.
 */
function extractSuggestions(rawText: string): { cleanText: string; suggestions: string[] } {
  const suggestions: string[] = [];
  const lines = rawText.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[SUGGESTION]') || trimmed.startsWith('[SUGGESTIONS]')) {
      const suggestionText = trimmed.replace(/^\[SUGGESTION(?:S)?\]\s*[:•\-]?\s*/i, '').trim();
      if (suggestionText.length > 0) {
        suggestions.push(suggestionText);
      }
    } else {
      cleanLines.push(line);
    }
  }

  const cleanText = cleanLines.join('\n').trim();
  return { cleanText, suggestions };
}

export async function POST(request: Request) {
  try {
    const body: CopilotChatRequest = await request.json();
    const messages: CopilotMessage[] = body.messages || [];

    // Early return for empty initial requests
    if (messages.length === 0) {
      const initialText =
        "Bonjour ! Je suis **InsurFlow Copilot**, votre assistant expert en courtage d'assurance au Maroc (ACAPS / Loi 17-99).\n\nComment puis-je vous assister aujourd'hui ?";
      return NextResponse.json({
        response: initialText,
        message: initialText,
        suggestedActions: [
          'Quelles sont les polices à renouveler ce mois ?',
          'Rédiger un email de relance de quittance impayée',
          'Explication franchise Tous Risques vs Tiers Collision',
          'Calculer la TVA 14% et le montant TTC',
        ],
      });
    }

    // ── 1. Vérification de la clé API ──────────────────────────────────────────
    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    const apiKey = rawKey.trim();

    if (!apiKey) {
      console.error('InsurFlow Copilot: La variable GEMINI_API_KEY est manquante.');
      return NextResponse.json(
        {
          error: 'Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY dans votre fichier .env ou les variables d’environnement.',
          message:
            '⚠️ La clé API Google Gemini n’est pas configurée. Veuillez renseigner **GEMINI_API_KEY** pour activer l’assistant.',
          response:
            '⚠️ La clé API Google Gemini n’est pas configurée. Veuillez renseigner **GEMINI_API_KEY** pour activer l’assistant.',
          suggestedActions: [],
        },
        { status: 500 }
      );
    }

    // ── 2. Initialisation du SDK GoogleGenerativeAI ────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const contents = formatMessagesForGemini(messages);

    // Modèle par défaut fixé à 'gemini-2.5-flash'
    const targetModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    let generatedText = '';

    // ── 3. Appel de génération avec gestion robuste des erreurs (Try / Catch) ──
    const isGoogle403Error = (err: any): boolean => {
      if (!err) return false;
      const status = err.status || err.statusCode || err.response?.status;
      if (status === 403) return true;
      const msg = String(err.message || '').toLowerCase();
      return (
        msg.includes('403') ||
        msg.includes('api_key_invalid') ||
        msg.includes('api key not valid') ||
        msg.includes('permission_denied') ||
        msg.includes('forbidden')
      );
    };

    try {
      const model = genAI.getGenerativeModel({
        model: targetModel,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      generatedText = response.text();
    } catch (primaryErr: any) {
      console.warn(
        `Échec de l'appel au modèle principal (${targetModel}):`,
        primaryErr?.message || primaryErr
      );

      // Détection spécifique d'une erreur 403 Google (clé API invalide ou non autorisée)
      if (isGoogle403Error(primaryErr)) {
        console.error('Google Gemini API Error 403 (Forbidden): Clé API refusée ou non autorisée par Google.');
        return NextResponse.json(
          {
            error: 'Google Gemini 403 Forbidden: La clé API fournie (GEMINI_API_KEY) a été refusée par Google (clé invalide, expirée ou non autorisée).',
            message:
              '⚠️ Accès refusé par Google Gemini (Erreur 403) : Votre clé API (GEMINI_API_KEY) est invalide ou non autorisée. Veuillez vérifier votre clé sur Google AI Studio.',
            response:
              '⚠️ **Accès refusé par Google Gemini (Erreur 403)** : La clé API configurée (`GEMINI_API_KEY`) a été refusée par Google (clé invalide ou expirée). Veuillez vérifier ou renouveler votre clé sur [Google AI Studio](https://aistudio.google.com/).',
            suggestedActions: [
              'Vérifier la variable GEMINI_API_KEY dans .env.local',
              'Obtenir une nouvelle clé sur Google AI Studio',
            ],
          },
          { status: 403 }
        );
      }

      // Modèles de secours en cas d'indisponibilité temporaire ou d'évolution d'API
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'].filter(
        (m) => m !== targetModel
      );

      let fallbackSuccess = false;
      for (const fallbackModelName of candidateModels) {
        try {
          console.info(`Tentative de fallback vers le modèle ${fallbackModelName}...`);
          const fallbackModel = genAI.getGenerativeModel({
            model: fallbackModelName,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
              temperature: 0.4,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          });

          const fallbackResult = await fallbackModel.generateContent({ contents });
          const fallbackResponse = await fallbackResult.response;
          generatedText = fallbackResponse.text();
          fallbackSuccess = true;
          break;
        } catch (fallbackErr: any) {
          console.warn(`Fallback vers ${fallbackModelName} a échoué:`, fallbackErr?.message || fallbackErr);
          if (isGoogle403Error(fallbackErr)) {
            return NextResponse.json(
              {
                error: 'Google Gemini 403 Forbidden: Clé API invalide ou non autorisée.',
                message:
                  '⚠️ Accès refusé par Google Gemini (Erreur 403) : Votre clé API (GEMINI_API_KEY) est invalide ou expirée.',
                response:
                  '⚠️ **Accès refusé par Google Gemini (Erreur 403)** : La clé API (`GEMINI_API_KEY`) a été refusée par Google.',
                suggestedActions: [
                  'Vérifier la variable GEMINI_API_KEY dans .env.local',
                  'Obtenir une nouvelle clé sur Google AI Studio',
                ],
              },
              { status: 403 }
            );
          }
        }
      }

      if (!fallbackSuccess) {
        return NextResponse.json(
          {
            error: `Erreur API Google Gemini: ${primaryErr?.message || 'Échec de génération'}`,
            message:
              '⚠️ Une erreur est survenue lors de la communication avec le modèle Gemini. Veuillez vérifier votre clé API ou réessayer.',
            response:
              '⚠️ Une erreur est survenue lors de la communication avec le modèle Gemini. Veuillez vérifier votre clé API ou réessayer.',
            suggestedActions: [
              'Quelles sont les polices à renouveler ce mois ?',
              'Rédiger un email de relance de quittance impayée',
              'Explication franchise Tous Risques vs Tiers Collision',
            ],
          },
          { status: 500 }
        );
      }
    }

    // ── 4. Extraction des suggestions dynamiques et formatage de la réponse ──
    const { cleanText, suggestions } = extractSuggestions(generatedText);

    const defaultSuggestions = [
      'Quelles sont les polices à renouveler ce mois ?',
      'Rédiger un email de relance de quittance impayée',
      'Explication franchise Tous Risques vs Tiers Collision',
      'Calculer la TVA 14% et le montant TTC',
    ];

    const finalSuggestions = suggestions.length > 0 ? suggestions.slice(0, 4) : defaultSuggestions;

    const output: CopilotChatResponse = {
      response: cleanText,
      message: cleanText,
      suggestedActions: finalSuggestions,
    };

    return NextResponse.json(output);
  } catch (error: any) {
    console.error('Erreur inattendue dans la route Copilot API:', error?.message || error);
    return NextResponse.json(
      {
        error: error?.message || 'Erreur interne du serveur lors de la communication avec le Copilot',
        message:
          '⚠️ Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
        response:
          '⚠️ Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
      },
      { status: 500 }
    );
  }
}
