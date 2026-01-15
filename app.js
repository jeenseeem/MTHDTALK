import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, remove, onDisconnect, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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

// --- 유저리스트 실시간 표시 (입장인원 흰색, 유저는 랜덤색)
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
import { onChildRemoved } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { query, limitToLast } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
onChildAdded(ref(db, 'users'), updateUserList);
onChildRemoved(ref(db, 'users'), updateUserList);

// -- 내 유저 입장 기록 (접속 기록, 종료시 퇴장)
const myUserRef = ref(db, `users/${myUser.id}`);
set(myUserRef, {nick: myUser.nick, color: myUser.color, at: serverTimestamp()});
onDisconnect(myUserRef).remove();

// --- 끝말잇기 & 채팅 처리
const input = document.getElementById('word-input');
const container = document.getElementById('danmaku-container');
const lastEndDiv = document.getElementById('last-endword');
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
// 입력시
input.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.keyCode === 13) && input.value.trim() !== '') {
    let text = input.value.trim().replace(/\s/g,'').slice(0,16);
    if(mode === "chat"){
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    } else {
      // 끝말잇기는 별도 경로에 저장
      push(ref(db, 'danmaku_end'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
      // 화면 효과용으로도 같이 올림
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    }
    input.value = '';
  }
});

// -- 채팅 실시간 수신
const msgRef = ref(db, 'danmakus');
onChildAdded(
  query(msgRef, limitToLast(40)),
  (snapshot) => {
    const msg = snapshot.val();
    if (msg.mode === 'chat') {
      spawnChatDanmaku(msg.text, msg.user, msg.color);
    } else if (msg.mode === 'endword') {
      spawnEndwordDanmaku(msg.text, msg.user, msg.color);
    }
  }
);

// -- 끝말잇기 실시간 메시지 정보 모음(별도)
const endRef = ref(db, 'danmaku_end');
onChildAdded(
  query(endRef, limitToLast(40)),
  (snapshot) => {
    // 필요하다면 모아보기 용
    // const msg = snapshot.val();
    // console.log('끝말잇기 정보:', msg);
  }
);

// ---- 효과
function spawnChatDanmaku(text, user, color) {
  const span = document.createElement('span');
  span.innerHTML = `<span style="color:${color};font-weight:bold">${user}</span> ${text}`;
  span.className = 'danmaku chat';
  span.style.top = (10 + Math.random() * 78) + 'vh';
  const animDuration = (5.5 + Math.random() * 3.5).toFixed(2);
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
