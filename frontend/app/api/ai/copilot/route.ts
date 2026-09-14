import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { CopilotChatRequest, CopilotChatResponse, CopilotMessage } from '@/types';

const SYSTEM_PROMPT = `You are InsurFlow Copilot, an expert Moroccan Insurance Broker Advisor & Actuarial Assistant (Cabinet de Courtage d'Assurance, operating strictly under ACAPS regulations and Code des Assurances Loi n° 17-99).

Core Responsibilities:
1. Multi-lingual Adaptation: Always detect and respond in the EXACT same language as the user's latest query (French, English, or Moroccan Darija/Arabic).
2. Broker Expertise: Provide professional, precise, and practical advice for insurance brokers, agents, and portfolio managers.
3. Regulations & Legal Framework:
   - ACAPS (Autorité de Contrôle des Assurances et de la Prévoyance Sociale)
   - Code des Assurances (Loi n° 17-99)
   - Article 21 & 22: Non-payment procedures (20-day formal notice before suspension of coverage, 30 days before contract cancellation)
   - Bonus-Malus rating system (Coefficient de Réduction-Majoration CRM)
   - Claims management: Constat amiable declaration deadlines (5 business days, 24h in case of theft), third-party collision vs comprehensive (Tous Risques), subrogation rights.
4. Calculations & Actuarial Support:
   - Moroccan insurance tax structure: TVA on premiums (14%), parafiscal taxes / CNPAC (~1%), policy accessories (frais d'accessoires).
   - Clear breakdown from Prime Nette (HT) to Prime Totale TTC à encaisser.
5. Communication & Drafting:
   - Draft formal client emails, payment reminders, formal notice letters (mises en demeure), and coverage summaries.
   - Tailor documents with specific client names, policy numbers, or MAD amounts if provided.

Format Guidelines:
- Use clear markdown with bold headers, bullet points, and code blocks for amounts/RIBs where appropriate.
- At the very end of your response, provide 3 to 4 helpful follow-up action prompts relevant to the conversation. Format them on separate lines starting with "[SUGGESTION] ":
Example:
[SUGGESTION] Rédiger un email de relance de quittance impayée
[SUGGESTION] Calculer la prime TTC avec TVA 14%
[SUGGESTION] Explication franchise Tous Risques vs Tiers`;

/**
 * Formats multi-turn conversation messages for Google Generative AI.
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

    // ── 1. Check GEMINI_API_KEY from Environment Variables ─────────────────
    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    const apiKey = rawKey.trim();

    if (!apiKey) {
      console.error('InsurFlow Copilot: GEMINI_API_KEY environment variable is not configured.');
      return NextResponse.json(
        {
          error: 'Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY dans votre fichier .env ou les variables d’environnement.',
          message:
            '⚠️ La clé API Google Gemini n’est pas configurée sur le serveur. Veuillez définir **GEMINI_API_KEY** pour activer l’assistant IA en direct.',
          suggestedActions: [],
        },
        { status: 500 }
      );
    }

    // ── 2. Initialize Google Generative AI SDK (@google/generative-ai) ─────
    const genAI = new GoogleGenerativeAI(apiKey);
    const contents = formatMessagesForGemini(messages);

    let generatedText = '';
    let usedModel = 'gemini-1.5-flash';

    // ── 3. Attempt Gemini 1.5 Flash (Primary) ──────────────────────────────
    try {
      const flashModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const result = await flashModel.generateContent({ contents });
      generatedText = result.response.text();
    } catch (flashErr: any) {
      console.warn(
        'Gemini 1.5 Flash call failed, falling back to gemini-1.5-pro:',
        flashErr?.message || flashErr
      );

      // ── 4. Fallback to Gemini 1.5 Pro ────────────────────────────────────
      try {
        usedModel = 'gemini-1.5-pro';
        const proModel = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro',
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.4,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        const result = await proModel.generateContent({ contents });
        generatedText = result.response.text();
      } catch (proErr: any) {
        console.error('Gemini 1.5 Pro fallback also failed:', proErr?.message || proErr);
        throw new Error(
          `Google Gemini API Error: ${proErr?.message || flashErr?.message || 'Échec de la génération IA'}`
        );
      }
    }

    // ── 5. Parse Response & Extract Dynamic Suggestions ────────────────────
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
    console.error('Error in Copilot API route:', error?.message || error);
    return NextResponse.json(
      {
        error: error?.message || 'Erreur lors de la génération de la réponse du Copilot',
        message:
          '⚠️ Une erreur est survenue lors de la communication avec le modèle Gemini. Veuillez vérifier votre clé API ou réessayer.',
      },
      { status: 500 }
    );
  }
}
