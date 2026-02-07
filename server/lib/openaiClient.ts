/**
 * OpenAI is intentionally disabled for initial AWS deployment.
 * Enable later by implementing this module + adding OPENAI_API_KEY in App Runner.
 */
export function getOpenAI() {
  return null as any;
}
