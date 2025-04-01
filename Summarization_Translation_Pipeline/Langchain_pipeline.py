import os
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 환경 변수 로드
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class RAGpipeline:
    def __init__(self, pdf_path: str, chunk_size=1000, chunk_overlap=50, k=10, max_tokens=512):
        """
        RAG 파이프라인을 초기화합니다.
        - pdf_path: 처리할 PDF 문서 경로
        - chunk_size: 문서 분할 크기
        - chunk_overlap: 문서 분할 중 겹치는 부분 크기
        - k: 검색할 문서 개수
        - max_tokens: LLM 응답 최대 토큰 수
        """
        self.pdf_path = pdf_path
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.k = k
        self.max_tokens = max_tokens
        self.vectorstore = None
        self.retriever = None
        self.rag_chain = None
        
        self._load_and_process_pdf()
        self._setup_retriever()
        self._setup_rag_pipeline()

    @classmethod
    def from_text(cls, text: str, chunk_size=1000, chunk_overlap=50, k=10, max_tokens=512):
        """텍스트를 직접 입력받아 RAG 파이프라인을 생성하는 메서드"""
        instance = cls.__new__(cls)  # 빈 인스턴스 생성
        instance.pdf_path = None
        instance.chunk_size = chunk_size
        instance.chunk_overlap = chunk_overlap
        instance.k = k
        instance.max_tokens = max_tokens

        # 문서 → Document 객체 리스트로 변환
        documents = [Document(page_content=text)]

        # 텍스트 분할
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = splitter.split_documents(documents)

        # 임베딩
        embeddings = OpenAIEmbeddings(model="text-embedding-ada-002", openai_api_key=OPENAI_API_KEY)
        instance.vectorstore = FAISS.from_documents(chunks, embeddings)

        # 검색기 및 RAG 구성
        instance._setup_retriever()
        instance._setup_rag_pipeline()
        return instance
    
    def _load_and_process_pdf(self):
        """PDF 문서를 로드하고 텍스트를 분할하여 벡터 저장소를 구축한다."""
        # 문서 로드
        loader = PyMuPDFLoader(self.pdf_path)
        documents = loader.load()
        
        # 문서 분할
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap
        )
        chunks = text_splitter.split_documents(documents)

        # 임베딩 생성
        embeddings = OpenAIEmbeddings(model="text-embedding-ada-002", openai_api_key=OPENAI_API_KEY)
        self.vectorstore = FAISS.from_documents(chunks, embeddings)

    def _setup_retriever(self):
        # FAISS 기반 검색기 설정
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": self.k})

    def _setup_rag_pipeline(self):
        # RAG 파이프라인 구성
        prompt_template = PromptTemplate(
            input_variables=["context", "question"],
            template="""
            당신은 PDF 문서를 기반으로 사용자의 질문에 정확한 답변을 제공하는 AI입니다.
            만약 답변을 모른다면 모른다고 얘기하면 됩니다.

            문서 내용:
            {context}

            사용자 질문:
            {question}

            위 문서 내용을 참고하여 최대한 상세하고 관련성이 높은 답변을 제공하세요.
            """
        )

        llm = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0,
            openai_api_key=OPENAI_API_KEY,
            max_tokens=self.max_tokens
        )

        self.rag_chain = (
            {"context": self.retriever, "question": RunnablePassthrough()}
            | prompt_template
            | llm
            | StrOutputParser()
        )

    def ask(self, query: str):
        # RAG 시스템 사용자 답변 생성
        response = self.rag_chain.invoke(query)
        return response

def run_rag_pipeline(pdf_path=None, input_text=None, query=None):
    if pdf_path:
        print("📄 PDF 기반 RAG 파이프라인 실행")
        rag_system = RAGpipeline(pdf_path)
    else:
        print("📝 텍스트 기반 RAG 파이프라인 실행")
        if input_text is None:
            input_text = """
            어떠한 회의도 이루어지지 않았습니다.
            회의록을 다시 한번 검토해주세요!
            """
        rag_system = RAGpipeline.from_text(input_text)

    # query 직접 입력받기
    if query is None:
        print("\n❓ 요약이나 질문을 입력해주세요 (예: 오늘 회의 핵심 알려줘):")
        query = input("🗣️ 사용자 질문: ").strip()
        if not query:
            print("⚠️ 질문이 입력되지 않아 기본 질문으로 대체합니다.")
            query = "오늘 회의는 핵심이 뭐야?"

    response = rag_system.ask(query)
    print("\n💡 RAG 응답:")
    print(response)