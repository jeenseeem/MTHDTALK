import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, onDisconnect, serverTimestamp, get, onChildRemoved, update, remove, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// ---- 익명 닉네임 (랜덤 동물+색, 매 입장시 새로 생성) ----
const colorSet = [
  "#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8",
  "#4db6ac", "#ffd54f", "#a1887f", "#90a4ae", "#f06292"
];
function getAnonNick() {
  const animals = ["낙타","거북이","호랑이","고양이","펭귄","돌고래","고라니","침팬지","병아리","닭","하마","수달","부엉이","판다","돼지","코뿔소","양","두더지","늑대","쥐","개구리"];
  let n = Math.floor(Math.random()*9999)+100;
  let animal = animals[Math.floor(Math.random()*animals.length)];
  let colorIdx = Math.floor(Math.random()*colorSet.length);
  return {id: n, nick: "익명의 "+animal, color:colorSet[colorIdx]};
}
const myUser = getAnonNick();

// ---- 파이어베이스 및 DOM 준비 ----
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
const db  = getDatabase(app);

const userListDiv      = document.getElementById("user-list");
const input            = document.getElementById('word-input');
const container        = document.getElementById('danmaku-container');
const lastEndDiv       = document.getElementById('last-endword');
const modeChatBtn      = document.getElementById('mode-chat');
const modeEndWordBtn   = document.getElementById('mode-endword');
const endwordListDiv   = document.getElementById('endword-list');
const resetBtn         = document.getElementById('reset-endword-btn');
const resetStatus      = document.getElementById('reset-status');

// ---- 유저리스트(실시간/색 랜덤) ----
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

// ---- 입장/퇴장DB
const myUserRef = ref(db, `users/${myUser.id}`);
set(myUserRef, {nick: myUser.nick, color: myUser.color, at: serverTimestamp()});
onDisconnect(myUserRef).remove();

// ---- 끝말잇기 초기화 투표 ----
let resetVoted = false, resetVotes = {}, resetVoting = false;
const resetVotesRef = ref(db, 'danmaku_reset_votes');
onChildAdded(resetVotesRef, countResetVotes);
onChildRemoved(resetVotesRef, countResetVotes);

function countResetVotes() {
  get(resetVotesRef).then(snapshot=>{
    const votes = {};
    snapshot.forEach(child => { votes[child.key] = true; });
    resetVotes = votes;
    const numVotes = Object.keys(votes).length || 0;
    const userCount = Math.max(1, document.querySelectorAll('#user-list span').length - 1); // '-1' for title
    resetStatus.textContent =
      resetVoting
      ? `초기화 투표 ${numVotes}/${userCount}명 (${Math.ceil(userCount/2)}명 이상)`
      : '';
    if(userCount>0 && numVotes >= Math.ceil(userCount/2)) resetEndwordHistory();
  });
}

resetBtn.onclick = ()=>{
  if (resetVoted) {
    alert("이미 투표하셨습니다!");
    return;
  }
  resetVoting = true;
  set(ref(db, `danmaku_reset_votes/${myUser.id}`), true);
  resetBtn.disabled = true;
  resetBtn.textContent = "투표 중...";
  setTimeout(()=>{
    resetBtn.disabled = false;
    resetBtn.textContent = "끝말잇기 초기화 요청";
  }, 5000);
  resetVoted = true;
};

function resetEndwordHistory() {
  remove(ref(db, 'danmaku_end')).then(()=>{
    endwordsArr = [];
    endwordListDiv.innerHTML = "";
    if (lastEndDiv) lastEndDiv.textContent = "";
    resetVoting = false;
    resetVoted = false;
    resetStatus.textContent = "초기화됨!";
    remove(resetVotesRef);
    setTimeout(()=>{ resetStatus.textContent = ""; }, 2000);
  });
}

// ---- 채팅/끝말잇기 모드 ----
let mode = 'chat';
let lastEndWord = null;
let endwordsArr = [];

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

function getLastChar(word) {
  let pure = word.replace(/[^가-힣]/g,"");
  if (pure.length === 0) return '';
  return pure[pure.length-1];
}
function isValidWord(newWord, prevWord) {
  if (!prevWord) return true;
  return getLastChar(prevWord) === newWord[0];
}

// ---- 입력: 제한 없이 전체(채팅/끝말잇기)
input.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.keyCode === 13) && input.value.trim() !== '') {
    let text = input.value;  // 글자수 제한 없이 전송
    if(mode === "chat"){
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    } else {
      push(ref(db, 'danmaku_end'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
      push(ref(db, 'danmakus'), {
        text: text, mode: mode, time: Date.now(), user: myUser.nick, color: myUser.color
      });
    }
    input.value = '';
  }
});

// ---- 채팅 Danmaku
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

function spawnChatDanmaku(text, color) {
  const span = document.createElement('span');
  const fontSize = (1.0 + Math.random() * 1.3).toFixed(2) + "em";
  span.textContent = text;
  span.style.fontSize = fontSize;
  span.style.color = color;
  span.className = 'danmaku chat';
  span.style.top = (10 + Math.random() * 78) + 'vh';
  const animDuration = (10 + Math.random() * 3).toFixed(2); // 10~13초, 느리게
  span.style.animationDuration = animDuration + 's';
  container.appendChild(span);
  setTimeout(() => { span.remove(); }, (parseFloat(animDuration) * 1000) + 500);
}

// ---- 끝말잇기 Danmaku + 마지막 단어 표기
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

// ---- 끝말잇기 단어 히스토리 오른쪽 패널
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
