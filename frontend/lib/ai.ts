import api from './api';
import {
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotMessage,
  ClaimAnalysisRequest,
  ClaimAnalysisResponse,
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

/**
 * Analyzes an insurance claim statement / constat report for executive summary, liability, and fraud indicators.
 */
export async function analyzeClaim(request: ClaimAnalysisRequest): Promise<ClaimAnalysisResponse> {
  // First try Next.js local API route for direct Gemini processing
  try {
    const res = await fetch('/api/ai/claims-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (localErr) {
    console.warn('Next.js /api/ai/claims-analyzer failed, attempting Spring Boot backend fallback...', localErr);
  }

  // Fallback to Spring Boot backend
  try {
    const backendRes = await api.post<ClaimAnalysisResponse>('/ai/claims-analyzer', request);
    return backendRes.data;
  } catch (backendErr) {
    console.error('Both Next.js and backend Claims Analyzer calls failed:', backendErr);
    throw backendErr;
  }
}
