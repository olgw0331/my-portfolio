/* ================================================================
 * 편집 가이드: README_수정가이드.md를 먼저 읽어주세요.
 *  [A] projectData : 작품 이름/설명/실제 이미지 경로
 *  [B] contactData : 이메일/전화/SNS/GitHub 주소
 *  [C] openContact / closeContact : 우측 연락처 창 열기/닫기
 *  [D] updateVisitedUI : 작업 열람 뒤 지도 활성화
 *  [E] startIntro / replayIntro / toggleMap : 화면 전환 및 리셋 여부
 * ================================================================ */

// [A] 작품 데이터 수정: title / summary / image 등 교체 가능합니다.
// 이미지 추가: assets/폴더에 파일 저장 -> image: 'assets/작품이미지.png'
// image:null이면 현재처럼 "작업물 미리보기" 빈 공간이 표시됩니다.
const projectData = {
  yonggari: {
    number: '01',
    title: '용가리치킨 상세페이지',
    type: '제품 상세페이지 디자인',
    category: '상세페이지 / 그래픽 디자인',
    summary: '용가리치킨을 소재로 한 제품 상세페이지 디자인 작업입니다. 제품의 밝고 친근한 분위기를 테마파크의 하나의 구역으로 표현했습니다.',
    artKicker: 'PRODUCT DETAIL PAGE DESIGN',
    artBig: '용가리치킨',
    theme: 'yellow',
    image: null // 예: 'assets/yonggari-detail.png' (기존 null 지우고 문자열 입력)
  },
  daangn: {
    number: '02',
    title: '당근마켓 광고 역기획',
    type: '광고 분석 · 역기획',
    category: '광고 기획 / 프레젠테이션',
    summary: '당근마켓 광고를 분석하고 새로운 기획 방향을 정리한 역기획 프로젝트입니다. 친근한 주황색 공간과 기획 도구를 활용해 구역을 표현했습니다.',
    artKicker: 'ADVERTISING REVERSE PLANNING',
    artBig: '당근마켓',
    theme: 'orange',
    image: null // 예: 'assets/daangn-presentation.png'
  }
};

// [B] 연락처: 내 정보 창에 나타날 주소. 빈 문자열('')이면 '주소 등록 전'으로 표시됩니다.
// URL은 반드시 https:// 로 시작하세요. 예: github: 'https://github.com/내아이디'
const contactData = {
  email: '', phone: '', instagram: '', youtube: '', github: '', website: ''
};
const contactFields = [
  {id:'email', label:'이메일', icon:'✉', href:(v)=>'mailto:'+v},
  {id:'phone', label:'전화번호', icon:'☎', href:(v)=>'tel:'+v.replace(/[^0-9+]/g,'')},
  {id:'instagram', label:'Instagram', icon:'◎', href:(v)=>v},
  {id:'youtube', label:'YouTube', icon:'▶', href:(v)=>v},
  {id:'github', label:'GitHub', icon:'⌘', href:(v)=>v},
  {id:'website', label:'기타 링크', icon:'↗', href:(v)=>v}
];

const $ = (s,p=document)=>p.querySelector(s);
const $$ = (s,p=document)=>[...p.querySelectorAll(s)];
const app = $('#app');
const roomScene = $('#roomScene');
const mapScene = $('#mapScene');
const mapBoard = $('#mapBoard');
const caption = $('#hoverCaption');
const projectModal = $('#projectModal');
const contactModal = $('#contactModal');
const character = $('.character');
const projectSheet = $('.project-sheet');
const menuPanel = $('#menuPanel');
const projectOrder = ['yonggari','daangn'];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let introTimers = [];
let visited = new Set();
let activeProject = null;
let previousFocus = null;
let contactPreviousFocus = null;
let blinkTimer = null;
let talkTimer = null;
let mapUnlocked = false;

function renderContacts() {
  const target = $('#contactLinks');
  target.replaceChildren();
  contactFields.forEach(({id,label,icon,href}) => {
    const value = (contactData[id]||'').trim();
    const node = document.createElement(value ? 'a' : 'div');
    node.className = 'contact-link' + (value ? '' : ' is-empty');
    if (value) {
      node.href = href(value);
      if (id !== 'email' && id !== 'phone') {
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
    }
    node.innerHTML = `<span class="contact-link-icon">${icon}</span><span class="contact-link-name">${label}</span><span class="contact-link-value">${value || '주소 등록 전'}</span>`;
    target.append(node);
  });
}

function loadVisited() {
  try {
    const saved = JSON.parse(localStorage.getItem('hyejeong-park-visited') || '[]');
    if (Array.isArray(saved)) visited = new Set(saved.filter(k => projectOrder.includes(k)));
  } catch (e) {}
}
function saveVisited() {
  try { localStorage.setItem('hyejeong-park-visited', JSON.stringify([...visited])); } catch (e) {}
}
function clearVisited() {
  visited = new Set();
  try { localStorage.removeItem('hyejeong-park-visited'); } catch (e) {}
  updateVisitedUI();
}

function updateDock() {
  app.classList.toggle('map-unlocked', mapUnlocked);
  const opened = app.dataset.scene === 'map';
  $('#mapToggle').setAttribute('aria-pressed', String(opened));
  $('#mapToggle').setAttribute('aria-label', opened ? '테마파크 지도 접기' : '테마파크 지도 펼치기');
  $('#mapToggleLabel').textContent = opened ? '지도 접기' : '지도 펼치기';
}

function clearIntroTimers() {
  introTimers.forEach(window.clearTimeout);
  introTimers = [];
}
function later(callback, ms) {
  const id = window.setTimeout(callback, ms);
  introTimers.push(id);
  return id;
}

function stopCharacterAnimation() {
  [blinkTimer,talkTimer].forEach(id => id && clearTimeout(id));
  blinkTimer = talkTimer = null;
  character.classList.remove('is-blinking','is-speaking');
}
function queueBlink() {
  if (app.dataset.scene !== 'greeting') return;
  blinkTimer = setTimeout(() => {
    character.classList.add('is-blinking');
    setTimeout(() => character.classList.remove('is-blinking'), 160);
    queueBlink();
  }, 3200 + Math.round(Math.random() * 1300));
}
function beginCharacterAnimation() {
  stopCharacterAnimation();
  queueBlink();
  const states = [true,false,true,false,false,false];
  let i = 0;
  const speakOnce = () => {
    if (app.dataset.scene !== 'greeting') return;
    character.classList.toggle('is-speaking', !!states[i]);
    i += 1;
    if (i < states.length) talkTimer = setTimeout(speakOnce, 320);
    else character.classList.remove('is-speaking');
  };
  talkTimer = setTimeout(speakOnce, 550);
}

function closeMenu() {
  menuPanel.classList.remove('is-open');
  menuPanel.setAttribute('aria-hidden','true');
  $('#menuToggle').setAttribute('aria-expanded','false');
}
function toggleMenu() {
  const willOpen = !menuPanel.classList.contains('is-open');
  menuPanel.classList.toggle('is-open', willOpen);
  menuPanel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  $('#menuToggle').setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

// [C] 프로필 창 닫기: CSS의 .contact-modal / .contact-sheet가 실제 위치·모션을 담당합니다.
function closeContact(returnFocus = true) {
  const open = contactModal.classList.contains('is-open');
  contactModal.classList.remove('is-open');
  contactModal.setAttribute('aria-hidden','true');
  if (open && returnFocus && contactPreviousFocus?.isConnected) contactPreviousFocus.focus({preventScroll:true});
}
// [C] 캐릭터 아이콘 클릭 → 오른쪽 연락처 패널 열기
function openContact() {
  if (!mapUnlocked) return;
  contactPreviousFocus = document.activeElement;
  closeMenu();
  contactModal.classList.add('is-open');
  contactModal.setAttribute('aria-hidden','false');
  $('.contact-sheet').focus({preventScroll:true});
}

function setHash(hash, replace = false) {
  const target = `${location.href.split('#')[0]}${hash}`;
  try { replace ? history.replaceState(null,'',target) : history.pushState(null,'',target); } catch(e){}
}

function setScene(scene) {
  app.dataset.scene = scene;
  const isMap = scene === 'map';
  roomScene.setAttribute('aria-hidden', String(isMap));
  mapScene.setAttribute('aria-hidden', String(!isMap));
  $('#greeting').setAttribute('aria-hidden', String(scene !== 'greeting'));
  roomScene.inert = isMap;
  mapScene.inert = !isMap;
  if (scene === 'greeting') beginCharacterAnimation(); else stopCharacterAnimation();
  updateDock();
}

// [E] 초기 인트로: 아직 방문 기록을 지우지 않습니다.
function startIntro() {
  clearIntroTimers();
  closeProject(false);
  closeContact(false);
  closeMenu();
  mapUnlocked = false;
  setScene('opening');
  setHash('', true);
  later(() => setScene('greeting'), prefersReducedMotion ? 220 : 2400);
}
// [E] 메뉴의 '인트로 다시보기'를 누를 때만 방문기록 초기화
function replayIntro() {
  clearVisited();
  startIntro();
}
function showGreeting(updateHash = true) {
  clearIntroTimers();
  closeProject(false);
  closeContact(false);
  closeMenu();
  setScene('greeting');
  if (updateHash) setHash('#studio');
}
function goMap(updateHash = true) {
  clearIntroTimers();
  closeContact(false);
  closeMenu();
  mapUnlocked = true;
  setScene('map');
  if (updateHash) setHash('#map');
  updateVisitedUI();
}
// [E] 하단 지도 아이콘: 접기/펼치기만 하며 방문기록은 유지
function toggleMap() {
  if (app.dataset.scene === 'map') showGreeting();
  else goMap();
}

// [D] 작품을 열람했을 때 외곽선·애니메이션 상태 유지
function updateVisitedUI() {
  $('#visitedCount').textContent = `${visited.size}/2`;
  projectOrder.forEach(id => {
    mapBoard.querySelector(`path[data-outline="${id}"]`)?.classList.toggle('is-visited', visited.has(id));
    mapBoard.querySelector(`[data-project="${id}"]`)?.classList.toggle('is-visited', visited.has(id));
    mapBoard.querySelector(`[data-activity="${id}"]`)?.classList.toggle('is-visited', visited.has(id));
  });
}
function visit(id) {
  visited.add(id);
  saveVisited();
  updateVisitedUI();
}

function renderProject(id) {
  const item = projectData[id];
  if (!item) return;
  activeProject = id;
  visit(id);
  $('#projectIndex').textContent = `PROJECT ${item.number} / 02`;
  $('#projectType').textContent = item.type;
  $('#projectTitle').textContent = item.title;
  $('#projectSummary').textContent = item.summary;
  $('#projectCategory').textContent = item.category;
  $('#artKicker').textContent = item.artKicker;
  $('#artBig').textContent = item.artBig;
  $('#projectVisual').classList.toggle('orange', item.theme === 'orange');
  const preview = $('#assetPlaceholder');
  if (item.image) {
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.alt = `${item.title} 실제 작업물`;
    img.loading = 'lazy';
    img.src = item.image;
    img.onerror = () => preview.textContent = '이미지 파일을 찾을 수 없습니다. app.js의 image 경로를 확인하세요.';
    preview.append(img);
  } else {
    preview.innerHTML = '<span aria-hidden="true">▧</span><p>실제 작업물 이미지 또는 PDF를 이곳에 연결할 수 있어요.</p><small>현재 화면은 사이트 인터랙션 확인용 데모입니다.</small>';
  }
  $('#nextProject').textContent = id === 'yonggari' ? '당근마켓 광고 역기획 보기 →' : '용가리치킨 상세페이지 보기 →';
  projectModal.classList.add('is-open');
  projectModal.setAttribute('aria-hidden','false');
  projectSheet.focus({preventScroll:true});
}
function openProject(id, updateHash = true) {
  if (!projectData[id]) return;
  previousFocus = document.activeElement;
  mapUnlocked = true;
  setScene('map');
  closeMenu();
  renderProject(id);
  if (updateHash) setHash(`#work/${id}`);
}
function closeProject(restoreFocus = true) {
  const wasOpen = projectModal.classList.contains('is-open');
  projectModal.classList.remove('is-open');
  projectModal.setAttribute('aria-hidden','true');
  activeProject = null;
  if (restoreFocus && wasOpen && previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
}

function routeFromHash() {
  const hash = decodeURIComponent(location.hash || '');
  if (hash.startsWith('#work/')) {
    const id = hash.slice(6);
    if (projectData[id]) { openProject(id, false); return; }
  }
  if (hash === '#map') { goMap(false); return; }
  if (hash === '#studio') { mapUnlocked = true; showGreeting(false); return; }
  startIntro();
}

$$('[data-project]', mapBoard).forEach(hit => {
  const id = hit.dataset.project;
  const name = projectData[id].title;
  const hoverIn = () => { mapBoard.dataset.hover = id; caption.textContent = `${name} · 클릭해서 작품 보기 ↗`; };
  const hoverOut = () => { if (mapBoard.dataset.hover === id) { mapBoard.dataset.hover = ''; caption.textContent = ''; } };
  hit.addEventListener('pointerenter', hoverIn);
  hit.addEventListener('pointerleave', hoverOut);
  hit.addEventListener('focus', hoverIn);
  hit.addEventListener('blur', hoverOut);
  hit.addEventListener('click', () => openProject(id));
});

$('#goMapFromGreeting').addEventListener('click', () => goMap());
$('#replayBtn').addEventListener('click', replayIntro);
$('#profileToggle').addEventListener('click', openContact);
$('#mapToggle').addEventListener('click', toggleMap);
$('#closeContact').addEventListener('click', () => closeContact());
contactModal.querySelector('[data-close="contact"]').addEventListener('click', () => closeContact());
$('#menuToggle').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
$$('[data-open-work]').forEach(btn => btn.addEventListener('click', () => openProject(btn.dataset.openWork)));
$('#backToMap').addEventListener('click', () => { closeProject(); setHash('#map'); });
$('#closeProject').addEventListener('click', () => { closeProject(); setHash('#map'); });
$('#nextProject').addEventListener('click', () => openProject(activeProject === 'yonggari' ? 'daangn' : 'yonggari'));
projectModal.querySelector('[data-close="true"]').addEventListener('click', () => { closeProject(); setHash('#map'); });
window.addEventListener('popstate', routeFromHash);
window.addEventListener('hashchange', routeFromHash);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-wrap')) closeMenu();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (projectModal.classList.contains('is-open')) { closeProject(); setHash('#map'); }
    else if (contactModal.classList.contains('is-open')) closeContact();
    else closeMenu();
  }
});

renderContacts();
loadVisited();
updateVisitedUI();
routeFromHash();
