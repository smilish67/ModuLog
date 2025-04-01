import openai
import re
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from langdetect import detect, LangDetectException
from dotenv import load_dotenv
import os

# 환경 변수 로드
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# MBART 모델 로드 (다국어 후속 번역용)
model_name = "facebook/mbart-large-50-many-to-many-mmt"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# 언어 코드 매핑 (MBART용)
lang_code_map_mbart = {
    "ko": "ko_KR",
    "zh": "zh_CN",
    "en": "en_XX"
}

# ✅ GPT 기반 혼합언어 → 번역

# 최신 버전용 GPT 호출 함수 (openai>=1.0.0 대응)
def gpt_translate_mixed(text, target_lang="en"):
    system_prompt = "You are a professional translator that understands multilingual and code-switched sentences."
    user_prompt = f"""Please translate the following text into {target_lang.upper()}.
This text may contain Korean, Chinese, or English mixed in a single sentence.
Make sure to preserve the meaning and produce fluent, natural output.

Text:
{text}"""

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

# ✅ 영어 → 다국어 (한국어, 중국어)

def translate_from_en(text, target_lang):
    assert target_lang in ["ko", "zh"], "지원 언어: ko (한국어), zh (중국어)"
    tgt_lang_code = lang_code_map_mbart[target_lang]
    tokenizer.src_lang = lang_code_map_mbart["en"]
    encoded = tokenizer(text, return_tensors="pt")
    output = model.generate(
        **encoded,
        forced_bos_token_id=tokenizer.lang_code_to_id[tgt_lang_code]
    )
    return tokenizer.decode(output[0], skip_special_tokens=True)

# ✅ 전체 파이프라인 함수

def multilingual_pipeline(text):
    # print("📌 원문:\n", text)

    # Step 1: 혼합언어 → 영어 번역 (GPT)
    english_text = gpt_translate_mixed(text)

    # Step 2: 영어 → 한국어/중국어 번역 (요약 없이 바로)
    korean = translate_from_en(english_text, "ko")
    chinese = translate_from_en(english_text, "zh")

    # print("\n🇰🇷 한국어 요약:\n", korean)
    # print("\n🇨🇳 중국어 요약:\n", chinese)

    return {
        "en": english_text,
        "ko": korean,
        "zh": chinese
    }

