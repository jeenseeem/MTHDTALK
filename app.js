import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, limitToLast, query } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// 본인 프로젝트의 firebaseConfig로 바꿔넣으세요!
const firebaseConfig = {
  apiKey: "AIzaSyCzCSi6eJh09lL_7i09flP2EgFva1ycByE",
  authDomain: "mthdchatting.firebaseapp.com",
  databaseURL: "https://mthdchatting-default-rtdb.firebaseio.com",
  projectId: "mthdchatting",
  storageBucket: "mthdchatting.firebasestorage.app",
  messagingSenderId: "542488770302",
  appId: "1:542488770302:web:77e8b4ebdc6bf298c157af"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const input = document.getElementById('word-input');
const container = document.getElementById('danmaku-container');
const modeChatBtn = document.getElementById('mode-chat');
const modeEndWordBtn = document.getElementById('mode-endword');

let mode = 'chat';
let lastEndWord = null;

// 모드 전환
modeChatBtn.onclick = () => {
  mode = 'chat';
  modeChatBtn.classList.add('selected');
  modeEndWordBtn.classList.remove('selected');
};
modeEndWordBtn.onclick = () => {
  mode = 'endword';
  modeEndWordBtn.classList.add('selected');
  modeChatBtn.classList.remove('selected');
};

// 끝말잇기 룰
function getLastChar(word) {
  let pure = word.replace(/[^가-힣]/g,"");
  if (pure.length === 0) return '';
  return pure[pure.length-1];
}
function isValidWord(newWord, prevWord) {
  if (!prevWord) return true;
  return getLastChar(prevWord) === newWord[0];
}

// 입력
input.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.keyCode === 13) && input.value.trim() !== '') {
    let text = input.value.replace(/\s/g,'').slice(0,16);
    push(ref(db, 'danmakus'), {
      text: text, mode: mode, time: Date.now()
    });
    input.value = '';
  }
});

// 실시간 수신
const msgRef = ref(db, 'danmakus');
onChildAdded(
  query(msgRef, limitToLast(40)),
  (snapshot) => {
    const msg = snapshot.val();
    if (msg.mode === 'chat') {
      spawnChatDanmaku(msg.text);
    } else if (msg.mode === 'endword') {
      spawnEndwordDanmaku(msg.text);
    }
  }
);

// 일반 채팅(가로, 랜덤 위치&속도)
function spawnChatDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'danmaku chat';
  span.style.top = (10 + Math.random() * 78) + 'vh';
  const animDuration = (5.5 + Math.random() * 3.5).toFixed(2);
  span.style.animationDuration = animDuration + 's';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, (parseFloat(animDuration) * 1000) + 500);
}

// 끝말잇기
function spawnEndwordDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.style.left = (40 + Math.random() * 20) + 'vw';
  span.style.top = '60vh';
  let valid = isValidWord(text, lastEndWord);
  if (valid) {
    span.className = 'danmaku endword';
    lastEndWord = text;
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 3200);
  } else {
    span.className = 'danmaku endword invalid';
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 1400);
  }
}
