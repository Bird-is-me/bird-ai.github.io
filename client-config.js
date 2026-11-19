// Public browser configuration only. Do not add passwords or API keys here.
window.BIRD_CONFIG = Object.freeze({
  api: {
    auth: "/api/auth",
    chat: "/api/chat",
    chats: "/api/chats",
    models: "https://openrouter.ai/api/v1/models?sort=most-popular"
  },
  defaultModel: "openai/gpt-4o-mini"
});
