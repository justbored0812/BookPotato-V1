import OpenAI from 'openai';

// Multi-provider image analysis service
export class ImageAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Try multiple AI providers in order of preference
  async analyzeBookshelfImage(base64Image: string): Promise<any> {
    const providers = [
      { name: 'OpenAI', method: this.analyzeWithOpenAI.bind(this) },
      { name: 'Google Vision', method: this.analyzeWithGoogleVision.bind(this) },
      { name: 'Anthropic Claude', method: this.analyzeWithAnthropic.bind(this) },
      { name: 'Gemini', method: this.analyzeWithGemini.bind(this) }
    ];

    let lastError = null;

    for (const provider of providers) {
      try {
        console.log(`📸 Trying ${provider.name} for image analysis...`);
        const result = await provider.method(base64Image);
        console.log(`✅ ${provider.name} analysis successful`);
        return { ...result, provider: provider.name };
      } catch (error: any) {
        console.log(`❌ ${provider.name} failed:`, error.message);
        lastError = error;
        
        // If quota exhausted, try next provider
        if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
          continue;
        }
        
        // If authentication issue, try next provider
        if (error.message?.includes('authentication') || error.message?.includes('API key')) {
          continue;
        }
      }
    }

    // All providers failed
    throw new Error(`All image analysis providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  // OpenAI Vision Analysis
  private async analyzeWithOpenAI(base64Image: string): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this bookshelf image and extract book details. Return a JSON object with this structure:
              {
                "books": [
                  {
                    "title": "Book Title",
                    "author": "Author Name", 
                    "genre": "Fiction/Non-Fiction/etc",
                    "description": "Brief description if visible"
                  }
                ]
              }
              
              Focus on clearly visible book spines. Only include books where you can read the title clearly.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  // Google Vision API Analysis
  private async analyzeWithGoogleVision(base64Image: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Google Vision API key not configured');
    }

    // Using Gemini for image analysis as a Google alternative
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: `Analyze this bookshelf image and extract book details. Return only a JSON object with this structure:
        {
          "books": [
            {
              "title": "Book Title",
              "author": "Author Name", 
              "genre": "Fiction/Non-Fiction/etc",
              "description": "Brief description if visible"
            }
          ]
        }
        
        Focus on clearly visible book spines. Only include books where you can read the title clearly.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            books: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  genre: { type: "string" },
                  description: { type: "string" }
                },
                required: ["title", "author"]
              }
            }
          },
          required: ["books"]
        }
      },
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg"
          }
        }
      ]
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('No response from Google Vision');
    }

    return JSON.parse(responseText);
  }

  // Anthropic Claude Analysis
  private async analyzeWithAnthropic(base64Image: string): Promise<any> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    const Anthropic = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic.default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Analyze this bookshelf image and extract book details. Return only a JSON object with this structure:
      {
        "books": [
          {
            "title": "Book Title",
            "author": "Author Name", 
            "genre": "Fiction/Non-Fiction/etc",
            "description": "Brief description if visible"
          }
        ]
      }
      
      Focus on clearly visible book spines. Only include books where you can read the title clearly.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this bookshelf image and extract book information as JSON."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return JSON.parse(content.text);
  }

  // Gemini Analysis (alternative method)
  private async analyzeWithGemini(base64Image: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg"
          }
        },
        `Analyze this bookshelf image and extract book details. Return a JSON object with this structure:
        {
          "books": [
            {
              "title": "Book Title",
              "author": "Author Name", 
              "genre": "Fiction/Non-Fiction/etc",
              "description": "Brief description if visible"
            }
          ]
        }
        
        Focus on clearly visible book spines. Only include books where you can read the title clearly.`
      ]
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    return JSON.parse(jsonMatch[0]);
  }
}

export const imageAnalysisService = new ImageAnalysisService();