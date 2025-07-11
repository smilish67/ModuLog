# 다국어 회의록 요약

## 팀 소개 👀
- Member : ([🐰조혜지](https://github.com/Hyeji-Jo), [🐑김수효](https://github.com/KimSooHyo), [🐰한종현](https://github.com/smilish67), [🐮김주보](https://github.com/winjujae) )
<img width="1507" alt="image" src="https://github.com/user-attachments/assets/287371c6-f867-40de-91b7-fedf645a6b40" />

## 프로젝트 소개 👩🏻‍🏫 
### 1️⃣  &nbsp; 배경 및 목적
- 글로벌 기업 및 다국적 협력 프로젝트의 증가로 인해 다양한 언어로 회의가 진행됨
- 수동 기록, 녹취 후 수기 정리 등 기존의 회의록 작성 방식은 시간과 비용이 많이 소요됨
- 본 프로젝트는 다국어 회의 내용을 인식하고 요약하여, **회의록 작성의 효율성을 높이고 언어 장벽을 줄이는 것이 목표**
- 기존 회의록 시스템의 경우 사용자가 음성 인식될 단일 언어를 선택해야하는 불편함 존재

### 2️⃣  &nbsp; 개요  
<img width="1415" alt="image" src="https://github.com/user-attachments/assets/0eb9425e-f458-4bf4-951a-92cc46e140ea" />

   

### 3️⃣  &nbsp; 진행 기간 : 25.03.10 ~ 25.03.28 (19일 = 약 3주)
  
### 맡은 역할 
- 음성 데이터셋 구축
   - Pyannote의 Speaker Diarization Pipeline을 파인튜닝하는데 필요한 회의 데이터셋 구축
   - 영어, 중국어, 한국어 회의 데이터 셋을 합성함
<br>

- AI 파이프라인 구축 및 웹 구현
   - 영상 혹은 음성으로부터 Speaker Diarization을 수행
   - 분리된 내용을 요약 서버로 보냄
   - 요약된 내용을 받아 TTS 서버로 음성 합성 수행
   - 웹에서 처리된 각 데이터들을 시각화 
 
### 성과
- 비교적 높은 완성도를 보여 프로젝트 심사에서 1위(대상)를 차지할 수 있었음.
