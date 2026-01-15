// Firebase 설정(자신의 것으로 교체)
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCzCSi6eJh09lL_7i09flP2EgFva1ycByE",
  authDomain: "mthdchatting.firebaseapp.com",
  databaseURL: "https://mthdchatting-default-rtdb.firebaseio.com",
  projectId: "mthdchatting",
  storageBucket: "mthdchatting.firebasestorage.app",
  messagingSenderId: "542488770302",
  appId: "1:542488770302:web:77e8b4ebdc6bf298c157af",
  measurementId: "G-WF986QWD6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const input = document.getElementById('word-input');
const container = document.getElementById('danmaku-container');
const modeChatBtn = document.getElementById('mode-chat');
const modeEndWordBtn = document.getElementById('mode-endword');

let mode = 'chat';
let lastEndWord = null;

// 모드 전환
modeChatBtn.onclick = () => {
  mode = 'chat'; modeChatBtn.classList.add('selected'); modeEndWordBtn.classList.remove('selected');
};
modeEndWordBtn.onclick = () => {
  mode = 'endword'; modeEndWordBtn.classList.add('selected'); modeChatBtn.classList.remove('selected');
};

// 끝말잇기 규칙
function getLastChar(word) {
  let pure = word.replace(/[^가-힣]/g,"");
  if (pure.length === 0) return '';
  return pure[pure.length-1];
}
function isValidWord(newW, prevW) {
  if (!prevW) return true;
  return getLastChar(prevW) === newW[0];
}

// 입력 처리
input.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && input.value.trim() !== '') {
    const text = input.value.replace(/\s/g,'').slice(0,16);
    db.ref('danmakus').push({
      text, mode, time: Date.now()
    });
    input.value = '';
  }
});

// 실시간 송출(화면 그리기)
db.ref('danmakus').limitToLast(30).on('child_added', function(snapshot){
  const msg = snapshot.val();
  // 모드에 따라 다르게 Danmaku 생성
  if (msg.mode === 'chat') {
    spawnChatDanmaku(msg.text);
  } else if (msg.mode === 'endword') {
    spawnEndwordDanmaku(msg.text);
  }
});

// 채팅 Danmaku: 가로로 이동
function spawnChatDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'danmaku chat';
  // y 위치 랜덤(상단 20~80% 중)
  span.style.top = (20 + Math.random()*60) + 'vh';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, 3400);
}

// 끝말잇기 Danmaku: 위로 뭉게뭉게
function spawnEndwordDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;

  let valid = isValidWord(text, lastEndWord);
  // x 위치 중앙 근처 40~60% 랜덤(겹침 완화용)
  span.style.left = (40 + Math.random()*20) + 'vw';
  span.style.top = '60vh';

  if (valid) {
    span.className = 'danmaku endword';
    lastEndWord = text;
    container.appendChild(span);
    setTimeout(()=>{span.remove();}, 3200); // 끝말잇기 성공(파랑)
  } else {
    span.className = 'danmaku endword invalid';
    container.appendChild(span);
    setTimeout(()=>{span.remove();}, 1300); // 실패(빨강, 빨리 사라짐)
  }
}
