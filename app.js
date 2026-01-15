import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, onDisconnect, serverTimestamp, get, onChildRemoved, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// 랜덤 컬러 팔레트
const colorSet = [
  "#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8",
  "#4db6ac", "#ffd54f", "#a1887f", "#90a4ae", "#f06292"
];

// 익명 유저/색상 고정
function getAnonNick() {
  const animals = ["낙타","거북이","호랑이","고양이","펭귄","돌고래","고라니","침팬지","병아리","닭","하마","수달","부엉이","판다","돼지","코뿔소","양","두더지","늑대","쥐","개구리"];
  let base = localStorage.getItem("anonUid")||"";
  let n, animal, colorIdx;
  if(base && base.split(":").length === 3){
    [n, animal, colorIdx] = base.split(":");
    return {id:n, nick:"익명의 "+animal, color: colorSet[Number(colorIdx) % colorSet.length]};
  }
  n = Math.floor(Math.random()*9999)+100;
  animal = animals[Math.floor(Math.random()*animals.length)];
  colorIdx = Math.floor(Math.random()*colorSet.length);
  let uid = `${n}:${animal}:${colorIdx}`;
  localStorage.setItem("anonUid", uid);
  return {id:n, nick:"익명의 "+animal, color:colorSet[colorIdx]};
}
const myUser = getAnonNick();

// Firebase 초기화
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

// 사용자 리스트 표시
const userListDiv = document.getElementById("user-list");
function updateUserList(){
  get(ref(db, "/users")).then(snapshot=>{
    let html = `<span style="color:#fff;font-weight:bold;">입장인원</span><br>`;
    snapshot.forEach(child=>{
      let v = child.val();
      let color = v.color || "#eee";
      html += `<span style="color:${color};font-size:1em">${v.nick}</span><br>`;
    });
    userListDiv.innerHTML = html;
  });
}
onChildAdded(ref(db, 'users'), updateUserList);
onChildRemoved(ref(db, 'users'), updateUserList);

// 입장/퇴장 기록
const myUserRef = ref(db, `users/${myUser.id}`);
set(myUserRef, {nick: myUser.nick, color: myUser.color, at: serverTimestamp()});
onDisconnect(myUserRef).remove();

// 주요 DOM
const input = document.getElementById('word-input');
const container = document.getElementById('danmaku-container');
const lastEndDiv = document.getElementById('last-endword');
const modeChatBtn = document.getElementById('mode-chat');
const modeEndWordBtn = document.getElementById('mode-endword');
const endwordListDiv = document.getElementById('endword-list');
let endwordsArr = [];

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

// 끝말잇기 룰 (한글 받침 둘째글자만 비교)
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
    let text = input.value.trim().replace(/\s/g,'').slice(0,16);
    if(mode === "chat"){
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    } else {
      // 끝말잇기는 오른쪽 패널용 DB에도 저장
      push(ref(db, 'danmaku_end'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
      // 효과 연동 위해 danmakus에도 같이 전송
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    }
    input.value = '';
  }
});

// 채팅 실시간 수신
const msgRef = ref(db, 'danmakus');
onChildAdded(
  query(msgRef, limitToLast(40)),
  (snapshot) => {
    const msg = snapshot.val();
    if (msg.mode === 'chat') {
      spawnChatDanmaku(msg.text, msg.color);
    } else if (msg.mode === 'endword') {
      spawnEndwordDanmaku(msg.text, msg.user, msg.color);
    }
  }
);

// 끝말잇기 단어 히스토리 패널(오른쪽)
const endRef = ref(db, 'danmaku_end');
onChildAdded(
  query(endRef, limitToLast(200)),
  (snapshot) => {
    const msg = snapshot.val();
    if (msg.mode === 'endword') {
      addEndwordToPanel(msg.text);
    }
  }
);

function addEndwordToPanel(word) {
  endwordsArr.push(word);
  if (endwordsArr.length > 200) endwordsArr.shift();
  endwordListDiv.innerHTML = endwordsArr
    .map((w,i)=>`<span style="background:rgba(12,60,100,${0.09+(i%2)*0.07})">${w}</span>`)
    .join('');
  endwordListDiv.scrollTop = endwordListDiv.scrollHeight;
}

// ---- 효과(채팅/끝말잇기)
function spawnChatDanmaku(text, color) {
  const span = document.createElement('span');
  // 글자크기 랜덤
  const fontSize = (1.0 + Math.random() * 1.3).toFixed(2) + "em";
  span.textContent = text;
  span.style.fontSize = fontSize;
  span.style.color = color;
  span.className = 'danmaku chat';
  span.style.top = (10 + Math.random() * 78) + 'vh';
  const animDuration = (10 + Math.random() * 3).toFixed(2); // 10~13초, 매우 느리게
  span.style.animationDuration = animDuration + 's';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, (parseFloat(animDuration) * 1000) + 500);
}

function spawnEndwordDanmaku(text, user, color) {
  const span = document.createElement('span');
  span.textContent = text;
  span.style.left = (40 + Math.random() * 20) + 'vw';
  span.style.top = '60vh';
  let valid = isValidWord(text, lastEndWord);
  if (valid) {
    span.className = 'danmaku endword';
    lastEndWord = text;
    if (lastEndDiv) lastEndDiv.textContent = "마지막 단어: " + lastEndWord;
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 3200);
  } else {
    span.className = 'danmaku endword invalid';
    container.appendChild(span);
    setTimeout(() => { span.remove(); }, 1400);
  }
}
