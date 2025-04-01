import os
import torch
import shutil
from huggingface_hub import login
from pyannote.audio import Model
from pyannote.audio import Pipeline
from pyannote.audio.tasks import Segmentation, SpeakerDiarization
from pyannote.database import registry, FileFinder
from pyannote.metrics.diarization import DiarizationErrorRate
from pytorch_lightning import Trainer
from pytorch_lightning import Callback
from pytorch_lightning.callbacks import (
    EarlyStopping,
    ModelCheckpoint,
    RichProgressBar,
)
from torch.optim import AdamW, Adam, RAdam, Optimizer, NAdam
from types import MethodType
from pytorch_lightning.loggers import CSVLogger

# 현재 스크립트 위치 기반으로 경로 설정
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
PYANNOTE_DIR = os.path.join(DATA_DIR, "Pyannote")
os.makedirs(PYANNOTE_DIR, exist_ok=True)

# Hugging Face 로그인
login({Hugging Face TOKEN})

# Pyannote 데이터베이스 설정
registry.load_database(os.path.join(DATA_DIR, "database.yml"))
dataset = registry.get_protocol("MULTI.SpeakerDiarization.only_words", {"audio": FileFinder()})


# 모델 불러오기
model = Model.from_pretrained("pyannote/segmentation-3.0", use_auth_token={Hugging Face TOKEN})
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)

# Segmentation Task 설정
task = Segmentation(
    dataset, 
    duration=model.specifications.duration, 
    max_num_speakers=len(model.specifications.classes), 
    batch_size=64,
    num_workers=16, 
    loss="bce+dice", 
    vad_loss="bce")
model.task = task
model.prepare_data()
model.setup()


from torch.optim.lr_scheduler import CosineAnnealingLR

def configure_optimizers(self):
    optimizer = NAdam(self.parameters(), lr=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=50)
    return [optimizer], [scheduler]

# 모델의 configure_optimizers를 적용
model.configure_optimizers = MethodType(configure_optimizers, model)

# 체크포인트 설정
CHECKPOINT_DIR = os.path.join(PYANNOTE_DIR, "ckpt")
LOG_FILE = os.path.join(PYANNOTE_DIR, "training_logs.txt")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

monitor, direction = task.val_monitor
checkpoint = ModelCheckpoint(
    dirpath=CHECKPOINT_DIR,
    monitor=monitor,
    mode=direction,
    save_top_k=5,  # 최근 5개 모델 저장
    every_n_epochs=1,
    save_last=True,  # 마지막 모델도 저장
    save_weights_only=False,
    filename="{epoch}-loss-val={loss/val:.4f}",
    verbose=False,
)
early_stopping = EarlyStopping(
    monitor=monitor,
    mode=direction,
    min_delta=0.0,
    patience=10,
    strict=True,
    verbose=False,
)
logger = CSVLogger(PYANNOTE_DIR, name="logs")
callbacks = [RichProgressBar(), checkpoint, early_stopping]

# 커스텀 콜백: 에폭별 성능 지표 기록
class LoggingCallback(Callback):
    def __init__(self, log_file):
        self.log_file = log_file

    def on_validation_epoch_end(self, trainer, pl_module):
        val_metrics = trainer.callback_metrics

        # DER 계산 (원하는 경우 더 자세한 계산 추가 가능)
        # 여기서는 예시로 val_loss와 함께 전체 메트릭 dict를 저장합니다.
        log_str = f"Epoch {trainer.current_epoch} - Metrics: {val_metrics}\n"
        with open(self.log_file, "a") as f:
            f.write(log_str)
        print(log_str)

    def on_exception(self, trainer, pl_module, exception):
        pass

# LoggingCallback 인스턴스를 생성할 때 log_file 인자를 전달합니다.
callbacks.append(LoggingCallback(LOG_FILE))

# Lightning Trainer 설정 (GPU 2개 사용)
trainer = Trainer(
    accelerator="gpu",
    devices=2,
    strategy="ddp",
    callbacks=callbacks,
    max_epochs=50,
    gradient_clip_val=0.5,
    logger=logger,
)

if __name__ == "__main__":
    trainer.fit(model)

        # 저장된 체크포인트 중 가장 최근 epoch 기반 모델 가져오기
    import glob

    ckpt_list = glob.glob(os.path.join(CHECKPOINT_DIR, "epoch=*.ckpt"))
    if ckpt_list:
        # 예: epoch=19-loss-val=0.4082.ckpt
        latest_ckpt = sorted(ckpt_list)[-1]
        target_path = os.path.join(PYANNOTE_DIR, "finetuned_model.ckpt")
        shutil.copy(latest_ckpt, target_path)
        print(f"✅ Finetuned model saved to {target_path}")
    else:
        # fallback to last.ckpt
        last_ckpt = os.path.join(CHECKPOINT_DIR, "last.ckpt")
        target_path = os.path.join(PYANNOTE_DIR, "finetuned_model.ckpt")
        if os.path.exists(last_ckpt):
            shutil.copy(last_ckpt, target_path)
            print(f"✅ Finetuned model saved from last.ckpt to {target_path}")
        else:
            print("❌ No valid checkpoint found to save.")
    
    
'''
# AdamW 옵티마이저 사용
def configure_optimizers(self):
    return AdamW(self.parameters(), lr=1e-4, weight_decay=1e-2)

def configure_optimizers(self):
    return Adam(self.parameters(), lr=1e-4)

from torch.optim import RAdam
def configure_optimizers(self):
    return RAdam(self.parameters(), lr=1e-4)

def configure_optimizers(self):
    optimizer = RAdam(self.parameters(), lr=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=20)
    return [optimizer], [scheduler]
'''