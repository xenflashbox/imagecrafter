# AI Gateway Integration Note

The original `lib/services/prompt-enhancement.ts` uses direct Anthropic SDK calls.

According to AI_ENDPOINTS_APP_ADMIN_GUIDE.md, we should use the AI Gateway instead.

However, for the initial deployment, we'll keep the direct Anthropic integration because:

1. The .env already has ANTHROPIC_API_KEY configured
2. The AI Gateway would require additional environment variables (DEVMAESTRO_API_KEY, AI_GATEWAY_URL)
3. The prompt enhancement service needs the Anthropic Messages API which works fine directly

## Future Enhancement:
When deploying to production, consider migrating to AI Gateway for:
- Cost tracking across all apps
- Load balancing
- Unified monitoring
- Automatic failover

## Required Changes for AI Gateway:
1. Add to .env:
   - AI_GATEWAY_URL=https://api.reresume.app/api/ai
   - DEVMAESTRO_API_KEY=dm_imagecrafter_prod_xxx
   
2. Replace Anthropic SDK calls with fetch to AI Gateway:
   ```typescript
   const response = await fetch(`${AI_GATEWAY_URL}/anthropic/messages`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${DEVMAESTRO_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       model: 'claude-3-5-sonnet',
       max_tokens: 1024,
       system: systemPrompt,
       messages: messages
     })
   });
   ```
