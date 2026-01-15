// firebaseConfig는 본인 설정값으로 바꾸세요!
var firebaseConfig = {
  apiKey: "AIzaSyCzCSi6eJh09lL_7i09flP2EgFva1ycByE",
  authDomain: "mthdchatting.firebaseapp.com",
  databaseURL: "https://mthdchatting-default-rtdb.firebaseio.com",
  projectId: "mthdchatting",
  storageBucket: "mthdchatting.firebasestorage.app",
  messagingSenderId: "542488770302",
  appId: "1:542488770302:web:77e8b4ebdc6bf298c157af",
  measurementId: "G-WF986QWD6P"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

const input = document.getElementById('word-input');
const container = document.getElementById('danmaku-container');
const modeChatBtn = document.getElementById('mode-chat');
const modeEndWordBtn = document.getElementById('mode-endword');

let mode = 'chat';
let lastEndWord = null;

// 모드 전환 버튼
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

// 끝말잇기 검사 함수
function getLastChar(word) {
  let pure = word.replace(/[^가-힣]/g,"");
  if (pure.length === 0) return '';
  return pure[pure.length-1];
}
function isValidWord(newWord, prevWord) {
  if (!prevWord) return true;
  return getLastChar(prevWord) === newWord[0];
}

// 메시지 입력 처리
input.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && input.value.trim() !== '') {
    let text = input.value.replace(/\s/g,'').slice(0,16);
    db.ref('danmakus').push({
      text: text, mode: mode, time: Date.now()
    });
    input.value = '';
  }
});

// 메시지 실시간 표시
db.ref('danmakus').limitToLast(30).on('child_added', function(snapshot){
  const msg = snapshot.val();
  if (msg.mode === 'chat') {
    spawnChatDanmaku(msg.text);
  } else if (msg.mode === 'endword') {
    spawnEndwordDanmaku(msg.text);
  }
});

// 일반 채팅(가로)
function spawnChatDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'danmaku chat';
  // y 위치: 20~80vh 랜덤
  span.style.top = (20 + Math.random() * 60) + 'vh';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, 3400);
}

// 끝말잇기(뭉게뭉게 위로)
function spawnEndwordDanmaku(text) {
  const span = document.createElement('span');
  span.textContent = text;
  // x 위치: 중앙 근처(40~60vw)
  span.style.left = (40 + Math.random() * 20) + 'vw';
  span.style.top = '60vh';

  // 끝말잇기 규칙 검사
  let valid = isValidWord(text, lastEndWord);
  if (valid) {
    span.className = 'danmaku endword';
    lastEndWord = text;
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 3200); // 파란색 위로
  } else {
    span.className = 'danmaku endword invalid';
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 1400); // 빨간색 터지며 사라짐
  }
}
