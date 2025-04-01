import os
import torch
import lightning.pytorch as pl  # ✅ 최신 PyTorch Lightning 사용
from nemo.collections.asr.models import EncDecDiarLabelModel
from nemo.utils.exp_manager import exp_manager
from omegaconf import OmegaConf
from lightning.pytorch.strategies import DDPStrategy
from lightning.pytorch.callbacks import Callback

# ✅ GPU 연산 최적화 (Tensor Core 활성화)
torch.set_float32_matmul_precision("high")

# ✅ 설정 로드
ROOT = os.getcwd()
MODEL_CONFIG = os.path.join(ROOT, 'conf', 'msdd_5scl_15_05_50Povl_256x3x32x2.yaml')
config = OmegaConf.load(MODEL_CONFIG)

# ✅ 데이터 경로 설정
DATA_DIR = os.path.join(ROOT, 'data', 'kor')
SPLIT_DIR = os.path.join(DATA_DIR, 'splits/w10shift05step50')
MSDD_TRAIN_MANIFEST = os.path.join(SPLIT_DIR, "nemo_manifest_train_10window_50step.json")
MSDD_VALID_MANIFEST = os.path.join(SPLIT_DIR, "nemo_manifest_valid_10window_50step.json")

# ✅ 모델 설정 조정
config.model.batch_size = 5
config.trainer.max_epochs = 2
config.model.diarizer.speaker_embeddings.model_path = "titanet_large"

# ✅ 임베딩 저장 폴더 설정
TRAIN_EMB_DIR = os.path.join(SPLIT_DIR, "nemo_train_time_stamps")
VALID_EMB_DIR = os.path.join(SPLIT_DIR, "nemo_val_time_stamps")

config.model.train_ds.manifest_filepath = MSDD_TRAIN_MANIFEST
config.model.validation_ds.manifest_filepath = MSDD_VALID_MANIFEST
config.model.train_ds.emb_dir = TRAIN_EMB_DIR
config.model.validation_ds.emb_dir = VALID_EMB_DIR

# ✅ 체크포인트 및 로그 저장 폴더 설정
CHECKPOINT_DIR = os.path.join(ROOT, "checkpoints/w10shift05step50")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)
METRICS_LOG_FILE = os.path.join(CHECKPOINT_DIR, "metrics_log.txt")

# ✅ 기존 파일 사용 (speaker embedding model)
config.model.train_ds.emb_dir = os.path.join(SPLIT_DIR, "nemo_train_time_stamps")
config.model.validation_ds.emb_dir = os.path.join(SPLIT_DIR, "nemo_val_time_stamps")

# ✅ 기존 폴더 존재 여부 확인 (없으면 생성하지 않음)
if not os.path.exists(config.model.train_ds.emb_dir):
    raise FileNotFoundError(f"❌ Train embedding directory가 존재하지 않습니다: {config.model.train_ds.emb_dir}")
if not os.path.exists(config.model.validation_ds.emb_dir):
    raise FileNotFoundError(f"❌ Validation embedding directory가 존재하지 않습니다: {config.model.validation_ds.emb_dir}")

# ✅ exp_manager 설정 (체크포인트 생성 안 함)
exp_manager_config = config.get("exp_manager", None)
exp_manager_config.create_checkpoint_callback = False  # 🚀 변경된 부분 (중복 방지)


# ✅ 에폭별 모델 저장 및 성능 로깅 콜백
class SaveModelCallback(Callback):
    def on_validation_epoch_end(self, trainer, pl_module):
        epoch = trainer.current_epoch
        model_path = os.path.join(CHECKPOINT_DIR, f"epoch_{epoch}.nemo")

        # ✅ GPU 캐시 정리 (OOM 방지)
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

        # ✅ 모델 저장 시 GPU → CPU 이동 (OOM 방지)
        pl_module = pl_module.cpu()
        pl_module.save_to(model_path)
        pl_module = pl_module.cuda()

        print(f"📌 Epoch {epoch} 모델 저장 완료: {model_path}")

        # ✅ GPU 캐시 정리 (로그 저장 전)
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

        # ✅ 성능 기록 (val_loss, val_f1_acc)
        if trainer.callback_metrics:
            val_loss = trainer.callback_metrics.get("val_loss", None)
            val_f1_acc = trainer.callback_metrics.get("val_f1_acc", None)
            with open(METRICS_LOG_FILE, "a") as f:
                f.write(f"{epoch}\t{val_loss:.6f}\t{val_f1_acc:.6f}\n")
            print(f"📈 Epoch {epoch}: val_loss={val_loss:.6f}, val_f1_acc={val_f1_acc:.6f} (로그 저장 완료)")
            

# ✅ Trainer 설정 (3090 Ti 2개 활용 최적화)
trainer = pl.Trainer(
    strategy=DDPStrategy(find_unused_parameters=True),
    devices=2,  # 2개 GPU 사용
    accelerator="gpu",
    max_epochs=config.trainer.max_epochs,  # ✅ 총 3 epoch 학습
    #precision="32-true",  # ✅ AMP 적용 (속도 향상 및 OOM 방지)
    callbacks=[SaveModelCallback()],  # ✅ 콜백 추가 (에폭별 모델 저장 및 성능 로깅)
    logger=False,  # ✅ 로거 비활성화
    log_every_n_steps=10  # ✅ 로그 저장 빈도 조정 (메모리 절약)
)

# ✅ exp_manager 실행 (자동 체크포인트 저장 안 함)
exp_manager(trainer, exp_manager_config)


# ✅ NeMo 모델 초기화
msdd_model = EncDecDiarLabelModel(cfg=config.model, trainer=trainer)


msdd_model.setup_training_data(OmegaConf.create({
    "manifest_filepath": MSDD_TRAIN_MANIFEST,
    "emb_dir": TRAIN_EMB_DIR,
    "sample_rate": 16000,
    "soft_label_thres": 0.5,
    "emb_batch_size": 100,
    "batch_size": 5
}))
msdd_model.setup_validation_data(OmegaConf.create({
    "manifest_filepath": MSDD_VALID_MANIFEST,
    "emb_dir": VALID_EMB_DIR,
    "sample_rate": 16000,
    "soft_label_thres": 0.5,
    "emb_batch_size": 100,
    "batch_size": 5
}))


# ✅ 성능 기록을 위한 로그 파일 생성
with open(METRICS_LOG_FILE, "w") as f:
    f.write("Epoch\tval_loss\tval_f1_acc\n")

# ✅ 학습 시작
trainer.fit(msdd_model)

# ✅ 최종 모델 저장
MODEL_SAVE_PATH = os.path.join(ROOT, "checkpoints/w10shift05step50", "w10shift05step50_final.nemo")
msdd_model.save_to(MODEL_SAVE_PATH)

print(f"\n✅ 학습 완료! 최종 모델이 저장되었습니다: {MODEL_SAVE_PATH}")
print(f"📊 성능 로그 파일: {METRICS_LOG_FILE}")
