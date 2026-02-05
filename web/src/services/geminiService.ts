
import { GoogleGenAI } from "@google/genai";
import { LogEntry } from "../types";

// Always use named parameter for apiKey and obtain from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeLogs(logs: LogEntry[], query: string): Promise<string> {
  const context = logs.map(l => `[${l.timestamp}] ${l.level} ${l.source}: ${l.message}`).join('\n');
  
  const prompt = `
    You are an expert system administrator and security analyst for LOGify.
    
    Current System Logs context:
    ${context}
    
    User Question: ${query}
    
    Task:
    1. Analyze the patterns in the logs provided.
    2. If the user asks about an error, use Google Search to find specific documented fixes for these services (Nginx, Docker, etc.).
    3. Provide a concise, professional "holographic dashboard" style response.
    4. If a fix is found, provide the exact shell command or configuration change.
  `;

  try {
    // Using gemini-3-flash-preview for general analysis tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Setting thinkingBudget to 0 for lower latency in this real-time log viewer.
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    // Extracting text output from response.text property.
    let text = response.text || "No insights found for the current data stream.";

    // If Google Search is used, extract and display website URLs from groundingChunks.
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      const urls = chunks
        .map(chunk => chunk.web?.uri)
        .filter(Boolean) as string[];
      
      if (urls.length > 0) {
        const uniqueUrls = Array.from(new Set(urls));
        text += "\n\nSources:\n" + uniqueUrls.map(url => `- ${url}`).join('\n');
      }
    }

    return text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Neural link interrupted. Could not complete log analysis.";
  }
}
