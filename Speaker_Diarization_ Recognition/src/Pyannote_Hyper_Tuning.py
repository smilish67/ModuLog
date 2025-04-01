
from pyannote.database import registry, FileFinder
from pyannote.audio import Model,Pipeline
from pyannote.audio.pipelines import SpeakerDiarization
from pyannote.pipeline import Optimizer
from pyannote.metrics.diarization import DiarizationErrorRate
from huggingface_hub import login
import torch
import os
import json
from time import time
from datetime import datetime

# 환경 설정
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

def timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log(msg):
    print(f"[{timestamp()}] {msg}")

# 데이터셋 로딩
registry.load_database("/home/hyebit/Hyebit/Projects/modulog/data/database.yml")
dataset = registry.get_protocol("MULTI.SpeakerDiarization.only_words", {"audio": FileFinder()})
dev_set = list(dataset.development())
test_set = list(dataset.test())

# 모델 리스트 (모델 경로, 저장 폴더명)
models = [
    ("Pyannote/finetune_nadam_cos_bce_dice_e50/epoch=43-loss-val=loss/val=0.4085.ckpt", "nadam_cos_bce_dice")
    ("Pyannote/nadam_data_aug/epoch=42-loss-val=loss/val=0.4152.ckpt", "nadam_cos_bcd_dice_data_aug")
]

# Hugging Face 로그인
login({Hugging Face Token})


pretrained_pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token={Hugging Face Token}}) 
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
pretrained_pipeline = pretrained_pipeline.to(device)


pretrained_hyperparameters = pretrained_pipeline.parameters(instantiated=True)


for model_ckpt, model_name in models:
    print(f"==== Processing model: {model_name} ====")
    
    # 모델 로드
    model = Model.from_pretrained(model_ckpt)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    finetuned_model = model.to(device)


    # 1단계: segmentation threshold 튜닝
    pipeline = SpeakerDiarization(
        segmentation=finetuned_model,
        clustering="AgglomerativeClustering",
    ).to(device)

    pipeline.freeze({"segmentation": {"min_duration_off": 0.0}})

    optimizer = Optimizer(pipeline)

    iterations = optimizer.tune_iter(dev_set, show_progress=True)

    # 최적 loss를 추적하기 위한 변수
    best_loss = 1.0

    for i, iteration in enumerate(iterations):
        print(f"Iteration {i} - Seg Threshold: {iteration['params']['segmentation']['threshold']}")
        if i > 50: break

    best_segmentation_threshold = optimizer.best_params["segmentation"]["threshold"]



    # 2단계: clustering threshold 튜닝
    pretrained_pipeline = SpeakerDiarization.from_pretrained("pyannote/speaker-diarization")
    
    pipeline = SpeakerDiarization(
        segmentation=finetuned_model,
        embedding=pretrained_pipeline.embedding,
        embedding_exclude_overlap=pretrained_pipeline.embedding_exclude_overlap,
        clustering=pretrained_pipeline.klustering,
    ).to(device)

    pipeline.freeze({
        "segmentation": {
            "threshold": best_segmentation_threshold,
            "min_duration_off": 0.0,
        },
        "clustering": {
            "method": "centroid",
            "min_cluster_size": 15,
        },
    })
    optimizer = Optimizer(pipeline)
    iterations = optimizer.tune_iter(dev_set, show_progress=False)
    for i, iteration in enumerate(iterations):
        print(f"Iteration {i} - Clust Threshold: {iteration['params']['clustering']['threshold']}")
        if i > 50: break
    best_clustering_threshold = optimizer.best_params['clustering']['threshold']


    # 3단계: 평가 및 저장
    finetuned_pipeline = SpeakerDiarization(
        segmentation=finetuned_model,
        embedding=pretrained_pipeline.embedding,
        embedding_exclude_overlap=pretrained_pipeline.embedding_exclude_overlap,
        clustering=pretrained_pipeline.klustering,
    ).to(device)

    finetuned_pipeline.instantiate({
        "segmentation": {
            "threshold": best_segmentation_threshold,
            "min_duration_off": 0.0,
        },
        "clustering": {
            "method": "centroid",
            "min_cluster_size": 15,
            "threshold": best_clustering_threshold,
        },
    })

    # DER 계산
    metric = DiarizationErrorRate()
    
    for file in test_set:
        file["finetuned pipeline"] = finetuned_pipeline(file)
        metric(file["annotation"], file["finetuned pipeline"], uem=file["annotated"])
    der_result = f"The finetuned pipeline '{model_name}' reaches a DER of {100 * abs(metric):.2f}% on {dataset.name} test set."
    print(der_result)

    # 결과 및 모델 저장
    save_dir = f"../pyannote_finetuned_saved_models/{model_name}"
    os.makedirs(save_dir, exist_ok=True)

    # 파라미터 저장
    final_params = {
        "segmentation": {
            "threshold": best_segmentation_threshold,
            "min_duration_off": 0.0,
        },
        "clustering": {
            "method": "centroid",
            "min_cluster_size": 15,
            "threshold": best_clustering_threshold,
        },
    }
    with open(f"{save_dir}/final_pipeline_params.json", "w") as f:
        json.dump(final_params, f, indent=2)

    # segmentation 모델 저장
    torch.save(finetuned_model.state_dict(), f"{save_dir}/segmentation_model.pt")

    print("✅ 저장 완료: 파라미터와 segmentation 모델")

    # DER 결과 텍스트 파일로 저장
    with open(f"{save_dir}/der_result.txt", "w") as f:
        f.write(der_result + "\n")