import api from './api';
import { getToken } from './auth';
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
 * Helper to build auth headers including Bearer token if available.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Evaluates underwriting risk and pricing recommendation using AI backend / route.
 */
export async function assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
  try {
    const res = await api.post<RiskAssessmentResponse>('/ai/risk-assessment', request, {
      withCredentials: true,
    });
    return res.data;
  } catch (error) {
    console.warn('Backend /api/ai/risk-assessment call failed, trying Next.js local route fallback...', error);
    try {
      const fallbackRes = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
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
 * Sends a conversation turn to InsurFlow Copilot.
 * Uses authenticated API client with Bearer token & session credentials,
 * with fallback to local Next.js route handler.
 */
export async function sendCopilotMessage(
  messages: CopilotMessage[],
  contextPage?: string
): Promise<CopilotChatResponse> {
  const payload: CopilotChatRequest = { messages, contextPage };

  // 1. First attempt: call via authenticated Axios API client (Bearer token + withCredentials)
  try {
    const res = await api.post<CopilotChatResponse>('/ai/copilot', payload, {
      withCredentials: true,
    });
    const data = res.data;
    const text = data.response || data.message || '';
    return {
      response: text,
      message: text,
      suggestedActions: data.suggestedActions || [],
    };
  } catch (apiError: any) {
    console.warn(
      'Primary API call to /api/ai/copilot failed, attempting Next.js local route fallback...',
      apiError?.response?.status || apiError?.message || apiError
    );

    // 2. Fallback attempt: direct fetch with Bearer token and credentials: 'include'
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.response || data.message || '';
        return {
          response: text,
          message: text,
          suggestedActions: data.suggestedActions || [],
        };
      }

      const errBody = await res.text().catch(() => '');
      console.error(`Copilot route responded with status ${res.status}: ${errBody}`);
    } catch (fallbackErr) {
      console.error('Fallback /api/ai/copilot route also failed:', fallbackErr);
    }

    throw apiError;
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
      headers: getAuthHeaders(),
      credentials: 'include',
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
    const backendRes = await api.post<ClaimAnalysisResponse>('/ai/claims-analyzer', request, {
      withCredentials: true,
    });
    return backendRes.data;
  } catch (backendErr) {
    console.error('Both Next.js and backend Claims Analyzer calls failed:', backendErr);
    throw backendErr;
  }
}
