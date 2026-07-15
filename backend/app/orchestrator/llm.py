import os
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

def get_llm():
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or "mock-key"
    if api_key == "mock-key":
        # Fallback to mock LLM for local development/testing without a valid key
        from langchain_core.language_models import FakeListChatModel
        class MockLLM(FakeListChatModel):
            def with_structured_output(self, schema):
                class MockStructuredLLM:
                    def invoke(self, prompt):
                        return schema(is_satisfactory=True, feedback="Good answer.", action="next_question", score=8)
                return MockStructuredLLM()
                
        questions = [
            "Can you explain the difference between mutability and immutability?",
            "What are the main principles of Object-Oriented Programming?",
            "Describe how garbage collection works in modern programming languages.",
            "What is a memory leak and how do you prevent it?",
            "Explain the concept of RESTful APIs.",
            "How does asynchronous programming work?",
            "What is the difference between a process and a thread?",
            "Explain the concept of Big O notation.",
            "What are the pros and cons of microservices?",
            "How do you ensure web application security?",
            "What is dependency injection?",
            "Can you explain the CAP theorem?",
            "What is the difference between SQL and NoSQL?",
            "How does a hash table work under the hood?",
            "Explain continuous integration and continuous deployment."
        ]
        return MockLLM(responses=questions)

    model_name = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

    return ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.7,
        google_api_key=api_key,
    )

class ProcessAnswerResult(BaseModel):
    is_satisfactory: bool = Field(description="True if the answer is satisfactory and no follow-up is needed, False otherwise.")
    feedback: str = Field(description="Internal feedback on the candidate's answer.")
    action: str = Field(description="Must be 'followup' or 'next_question'.")
    score: int = Field(description="Numerical score between 0 and 10 evaluating the candidate's answer performance on this complete question topic including any follow-ups (0=poor/incorrect, 10=excellent/comprehensive).", ge=0, le=10)
