import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

def load_model_and_tokenizer(model_name: str, weights_path: str, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)
    
    state_dict = torch.load(weights_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    
    return tokenizer, model, device

def summarize_text(text: str, tokenizer, model, device, max_input_length=4096, max_output_tokens=1024):
    inputs = tokenizer(
        [text],
        return_tensors="pt",
        max_length=max_input_length,
        truncation=True
    ).to(device)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=max_output_tokens,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            early_stopping=True,
            num_beams=5
        )
    
    summary = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return summary