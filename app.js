import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, onDisconnect, serverTimestamp, get, onChildRemoved, remove, query, limitToLast, onChildChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// 동물+색상 겹치지 않는 랜덤 (80여종, 색은 20여종)
const animals = [
  "코끼리","여우","호랑이","침팬지","고릴라","코알라","나무늘보","수달","카피바라","레서판다",
  "토끼","고양이","사자","재규어","치타","들개","늑대","여우","스라소니","하이에나","하마",
  "물개","바다표범","펭귄","도롱뇽","악어","카멜레온","청설모","햄스터","족제비","담비","미어캣",
  "알파카","라마","염소","양","소","황소","말","얼룩말","당나귀","들소","영양","오카피","기린",
  "버팔로","딱따구리","독수리","까치","올빼미","부엉이","앵무새","공작","닭","오리","거위",
  "백조","타조","매","수리","갈매기","개구리","두꺼비","맹꽁이","도마뱀","이구아나","고래",
  "상어","연어","참치","흰동가리","해마","복어","문어","오징어","가재","게","가오리","가마우지",
  "돌고래","불가사리","산호","조개","나비","벌","잠자리","파리","호랑나비","반딧불이","풍뎅이",
  "거북이","두더지","쥐","고라니","두루미","공작새","표범","다람쥐","스컹크","가젤"
];
const colorSet = [
  "#e57373","#64b5f6","#81c784","#ffb74d","#ba68c8",
  "#4db6ac","#ffd54f","#a1887f","#90a4ae","#f06292",
  "#d45b7a","#3999d7","#9eae3b","#f5ac36","#b670d3",
  "#4ed7b1","#ffe159","#a69383","#6ea6b4","#db7b1d"
];
function getAvailableAnimalColor(allUsers) {
  const used = new Set();
  allUsers.forEach(u=>used.add(`${u.animal}:${u.color}`));
  let tries = 0;
  while (tries++ < 300) {
    const animal = animals[Math.floor(Math.random()*animals.length)];
    const color  = colorSet[Math.floor(Math.random()*colorSet.length)];
    if (!used.has(`${animal}:${color}`)) {
      return { animal, color };
    }
  }
  return {
    animal: animals[Math.floor(Math.random()*animals.length)],
    color: colorSet[Math.floor(Math.random()*colorSet.length)]
  }
}
function randomNumber() { return Math.floor(Math.random()*9999)+100; }

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

// --- 유저 배정 ---
let myUser = null;
async function assignUser() {
  const usersSnap = await get(ref(db,"/users"));
  const allUsers = [];
  usersSnap.forEach(child=>{
    let v = child.val();
    allUsers.push({animal: (v.animal || ""), color: (v.color || "")});
  });
  const choice = getAvailableAnimalColor(allUsers);
  myUser = {
    id: randomNumber(),
    nick: `익명의 ${choice.animal}`,
    animal: choice.animal,
    color: choice.color
  };
  const myUserRef = ref(db, `users/${myUser.id}`);
  set(myUserRef, {nick: myUser.nick, animal: myUser.animal, color: myUser.color, at: serverTimestamp()});
  onDisconnect(myUserRef).remove();
}

// === DOM ===
const userListDiv      = document.getElementById("user-list");
const input            = document.getElementById('word-input');
const container        = document.getElementById('danmaku-container');
const lastEndDiv       = document.getElementById('last-endword');
const modeChatBtn      = document.getElementById('mode-chat');
const modeEndWordBtn   = document.getElementById('mode-endword');
const endwordListDiv   = document.getElementById('endword-list');
const resetBtn         = document.getElementById('reset-endword-btn');
const resetStatus      = document.getElementById('reset-status');
const voteModal        = document.getElementById('reset-vote-modal');
const voteYesBtn       = document.getElementById('vote-yes');
const voteNoBtn        = document.getElementById('vote-no');
const voteProgress     = document.getElementById('reset-vote-progress');

// ---- 상태 ----
let mode = 'chat';
let lastEndWord = "";
let endwordsArr = [];
let hasVoted     = false;
let modalOpen    = false;

// === 유저리스트(실시간/색&동물) ===
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

// === 모드 전환 ===
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

// === 중앙 투표 팝업 ===
function openVoteModal() {
  voteModal.style.display = 'block';
  voteProgress.innerText = "";
  hasVoted = false;
  modalOpen = true;
}
function closeVoteModal() {
  voteModal.style.display = 'none';
  modalOpen = false;
}
function updateVoteProgress() {
  get(ref(db, "reset_votes")).then(snapshot => {
    let yes=0, no=0, total=0;
    let userCount = Math.max(1, document.querySelectorAll('#user-list span').length - 1);
    snapshot.forEach(child=>{
      total++;
      if(child.val()==="yes") yes++;
      if(child.val()==="no")  no++;
    });
    voteProgress.innerText = `찬성:${yes} / 반대:${no} (전체:${userCount}, 과반=${Math.ceil(userCount/2)})`;
    if(userCount>0 && yes>=Math.ceil(userCount/2)) {
      remove(ref(db, 'danmaku_end')).then(()=>{
        endwordsArr = [];
        endwordListDiv.innerHTML = "";
        if (lastEndDiv) lastEndDiv.textContent = "";
        lastEndWord = ""; // 초기화
        voteProgress.innerText = "초기화 완료!";
        setTimeout(()=>{
          closeVoteModal();
          remove(ref(db, "reset_votes"));
        }, 1800);
      });
    }
    if(userCount>0 && no>=Math.ceil(userCount/2)) {
      voteProgress.innerText = "초기화가 반대로 부결되었습니다.";
      setTimeout(()=>{
        closeVoteModal();
        remove(ref(db, "reset_votes"));
      }, 1800);
    }
  });
}
const voteRef = ref(db, "reset_votes");
onChildAdded(voteRef, updateVoteProgress);
onChildRemoved(voteRef, updateVoteProgress);
if (typeof onChildChanged === 'function') onChildChanged(voteRef, updateVoteProgress);

voteYesBtn.onclick = () => {
  if (hasVoted) return;
  set(ref(db, `reset_votes/${myUser.id}`), "yes");
  hasVoted = true;
  voteProgress.innerText = "찬성 투표 완료! 대기 중...";
};
voteNoBtn.onclick = () => {
  if (hasVoted) return;
  set(ref(db, `reset_votes/${myUser.id}`), "no");
  hasVoted = true;
  voteProgress.innerText = "반대 투표 완료! 대기 중...";
};
resetBtn.onclick = () => { if(!modalOpen) openVoteModal(); };

// ---- 끝말잇기 룰 ----
function getLastChar(word) {
  let pure = word.replace(/[^가-힣]/g,"");
  if (pure.length === 0) return '';
  return pure[pure.length-1];
}
function isValidWord(newWord, prevWord) {
  if (!prevWord) return true;
  return getLastChar(prevWord) === newWord[0];
}

(async()=>{
  await assignUser();

  input.addEventListener('keydown', function(e){
    if ((e.key === 'Enter' || e.keyCode === 13) && input.value.trim() !== '') {
      let text = input.value;
      if(mode === "chat"){
        push(ref(db, 'danmakus'), {
          text: text, mode: mode, time: Date.now(),
          user: myUser.nick, color: myUser.color
        });
      } else {
        push(ref(db, 'danmaku_end'), {
          text: text, mode: mode, time: Date.now(),
          user: myUser.nick, color: myUser.color
        });
        push(ref(db, 'danmakus'), {
          text: text, mode: mode, time: Date.now(),
          user: myUser.nick, color: myUser.color
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
  // ---- 끝말잇기 Danmaku + 마지막 단어 ----
  function spawnChatDanmaku(text, color) {
    const span = document.createElement('span');
    const fontSize = (1.0 + Math.random() * 1.3).toFixed(2) + "em";
    span.textContent = text;
    span.style.fontSize = fontSize;
    span.style.color = color;
    span.className = 'danmaku chat';
    span.style.top = (10 + Math.random() * 78) + 'vh';
    const animDuration = (10 + Math.random() * 3).toFixed(2);
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

  // ---- 끝말잇기 히스토리 오른쪽 패널 ----
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
})();
