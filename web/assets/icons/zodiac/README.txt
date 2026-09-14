십이지 아이콘 파일을 넣는 곳입니다.

파일 이름은 지지 이름 그대로 넣어 주세요 (확장자는 png 또는 svg):
  자.png  축.png  인.png  묘.png  진.png  사.png
  오.png  미.png  신.png  유.png  술.png  해.png

넣은 뒤 web/assets/js/config.js 에서
  zodiacIcons: { custom: false, ... }
를
  zodiacIcons: { custom: true, ... }
로 한 글자만 바꾸면 화면이 그 파일을 씁니다.
(svg 로 넣었다면 ext 도 '.svg' 로 바꿔 주세요)

배경이 비어 있는(투명) 파일이면 색은 화면에서 자동으로 입혀집니다.
아이콘 자체가 흰색이든 검은색이든 상관없습니다.
