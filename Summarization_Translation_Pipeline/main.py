from Langchain_pipeline import RAGpipeline
from Langchain_pipeline import run_rag_pipeline
from translator05 import multilingual_pipeline
from summarize_pipeline import load_model_and_tokenizer, summarize_text
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

if __name__ == "__main__":
    # 🔧 여기서 어떤 기능을 실행할지 선택
    mode = input("실행할 모드를 선택하세요 ('chat' 또는 'translate'): ").strip().lower()
    
    model_name = "google/long-t5-tglobal-base"
    weights_path = "longt5_finetuned_using4096(Ep22).pth"

    input_text = """
    **Transformers Library:** The Transformers library provides a unified interface for more than 50 pre-trained models,
    simplifying the development of NLP applications. 
    **Hugging Face Transformers Community:** Hugging Face has fostered a vibrant online community where developers, 
    researchers, and AI enthusiasts can share their knowledge, code, and insights.
    
    很高兴见到你。 金组长，今天有什么事要见面呢？
    안녕하세요 오늘 날씨가 정말 좋아요 지금 공원에 가고 있어요 今天天气很好 我们去吃饭吧 배고파 죽겠어
    오늘 날씨는 今天 정말 좋아
     """

    tokenizer, model, device = load_model_and_tokenizer(model_name, weights_path)
    summary = summarize_text(input_text, tokenizer, model, device)

    print("=== Input ===")
    print(input_text[:300] + "...")  # 너무 길면 일부만 출력

    print("\n=== Summary ===")
    print(summary)
    
    # 회의록 전문
    # meeting_text = """
    # 문서의 내용은 오늘 회의에서 AI 윤리 기준 정비와 관련된 이슈가 주요하게 논의되었다는 것입니다.
    # 구체적으로는 기업 내부 데이터 활용 과 개인정보 보호의 균형을 맞추는 문제,
    # 그리고 설명 가능한 AI 시스템의 필요성에 대한 논의가 이루어졌습니다.
    # """

    if mode == "chat":
        query = input("무엇이든 물어보세요! : ")
        run_rag_pipeline(pdf_path=None, input_text= summary, query=query)  # 또는 PDF 경로 입력
    elif mode == "translate":
        result = multilingual_pipeline(summary)
        print("영문 : ",result['en'])
        print("한국어 : ",result['ko'])
        print("중국어 : ",result['zh'])
    else:
        print("❌ 지원되지 않는 모드입니다. 'chat' 또는 'translate' 중 선택하세요.")