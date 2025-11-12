# Plant AI Identification - Environment Setup

## 🌿 Overview

The Plant AI Identification feature uses AI vision models to automatically identify plants from layout photos. This document covers environment variable setup.

---

## 📋 Environment Variables

| Variable                       | Purpose                      | Cost      | Required | Where to Get     |
| ------------------------------ | ---------------------------- | --------- | -------- | ---------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 1.5 Flash (primary)   | **FREE**  | ✅ Yes   | Google AI Studio |
| `OPENAI_API_KEY`               | GPT-4o-mini (fallback)       | ~$0.0002  | Optional | OpenAI Platform  |
| `PLANTID_API_KEY`              | Plant.id API (high accuracy) | $0.05/req | Optional | Plant.id         |

**Cost Priority**: Gemini is FREE (15 requests/min, 1M tokens/day) - perfect for personal/small-scale use.

---

## 1️⃣ Google Gemini API Key (Recommended - FREE)

### Purpose

Gemini 1.5 Flash provides FREE plant identification with excellent accuracy. This is the primary model used.

### Free Tier Limits

- ✅ **15 requests per minute**
- ✅ **1 million tokens per day**
- ✅ **No credit card required**
- ✅ Perfect for personal plant tracking

**Typical usage**: 1 layout photo = ~1,500 tokens (500 input + 1,000 output)
**Daily capacity**: ~600 layout identifications per day (way more than needed!)

### Step-by-Step Setup

**Step 1: Get API Key**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** (or "Create API Key")
4. Click **"Create API key in new project"** (or select existing project)
5. Copy the key (starts with `AIza...`)

**Step 2: Add to Environment**

**Local development** - Add to `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your_actual_key_here
```

**Vercel deployment**:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. **Settings** → **Environment Variables**
4. Add new variable:
   - Key: `GOOGLE_GENERATIVE_AI_API_KEY`
   - Value: Your API key
   - Environments: ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**
6. Redeploy your application

**Step 3: Verify**

Test the API:

```bash
curl http://localhost:3000/api/identify-plants
```

Expected response:

```json
{
  "available": true,
  "providers": ["gemini"],
  "config": {
    "defaultModel": "gemini-1.5-flash",
    "maxImageSize": 768,
    "compressionQuality": 0.85
  }
}
```

---

## 2️⃣ OpenAI API Key (Optional Fallback)

### Purpose

Used as fallback if Gemini rate limits are exceeded. Not required but provides redundancy.

### Pricing

- **gpt-4o-mini vision**: $0.15/1M input tokens + $0.60/1M output tokens
- **Cost per layout**: ~$0.0002 (negligible)
- **Monthly estimate**: $2-5 for active usage

### Setup

**Step 1: Get API Key**

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in/create account
3. Click **"Create new secret key"**
4. Name it `fueille-plant-identification`
5. Copy the key (starts with `sk-...`)

**Step 2: Add to Environment**

```bash
# .env.local
OPENAI_API_KEY=sk-...your_actual_key_here
```

**Vercel**: Same process as Gemini key above.

---

## 3️⃣ Plant.id API Key (Optional - High Accuracy)

### Purpose

Specialized plant identification API with 10,000+ species database. Use for premium accuracy feature.

### Pricing

- ✅ **100 FREE identifications per month**
- Then: **$0.05 per identification**
- Good for: "Verify with Plant.id" premium feature

### Setup

**Step 1: Get API Key**

1. Go to [Plant.id](https://web.plant.id/plant-identification-api/)
2. Click **"Get API Key"**
3. Sign up for free account
4. Copy API key from dashboard

**Step 2: Enable in Configuration**

```bash
# .env.local
PLANTID_API_KEY=your_plantid_key_here
```

**Step 3: Enable Fallback (Optional)**

By default, Plant.id is disabled. To enable automatic fallback when Gemini confidence is low:

```typescript
// In your API call
{
  "config": {
    "enablePlantIdFallback": true,
    "plantIdConfidenceThreshold": 0.6
  }
}
```

---

## 🔧 Configuration Options

### Default Configuration

```typescript
{
  model: 'gemini-1.5-flash',      // FREE tier
  maxImageSize: 768,               // Resize to 768px max dimension
  compressionQuality: 0.85,        // 85% JPEG quality
  enablePlantIdFallback: false,    // Plant.id disabled by default
  plantIdConfidenceThreshold: 0.6, // Trigger Plant.id if confidence < 60%
  cacheResults: true,              // Cache in database
  cacheDurationDays: 30
}
```

### Custom Configuration Example

```typescript
// API call with custom settings
await fetch('/api/identify-plants', {
  method: 'POST',
  body: JSON.stringify({
    layoutId: 'abc123',
    imageUrl: 'https://...',
    autoCreatePlants: true,
    config: {
      model: 'gpt-4o-mini', // Use OpenAI instead
      maxImageSize: 1024, // Higher resolution
      enablePlantIdFallback: true, // Enable premium accuracy
    },
  }),
});
```

---

## 📊 Cost Comparison

### Scenario: 50 layouts per month

| Provider         | Free Tier | Cost/Layout | Monthly Cost          | Accuracy  |
| ---------------- | --------- | ----------- | --------------------- | --------- |
| **Gemini Flash** | ✅ Yes    | $0          | **$0**                | Good      |
| GPT-4o-mini      | ❌ No     | $0.0002     | $0.01                 | Good      |
| Plant.id         | 100 free  | $0.05       | $0 (within free tier) | Excellent |

### Scenario: 1000 layouts per month (heavy usage)

| Provider         | Monthly Cost | Notes                   |
| ---------------- | ------------ | ----------------------- |
| **Gemini Flash** | **$0**       | Still within free tier! |
| GPT-4o-mini      | $0.20        | Negligible cost         |
| Plant.id         | $45          | 100 free + 900 × $0.05  |

**Recommendation**: Start with Gemini (free). Enable Plant.id only for premium "Verify ID" button.

---

## 🧪 Testing the Setup

### 1. Check API Availability

```bash
# Check which providers are configured
curl http://localhost:3000/api/identify-plants

# Should return available: true
```

### 2. Test Plant Identification

```javascript
// From browser console or client code
const response = await fetch('/api/identify-plants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    layoutId: 'your-layout-id',
    imageUrl: 'https://example.com/garden.jpg',
    autoCreatePlants: true,
  }),
});

const result = await response.json();
console.log(result);
```

Expected success response:

```json
{
  "success": true,
  "plants": [
    {
      "name": "Monstera Deliciosa",
      "scientificName": "Monstera deliciosa",
      "description": "Large tropical plant with distinctive split leaves...",
      "careInstructions": "Bright indirect light, water when top 2 inches dry...",
      "confidence": 0.92,
      "source": "gemini"
    }
  ],
  "layoutId": "abc123",
  "createdPlantIds": ["plant_xyz"],
  "processingTimeMs": 2340
}
```

---

## 🚨 Troubleshooting

### "Plant identification not available"

**Cause**: No API keys configured

**Fix**: Add at least `GOOGLE_GENERATIVE_AI_API_KEY` to your environment

### "Quota exceeded" error

**Cause**: Exceeded Gemini's 15 requests/minute limit

**Fix**:

- Add `OPENAI_API_KEY` as fallback
- Wait 1 minute and retry
- Consider rate limiting in your UI

### "Invalid API key" error

**Fix**:

- Verify key is copied correctly (no extra spaces)
- Check key hasn't expired
- Regenerate key if needed

### Images not processing

**Cause**: Image too large or wrong format

**Fix**:

- Ensure images are JPEG/PNG
- Max size: 5MB (auto-compressed to 768px)
- Use PhotoCapture component for automatic compression

---

## 🔒 Security Best Practices

1. **Never commit API keys** - Use `.env.local` (already in `.gitignore`)
2. **Rotate keys regularly** - Every 90 days recommended
3. **Use separate keys** - Dev vs Production environments
4. **Monitor usage** - Check Google AI Studio dashboard monthly
5. **Set spending limits** - If using paid providers (OpenAI, Plant.id)

---

## 📚 Additional Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Plant.id API Documentation](https://web.plant.id/plant-identification-api/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)

---

## 💡 Tips for Best Results

1. **Photo Quality**: Well-lit photos with clear plant visibility get 90%+ accuracy
2. **Multiple Plants**: Works best with 1-5 plants per layout (more = slower)
3. **Cropping**: Closer crops of individual plants improve species identification
4. **Angle**: Top-down or 45° angle photos work better than side views
5. **Background**: Clean backgrounds improve detection accuracy

---

## ✅ Quick Start Checklist

- [ ] Get Google Gemini API key (FREE)
- [ ] Add `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`
- [ ] Test with `curl http://localhost:3000/api/identify-plants`
- [ ] Try "🔍 Identify Plants with AI" button in Layout Editor
- [ ] (Optional) Add OpenAI key for fallback
- [ ] (Optional) Add Plant.id key for premium accuracy

**That's it! You're ready to identify plants with AI.** 🌱
