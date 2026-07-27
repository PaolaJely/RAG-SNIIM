from langchain_openai import ChatOpenAI

import config


def get_deepseek_chat_model(temperature: float = 0.2) -> ChatOpenAI:
    """Cliente LLM DeepSeek usando la API compatible con OpenAI."""
    if not config.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY no está configurada para usar DeepSeek.")

    extra_body = {}
    if config.DEEPSEEK_THINKING_MODE in {"enabled", "disabled"}:
        extra_body["thinking"] = {"type": config.DEEPSEEK_THINKING_MODE}

    kwargs = {
        "model": config.DEEPSEEK_LLM_MODEL,
        "api_key": config.DEEPSEEK_API_KEY,
        "base_url": config.DEEPSEEK_BASE_URL,
        "temperature": temperature,
    }
    if extra_body:
        kwargs["extra_body"] = extra_body

    return ChatOpenAI(**kwargs)
