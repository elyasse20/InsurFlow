import api from './api';
import {
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotMessage,
} from '@/types';

/**
 * Evaluates underwriting risk and pricing recommendation using AI backend / route.
 */
export async function assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
  try {
    const res = await api.post<RiskAssessmentResponse>('/ai/risk-assessment', request);
    return res.data;
  } catch (error) {
    console.warn('Backend /api/ai/risk-assessment call failed, trying Next.js local route fallback...', error);
    try {
      const fallbackRes = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }
    } catch (fallbackErr) {
      console.error('Fallback AI evaluation also failed:', fallbackErr);
    }
    throw error;
  }
}

/**
 * Sends a conversation turn to InsurFlow Copilot directly via Next.js route (/api/ai/copilot).
 */
export async function sendCopilotMessage(
  messages: CopilotMessage[],
  contextPage?: string
): Promise<CopilotChatResponse> {
  const payload: CopilotChatRequest = { messages, contextPage };

  try {
    // Call the Next.js API route directly to use Google Gemini integration
    const res = await fetch('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Copilot route responded with status ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data.response || data.message || '';
    return {
      response: text,
      message: text,
      suggestedActions: data.suggestedActions || [],
    };
  } catch (error) {
    console.error('Error calling /api/ai/copilot route:', error);
    throw error;
  }
}
