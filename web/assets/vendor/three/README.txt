three.js r169 (MIT License) — https://threejs.org
반지 3D 렌더링에 사용합니다. CDN 대신 직접 담아 두어, 외부 망이 막힌 환경이나
CDN 장애 상황에서도 스튜디오가 그대로 동작합니다.

업데이트 방법
  npm i three@<버전>
  cp node_modules/three/build/three.module.min.js                         web/assets/vendor/three/
  cp node_modules/three/examples/jsm/controls/OrbitControls.js            web/assets/vendor/three/addons/controls/
  cp node_modules/three/LICENSE                                           web/assets/vendor/three/
