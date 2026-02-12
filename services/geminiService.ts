
import { GoogleGenAI } from "@google/genai";

export async function askGeminiAssistant(prompt: string) {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        systemInstruction: `Sei l'assistente IA di Doora, un'app P2P per condomini. 
        Aiuti gli utenti con consigli logistici, risoluzione di conflitti tra vicini, 
        o spiegazioni su come funziona il servizio. Sii gentile, professionale e utile.
        Usa sempre un tono amichevole e parla in italiano.`
      }
    });
    
    // Using .text property directly instead of text() method
    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Graceful error handling for common API issues
    if (error?.message?.includes("Requested entity was not found")) {
      return "Errore di configurazione dell'API Key. Assicurati che il progetto sia configurato correttamente.";
    }
    return "Mi dispiace, ho avuto un problema tecnico. Riprova più tardi.";
  }
}
