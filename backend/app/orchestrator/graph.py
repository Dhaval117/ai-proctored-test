from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from .state import InterviewState
from .nodes import init_question_node, process_answer_node, generate_followup_node, generate_next_question_node
from app.config import MAX_MAIN_QUESTIONS

def route_after_process(state: InterviewState) -> str:
    if state.get("current_topic") == "next_question_requested":
        max_questions = state.get("num_questions", MAX_MAIN_QUESTIONS)
        if state.get("question_count", 0) >= max_questions:
            return "end"
        return "next_question"
    return "followup"

def build_graph():
    builder = StateGraph(InterviewState)
    
    builder.add_node("init_question", init_question_node)
    builder.add_node("process_answer", process_answer_node)
    builder.add_node("generate_followup", generate_followup_node)
    builder.add_node("generate_next_question", generate_next_question_node)
    
    builder.add_edge("init_question", "process_answer")
    builder.add_edge("generate_followup", "process_answer")
    builder.add_edge("generate_next_question", "process_answer")
    
    builder.add_conditional_edges(
        "process_answer",
        route_after_process,
        {
            "followup": "generate_followup",
            "next_question": "generate_next_question",
            "end": END
        }
    )
    
    builder.set_entry_point("init_question")
    
    # We use a memory saver to persist state between user interactions
    memory = MemorySaver()
    
    # Interrupt after AI generates a question so we can wait for user input
    graph = builder.compile(
        checkpointer=memory,
        interrupt_before=["process_answer"]
    )
    
    return graph

# Create a singleton instance for the app
exam_graph = build_graph()
