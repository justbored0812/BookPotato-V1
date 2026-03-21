# Image Recognition AI Providers Guide

BookShare now supports multiple AI providers for image analysis to ensure reliable service when one provider is unavailable due to quota limits or other issues.

## Available Providers

### 1. OpenAI GPT-4o Vision (Primary)
- **Best for**: High-quality book spine recognition
- **Advantages**: Excellent text recognition, understands context
- **API Key Required**: `OPENAI_API_KEY`
- **Website**: https://platform.openai.com/
- **Cost**: ~$0.01-0.05 per image

### 2. Google Gemini 2.5 Pro (Secondary)
- **Best for**: Reliable fallback with good accuracy
- **Advantages**: Fast processing, good multilingual support
- **API Key Required**: `GEMINI_API_KEY`
- **Website**: https://ai.google.dev/
- **Cost**: Free tier available, then pay-per-use

### 3. Anthropic Claude Sonnet 4.0 (Tertiary)
- **Best for**: Detailed analysis and accuracy
- **Advantages**: Very accurate, good at reading complex text
- **API Key Required**: `ANTHROPIC_API_KEY`
- **Website**: https://console.anthropic.com/
- **Cost**: ~$0.003-0.015 per image

### 4. Alternative Free Options

#### Tesseract.js (Client-side OCR)
- **Best for**: Basic text extraction from clear images
- **Advantages**: Free, works offline, no API keys needed
- **Limitations**: Less accurate for complex layouts
- **Implementation**: Already available in barcode scanner

#### Google Vision API
- **Best for**: Professional OCR and text detection
- **API Key Required**: Google Cloud Vision API key
- **Website**: https://cloud.google.com/vision
- **Cost**: $1.50 per 1000 images

## How to Add API Keys

### Option 1: Environment Variables (Recommended)
```bash
# Add to your .env file or Replit Secrets
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Option 2: Via Replit Secrets
1. Go to Replit Secrets in your project
2. Add each API key as a secret
3. Restart your application

## Provider Fallback Order

The system automatically tries providers in this order:

1. **OpenAI GPT-4o** (if `OPENAI_API_KEY` is available)
2. **Google Gemini** (if `GEMINI_API_KEY` is available)
3. **Anthropic Claude** (if `ANTHROPIC_API_KEY` is available)
4. **Fallback Mode** (manual entry suggested)

## Quick Setup Guide

### Get OpenAI API Key (Primary - Recommended)
1. Visit https://platform.openai.com/
2. Create account → Go to API keys
3. Create new key → Copy key
4. Add as `OPENAI_API_KEY` in Secrets

### Get Google Gemini API Key (Free Alternative)
1. Visit https://ai.google.dev/
2. Get API key → Sign in with Google
3. Create new project → Enable Gemini API
4. Copy API key → Add as `GEMINI_API_KEY`

### Get Anthropic API Key (Professional Alternative)
1. Visit https://console.anthropic.com/
2. Create account → API Keys section
3. Create new key → Copy key
4. Add as `ANTHROPIC_API_KEY` in Secrets

## Benefits of Multi-Provider System

✅ **High Availability**: If one provider is down, others take over
✅ **Cost Optimization**: Use cheaper providers when possible
✅ **Quality Assurance**: Different providers excel at different image types
✅ **Quota Management**: Distribute load across multiple services
✅ **Redundancy**: Never lose functionality due to single provider issues

## Usage Tips

1. **For Best Results**: Use clear, well-lit photos with readable book spines
2. **Multiple Providers**: Having 2-3 API keys ensures maximum uptime
3. **Free Tiers**: Start with Google Gemini free tier for testing
4. **Professional Use**: OpenAI generally provides the best accuracy

## Current Status

The app automatically detects which providers are available and uses them intelligently. No user action required - the system handles provider switching seamlessly.

## Troubleshooting

**"AI Analysis Unavailable"**: 
- Add at least one API key from the providers above
- Check that API keys are correctly added to Secrets
- Verify API key permissions and quotas

**"Quota Exhausted"**:
- The system will automatically try alternative providers
- Consider adding multiple API keys for redundancy
- Check your usage limits on provider websites