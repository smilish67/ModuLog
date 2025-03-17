# 파인 튜닝 가이드

## pyannote 파인튜닝 for speaker diarizaiton purpose
pyannote는 [pyannote.audio](https://github.com/pyannote/pyannote-audio/tree/main/tutorials)의 파인튜닝 가이드를 참고하였습니다. <br>
pyannote의 speaker diarization pipeline을 보유하신 데이터셋에 맞게 파인튜닝하는 과정은 다음과 같습니다.  
- Pyannote-segmentation 모델 파인튜닝
- Optimizing the pipeline hyper-parameters

본 가이드라인을 따르기 위해서는, 데이터셋을 다음과 같이 구성해야 합니다. ([pyannote.database](https://github.com/pyannote/pyannote-database) 참고고) <br>
데이터셋 별로 포맷 변경에 필요한 작업이 다를 수 있기 때문에, 저희가 사용한 데이터셋을 포맷변환한 내용을 공유하겠습니다. (utils 폴더 내)

- dataset
    - train.txt (각 txt 파일에는 각 세트에 해당하는 데이터의 uri가 담깁니다.(파일명))
    - dev.txt
    - test.txt
    - train (학습 용도) 
        - wav (or else) folder
            - {uri}.wav
        - rttm folder
            - {uri}.rttm
        - uem folder
            - {uri}.uem
    - dev (pipeline hyper-parameters optimize 용도)
        - 동일
    - test (테스트)
        - 동일

## NeMo 파인튜닝