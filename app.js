import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, remove, onDisconnect, serverTimestamp, get, child, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// 1. Firebase 설정
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

// ---- 익명 유저 생성 (유저id 및 닉네임 고정/랜덤 배정) ----
function getAnonNick() {
  // 동물배열
  const animals = ["낙타","거북이","호랑이","고양이","펭귄","돌고래","고라니","침팬지","병아리","닭","하마","수달","부엉이","판다","돼지","코뿔소","양","두더지","늑대","쥐","개구리"];
  let base = (localStorage.getItem("anonUid")||"");
  let n, animal;
  if(base && base.indexOf(":")>0){
    [n, animal] = base.split(":");
    return {id:n, nick:"익명의 "+animal};
  }
  // 없으면 랜덤 부여
  n = Math.floor(Math.random()*9999)+100;
  animal = animals[Math.floor(Math.random()*animals.length)];
  let uid = n+":"+animal;
  localStorage.setItem("anonUid", uid);
  return {id:n, nick:"익명의 "+animal};
}
const myUser = getAnonNick();

// ---- 유저 리스트 실시간 동기화 ----
const userListDiv = document.getElementById("user-list");
function updateUserList(){
  get(ref(db, "/users")).then(snapshot=>{
    let html = "<b>입장 인원</b><br>";
    let list = [];
    snapshot.forEach(child=>{
      let v = child.val();
      list.push((v.nick || "익명") + `<span style="font-size:0.8em;color:#aaa"> (${child.key})</span>`);
    });
    html += list.join("<br>");
    userListDiv.innerHTML = html;
  });
}
// 실시간 반영
onChildAdded(ref(db, 'users'), updateUserList);
onChildAdded(ref(db, 'users'), updateUserList);

import { onChildRemoved } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
onChildRemoved(ref(db, 'users'), updateUserList);

// 본인 입장 기록 (접속 시 기록, 브라우저 닫기/새로고침시 퇴장)
const myUserRef = ref(db, `users/${myUser.id}`);
set(myUserRef, {nick: myUser.nick, at: serverTimestamp()});
onDisconnect(myUserRef).remove();

// ---- 끝말잇기 실시간 채팅 ----
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

// 끝말잇기 규칙
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
    push(ref(db, 'danmakus'), {
      text: text, mode: mode, time: Date.now(), user: myUser.nick
    });
    input.value = '';
  }
});

// 실시간 채팅 수신
const msgRef = ref(db, 'danmakus');
onChildAdded(
  query(msgRef, limitToLast(40)),
  (snapshot) => {
    const msg = snapshot.val();
    // 일반 채팅
    if (msg.mode === 'chat') {
      spawnChatDanmaku(msg.text, msg.user);
    }
    // 끝말잇기
    else if (msg.mode === 'endword') {
      spawnEndwordDanmaku(msg.text);
    }
  }
);

// 가로 Danmaku (익명 닉네임 표시)
function spawnChatDanmaku(text, user) {
  const span = document.createElement('span');
  span.textContent = user ? `[${user}] ${text}` : text;
  span.className = 'danmaku chat';
  span.style.top = (10 + Math.random() * 78) + 'vh';
  const animDuration = (5.5 + Math.random() * 3.5).toFixed(2);
  span.style.animationDuration = animDuration + 's';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, (parseFloat(animDuration) * 1000) + 500);
}

// 끝말잇기 Danmaku (마지막 단어 화면 맨 위에!)
function spawnEndwordDanmaku(text) {
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
