# AI Endpoints Integration Guide for App Admins

**Last Updated**: October 8, 2025
**Status**: Production Ready
**Target Audience**: ReResume, BlogCraft, and other app administrators

---

## Quick Start

You now have access to a **unified AI gateway** that provides:
- ✅ Multiple AI models (Claude, GPT-4, Grok, Perplexity)
- ✅ Automatic cost tracking
- ✅ Load balancing and failover
- ✅ Usage analytics per organization

**You need only 3 things**:
1. Your API key (get from cluster admin)
2. Your vanity domain endpoint URL
3. The request format (OpenAI or Anthropic)

---

## Step 1: Get Your API Key

Contact the **MCP Cluster Administrator** to create your organization's API key.

**What you'll receive**:
```
Organization: ReResume (or BlogCraft, etc.)
API Key: dm_reresume_prod_abc123def456...
Format: Bearer token
```

**Store securely** in your environment variables:
```bash
# For Inngest functions
DEVMAESTRO_API_KEY=dm_reresume_prod_abc123def456...

# Or in Vercel/Railway
AI_GATEWAY_KEY=dm_reresume_prod_abc123def456...
```

---

## Step 2: Endpoint URLs

You can use **either**:

### Option A: Your Vanity Domain (Recommended)
```
https://api.reresume.app/api/ai/chat/completions
https://api.blogcraft.app/api/ai/chat/completions
```

### Option B: Direct API Server
```
http://10.8.8.12:19000/api/ai/chat/completions
```

**Both point to the same load-balanced FastAPI servers** (ports 19000 and 19002).

---

## Step 3: Available Endpoints

### Chat Completions (OpenAI Format)
**Best for**: Chat interfaces, most AI SDKs
```
POST /api/ai/chat/completions
```

### Anthropic Messages (Native Format)
**Best for**: Claude-specific features, streaming
```
POST /api/ai/anthropic/messages
```

### List Available Models
```
GET /api/ai/models
```

### Usage Statistics
```
GET /api/ai/usage?from_date=2025-10-01&to_date=2025-10-31
```

### Health Check
```
GET /api/ai/health
```

---

## Step 4: Integration Examples

### A. Inngest Function (Recommended for Backend AI)

#### For ReResume - Resume Generation
```typescript
// inngest/functions/generate-resume.ts
import { inngest } from "./client";

export const generateResume = inngest.createFunction(
  { id: "generate-resume" },
  { event: "resume/generate" },
  async ({ event, step }) => {

    // Call AI Gateway
    const aiResponse = await step.run("generate-summary", async () => {
      const response = await fetch("https://api.reresume.app/api/ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEVMAESTRO_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet",  // or gpt-4o, claude-3-opus
          messages: [
            {
              role: "system",
              content: "You are a professional resume writer."
            },
            {
              role: "user",
              content: `Generate a resume summary for: ${event.data.userProfile}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      return await response.json();
    });

    const resumeSummary = aiResponse.choices[0].message.content;

    // Save to database
    await step.run("save-resume", async () => {
      // Your database logic here
    });

    return { success: true, summary: resumeSummary };
  }
);
```

#### For BlogCraft - Content Generation
```typescript
// inngest/functions/generate-blog-post.ts
import { inngest } from "./client";

export const generateBlogPost = inngest.createFunction(
  { id: "generate-blog-post" },
  { event: "blog/generate" },
  async ({ event, step }) => {

    const content = await step.run("generate-content", async () => {
      const response = await fetch("https://api.blogcraft.app/api/ai/anthropic/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEVMAESTRO_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Write a blog post about: ${event.data.topic}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      return await response.json();
    });

    const blogText = content.content[0].text;

    return { success: true, content: blogText };
  }
);
```

---

### B. Frontend Chat Interface (React/Next.js)

#### Chat Component with Model Selection
```typescript
// components/AIChatInterface.tsx
'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AVAILABLE_MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku (Fast)', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)', provider: 'OpenAI' },
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xAI' },
];

export default function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Model Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">AI Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {AVAILABLE_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="font-semibold text-sm mb-1">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 p-4 rounded mr-auto max-w-[80%]">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

#### API Route Handler (Next.js App Router)
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { model, messages } = await req.json();

    // Call AI Gateway
    const response = await fetch('https://api.reresume.app/api/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEVMAESTRO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
```

#### API Route Handler (Next.js Pages Router)
```typescript
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, messages } = req.body;

    const response = await fetch('https://api.blogcraft.app/api/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEVMAESTRO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json({
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
}
```

---

## Step 5: Available Models

| Model ID | Provider | Best For | Speed | Cost |
|----------|----------|----------|-------|------|
| `claude-3-5-sonnet` | Anthropic | General tasks, coding | Fast | $$ |
| `claude-3-opus` | Anthropic | Complex reasoning | Slow | $$$$ |
| `claude-3-haiku` | Anthropic | Quick responses | Very Fast | $ |
| `gpt-4o` | OpenAI | Multimodal, general | Fast | $$ |
| `gpt-4o-mini` | OpenAI | Simple tasks | Very Fast | $ |
| `grok-beta` | xAI | Experimental | Medium | $$ |
| `perplexity-sonar-large` | Perplexity | Web search, research | Medium | $$ |

**Recommendation for chat interfaces**: Start with `claude-3-5-sonnet` or `gpt-4o`

---

## Step 6: Request/Response Formats

### OpenAI Format (Recommended)

**Request**:
```json
{
  "model": "claude-3-5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1728408000,
  "model": "claude-3-5-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 8,
    "total_tokens": 23
  }
}
```

### Anthropic Format (Claude-specific features)

**Request**:
```json
{
  "model": "claude-3-5-sonnet",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

**Response**:
```json
{
  "id": "msg-xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-3-5-sonnet",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 25
  }
}
```

---

## Step 7: Streaming Responses (Optional)

For real-time chat interfaces, use streaming:

```typescript
// Frontend streaming example
const sendStreamingMessage = async () => {
  const response = await fetch('/api/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      messages: [...messages, { role: 'user', content: input }],
      stream: true
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let assistantMessage = '';

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content || '';
        assistantMessage += content;

        // Update UI in real-time
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg?.role === 'assistant') {
            lastMsg.content = assistantMessage;
          } else {
            newMessages.push({ role: 'assistant', content: assistantMessage });
          }
          return newMessages;
        });
      }
    }
  }
};
```

---

## Step 8: Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEVMAESTRO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 401) {
      console.error('Invalid API key');
      throw new Error('Authentication failed');
    }

    if (response.status === 429) {
      console.error('Rate limit exceeded');
      throw new Error('Too many requests, please try again later');
    }

    throw new Error(error.detail || 'AI request failed');
  }

  return await response.json();

} catch (error) {
  console.error('AI Gateway error:', error);
  // Show user-friendly error message
  throw error;
}
```

---

## Step 9: Environment Variables

### For Inngest Functions
```bash
# .env
DEVMAESTRO_API_KEY=dm_your_api_key_here
AI_GATEWAY_URL=https://api.reresume.app/api/ai
```

### For Next.js Frontend
```bash
# .env.local (server-side only)
DEVMAESTRO_API_KEY=dm_your_api_key_here

# Public environment variable (if needed for client-side)
NEXT_PUBLIC_AI_GATEWAY_URL=https://api.reresume.app/api/ai
```

**⚠️ IMPORTANT**: Never expose your API key on the client side. Always proxy through your API routes.

---

## Step 10: Cost Tracking

All your requests are automatically tracked. To view usage:

```typescript
// Get usage stats
const getUsageStats = async () => {
  const response = await fetch(
    'https://api.reresume.app/api/ai/usage?from_date=2025-10-01&to_date=2025-10-31',
    {
      headers: {
        'Authorization': `Bearer ${process.env.DEVMAESTRO_API_KEY}`
      }
    }
  );

  const usage = await response.json();
  console.log('Total cost:', usage.total_cost);
  console.log('Requests:', usage.total_requests);
  console.log('By model:', usage.by_model);
};
```

---

## Architecture Overview

```
┌──────────────────┐
│  Your App        │
│  (ReResume/      │
│   BlogCraft)     │
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────────────┐
│ Vanity Domain    │
│ api.reresume.app │  ◄─── Your apps use this
│ api.blogcraft.app│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ FastAPI Server   │
│ Load Balanced    │
│ Ports 19000/2    │  ◄─── Internal servers
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ LiteLLM Proxy    │
│ 10.8.8.14:4000   │  ◄─── Routes to AI providers
└────────┬─────────┘
         │
    ┌────┴────┬────────┬─────────┐
    ▼         ▼        ▼         ▼
┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐
│Anthropic│ │OpenAI│ │ Grok │ │Perplexity│
└────────┘ └──────┘ └──────┘ └─────────┘
```

---

## Testing Your Integration

### 1. Test Health Endpoint
```bash
curl https://api.reresume.app/api/ai/health
```

Should return:
```json
{
  "status": "healthy",
  "litellm_proxy": "http://10.8.8.14:4000",
  "timestamp": "2025-10-08T..."
}
```

### 2. Test Chat Completion
```bash
curl -X POST https://api.reresume.app/api/ai/chat/completions \
  -H "Authorization: Bearer dm_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

### 3. Test Model Listing
```bash
curl https://api.reresume.app/api/ai/models \
  -H "Authorization: Bearer dm_your_api_key_here"
```

---

## FAQ

**Q: Which endpoint should I use?**
A: Use your vanity domain (e.g., `https://api.reresume.app`) for all production code.

**Q: Which format should I use - OpenAI or Anthropic?**
A: Use OpenAI format (`/chat/completions`) unless you need Claude-specific features. It's compatible with most AI SDKs.

**Q: Can I test different models easily?**
A: Yes! Just change the `model` parameter in your request. All models use the same endpoint and format.

**Q: How do I get an API key?**
A: Contact the MCP Cluster Administrator. They'll create an org-specific key for you.

**Q: What if I exceed my budget?**
A: Contact the cluster admin to set up budget limits and alerts for your organization.

**Q: Can I use this in Inngest functions?**
A: Yes! See the Inngest examples above. Perfect for background AI processing.

**Q: Can I use streaming for real-time chat?**
A: Yes! Add `"stream": true` to your request and handle the SSE response. See streaming example above.

**Q: Where can I see my usage?**
A: Use the `/api/ai/usage` endpoint or ask the cluster admin for dashboard access.

---

## Getting Help

**For API Keys**: Contact MCP Cluster Administrator
**For Integration Issues**: Check error responses, verify your API key
**For Model Questions**: Refer to the models table above
**For Cost Questions**: Use the `/api/ai/usage` endpoint

---

## Summary Checklist

- [ ] Get API key from cluster admin
- [ ] Add API key to environment variables
- [ ] Choose your endpoint URL (vanity domain recommended)
- [ ] Implement API route handler (see examples above)
- [ ] Build frontend chat interface (see React example)
- [ ] Add model selection dropdown
- [ ] Implement error handling
- [ ] Test with multiple models
- [ ] Monitor usage and costs

**You're ready to integrate AI into your app!** 🚀
