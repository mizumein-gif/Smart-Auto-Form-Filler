/* ══════════════════════════════════════════
   FIREBASE INIT
══════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAxGMWVhvUbqOdKuxAU7PIHD_mK-qi0mrE",
  authDomain: "auto-form-filler-d9c72.firebaseapp.com",
  projectId: "auto-form-filler-d9c72",
  storageBucket: "auto-form-filler-d9c72.firebasestorage.app",
  messagingSenderId: "478048198589",
  appId: "1:478048198589:web:fb9dfdd171230201607cd4"
};
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const ADMIN_EMAIL = 'mizumein.dimla@gmail.com';

const FIELD_IDS = [
  'f-name-en','f-name-bn','f-father-en','f-father-bn','f-mother-en','f-mother-bn',
  'f-dob','f-nid','f-birth-reg','f-mobile','f-mobile-confirm','f-email',
  'f-nationality','f-religion','f-gender','f-marital',
  'f-careof','f-village','f-district','f-upazila','f-postoffice','f-postcode',
  'f-perm-careof','f-perm-village','f-perm-district','f-perm-upazila','f-perm-postoffice','f-perm-postcode',
  'f-jsc-exam','f-jsc-board','f-jsc-roll','f-jsc-group','f-jsc-result','f-jsc-gpa','f-jsc-year','f-jsc-institute',
  'f-ssc-exam','f-ssc-board','f-ssc-roll','f-ssc-group','f-ssc-result','f-ssc-gpa','f-ssc-year','f-ssc-institute',
  'f-hsc-exam','f-hsc-board','f-hsc-roll','f-hsc-group','f-hsc-result','f-hsc-gpa','f-hsc-year','f-hsc-institute',
  'f-diploma-exam','f-diploma-board','f-diploma-group','f-diploma-result','f-diploma-gpa','f-diploma-year','f-diploma-institute',
  'f-grad-exam','f-grad-univ','f-grad-subject','f-grad-result','f-grad-gpa','f-grad-year',
  'f-masters-exam','f-masters-univ','f-masters-subject','f-masters-result','f-masters-gpa','f-masters-year'
];

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const S = {
  user: null,
  isAdmin: false,
  firstName: '',
  lastName: '',
  profiles: {},
  profileId: null,
  activeProfileId: null,
  defaultProfileId: null,
  customSections: [],
  features: { sharing: true, education: true, address: true },
  activeDropdownId: null,
  screenBeforeDevops: 'screen-profiles'
};

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function el(id){ return document.getElementById(id); }
function show(id){ const e=el(id); if(e) e.classList.remove('hidden'); }
function hide(id){ const e=el(id); if(e) e.classList.add('hidden'); }

function showLoading(text) {
  el('overlay-loading-text').textContent = text || 'Loading...';
  el('overlay-loading').classList.add('show');
}
function hideLoading() {
  el('overlay-loading').classList.remove('show');
}

function showConfirm(title, msg, onYes, dangerBtn) {
  el('modal-title').textContent = title;
  el('modal-msg').textContent   = msg;
  const yesBtn = el('modal-yes');
  yesBtn.className = 'modal-btn ' + (dangerBtn ? 'modal-btn-danger' : 'modal-btn-yes');
  el('modal-overlay').classList.add('show');
  yesBtn.onclick = () => { el('modal-overlay').classList.remove('show'); onYes(); };
  el('modal-no').onclick = () => el('modal-overlay').classList.remove('show');
}

function showFormStatus(msg, isErr) {
  const e = el('form-status');
  e.textContent = msg;
  e.style.color = isErr ? 'var(--danger)' : 'var(--primary)';
  clearTimeout(e._t);
  e._t = setTimeout(() => { e.textContent = ''; }, 3500);
}

function setExpandMsg(id, msg, isErr) {
  const e = el(id);
  if (e) { e.textContent = msg; e.style.color = isErr ? 'var(--danger)' : 'var(--primary)'; }
}

function setErr(id, msg) {
  const e = el(id);
  if (e) e.textContent = msg || '';
}

/* ══════════════════════════════════════════
   SCREEN NAVIGATION
══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = el(id);
  if (target) { target.style.display = 'flex'; target.classList.add('active'); }
  closeAllDropdowns();
}

function openPanel(id) {
  closeAllDropdowns();
  el(id).classList.add('open');
}

function closePanel(id) {
  const panel = el(id);
  if (panel) panel.classList.remove('open');
  document.querySelectorAll('#' + id + ' .panel-expand').forEach(p => p.classList.remove('open'));
}

function closeAccountPanel() {
  closePanel('panel-account');
}

/* ══════════════════════════════════════════
   DROPDOWN MENUS
══════════════════════════════════════════ */
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu').forEach(d => d.remove());
  S.activeDropdownId = null;
}

function openProfileDropdown(profileId, anchorBtn) {
  closeAllDropdowns();
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.innerHTML =
    '<button class="dropdown-item" data-action="rename">&#9998; Rename Profile</button>' +
    '<button class="dropdown-item" data-action="photo">&#128247; Add Profile Picture</button>' +
    '<button class="dropdown-item" data-action="default">&#11088; Make Default</button>' +
    '<button class="dropdown-item danger" data-action="delete">&#128465; Remove Profile</button>' +
    '<button class="dropdown-item" data-action="cv">&#128196; Export as CV</button>';

  const card = anchorBtn.closest('.profile-card');
  card.style.position = 'relative';
  card.appendChild(menu);
  S.activeDropdownId = profileId;

  menu.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    closeAllDropdowns();
    if (action === 'rename')  openRenameModal(profileId);
    else if (action === 'photo')   triggerProfilePhoto(profileId);
    else if (action === 'default') setDefaultProfile(profileId);
    else if (action === 'delete')  deleteProfile(profileId);
    else if (action === 'cv')      exportProfileCV(profileId);
  });

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        closeAllDropdowns();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

/* ══════════════════════════════════════════
   PASSWORD STRENGTH
══════════════════════════════════════════ */
function pwRules(pw) {
  return { len:pw.length>=8, upper:/[A-Z]/.test(pw), lower:/[a-z]/.test(pw), num:/[0-9]/.test(pw), special:/[!@#$%^&*]/.test(pw) };
}

function updateStrengthUI(pw) {
  const r = pwRules(pw);
  const passed = Object.values(r).filter(Boolean).length;
  const bar = el('strength-bar'); const lbl = el('strength-label');
  if (bar) {
    bar.style.width = (passed/5*100)+'%';
    if (passed<=2)      { bar.style.background='#EF5350'; if(lbl){lbl.textContent='Weak';lbl.style.color='#EF5350';} }
    else if (passed<=3) { bar.style.background='#FFA726'; if(lbl){lbl.textContent='Medium';lbl.style.color='#FFA726';} }
    else if (passed<=4) { bar.style.background='var(--primary)'; if(lbl){lbl.textContent='Strong';lbl.style.color='var(--primary)';} }
    else                { bar.style.background='var(--primary-d)'; if(lbl){lbl.textContent='Very Strong';lbl.style.color='var(--primary-d)';} }
  }
  el('r-len')&&el('r-len').classList.toggle('ok',r.len);
  el('r-up')&&el('r-up').classList.toggle('ok',r.upper);
  el('r-low')&&el('r-low').classList.toggle('ok',r.lower);
  el('r-num')&&el('r-num').classList.toggle('ok',r.num);
  el('r-sym')&&el('r-sym').classList.toggle('ok',r.special);
  if (el('btn-register')) el('btn-register').disabled = passed < 5;
  return r;
}

/* ══════════════════════════════════════════
   AUTH — LOGIN
══════════════════════════════════════════ */
async function doLogin() {
  const email = el('li-email').value.trim();
  const pass  = el('li-pass').value;
  if (!email || !pass) { setErr('li-error','Please enter email and password.'); return; }
  setErr('li-error','');
  showLoading('Logging in...');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(err) {
    hideLoading();
    const code = err.code||'';
    if (code==='auth/user-not-found'||code==='auth/wrong-password'||code==='auth/invalid-credential')
      setErr('li-error','Incorrect email or password.');
    else if (code==='auth/invalid-email') setErr('li-error','Invalid email address.');
    else setErr('li-error',err.message);
  }
}

/* ══════════════════════════════════════════
   AUTH — REGISTER
══════════════════════════════════════════ */
async function doRegister() {
  const first=el('rg-first').value.trim(), last=el('rg-last').value.trim();
  const email=el('rg-email').value.trim(), pass=el('rg-pass').value, confirm=el('rg-confirm').value;
  if (!first||!last) { setErr('rg-error','First Name and Last Name are required.'); return; }
  if (!email)        { setErr('rg-error','Please enter your email.'); return; }
  const r=pwRules(pass);
  if (!r.len)  { setErr('rg-error','Password must be at least 8 characters.'); return; }
  if (!r.upper||!r.lower||!r.num||!r.special) { setErr('rg-error','Password is weak! Use uppercase, lowercase, number and symbol.'); return; }
  if (pass!==confirm) { setErr('rg-error','Passwords do not match.'); return; }
  setErr('rg-error','');
  showLoading('Creating your account...');
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const displayName = first+' '+last;
    await cred.user.updateProfile({ displayName });
    await db.collection('userRegistry').doc(cred.user.uid).set({
      email, firstName:first, lastName:last, displayName,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin:firebase.firestore.FieldValue.serverTimestamp()
    });
    const ref = await db.collection('users').doc(cred.user.uid).collection('profiles')
      .add({ name:first+"'s Profile", data:{}, customSectionValues:{}, shareCode:'', isDefault:true });
    await db.collection('users').doc(cred.user.uid).set({ defaultProfileId:ref.id }, { merge:true });
  } catch(err) {
    hideLoading();
    const code=err.code||'';
    if (code==='auth/email-already-in-use') setErr('rg-error','This email is already registered.');
    else if (code==='auth/invalid-email')   setErr('rg-error','Enter a valid email address.');
    else if (code==='auth/weak-password')   setErr('rg-error','Make a stronger password.');
    else setErr('rg-error',err.message);
  }
}

/* ══════════════════════════════════════════
   AUTH — FORGOT PASSWORD
══════════════════════════════════════════ */
async function doForgotPassword() {
  const email = el('fp-email').value.trim();
  if (!email) { setErr('fp-error','Enter your email address.'); return; }
  hide('fp-ok'); setErr('fp-error','');
  try {
    await auth.sendPasswordResetEmail(email);
    show('fp-ok');
  } catch(err) {
    if ((err.code||'').includes('user-not-found')) setErr('fp-error','Email not found.');
    else setErr('fp-error',err.message);
  }
}

/* ══════════════════════════════════════════
   AUTH — LOGOUT
══════════════════════════════════════════ */
function doLogout() {
  showConfirm('Logout','Are you sure you want to logout?', () => {
    // Clear user-specific photo cache on logout
    chrome.storage.local.remove(['accountPhotoURL']);
    S._localPhotoURL = null;
    auth.signOut();
    closeAccountPanel();
  }, true);
}

/* ══════════════════════════════════════════
   AUTH — DELETE ACCOUNT
══════════════════════════════════════════ */
async function doDeleteAccount() {
  showConfirm('Delete Account',
    'This will permanently delete your account and all your data. This cannot be undone. Are you sure?',
    async () => {
      showLoading('Deleting account...');
      try {
        const uid = S.user.uid;
        // Delete all profiles
        const profilesSnap = await db.collection('users').doc(uid).collection('profiles').get();
        const deletes = profilesSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(deletes);
        // Delete user doc
        await db.collection('users').doc(uid).delete();
        // Delete from userRegistry
        await db.collection('userRegistry').doc(uid).delete();
        // Delete Firebase Auth user
        await S.user.delete();
      } catch(e) {
        hideLoading();
        alert('Error deleting account: ' + e.message + '\n\nIf this persists, please re-login and try again.');
      }
    }, true
  );
}

/* ══════════════════════════════════════════
   SETUP AFTER LOGIN
══════════════════════════════════════════ */
async function setupAfterLogin(user) {
  try {
    await db.collection('userRegistry').doc(user.uid).set({
      lastLogin:firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
  } catch(e) {}

  try {
    const snap = await db.collection('userRegistry').doc(user.uid).get();
    if (snap.exists) {
      S.firstName=snap.data().firstName||'';
      S.lastName=snap.data().lastName||'';
      // Load this user's photo specifically — store with UID key so different users don't share
      const firestorePhoto = snap.data().photoURL || null;
      const storageKey = 'accountPhotoURL_' + user.uid;
      if (firestorePhoto) {
        chrome.storage.local.set({ [storageKey]: firestorePhoto, accountPhotoURL: firestorePhoto });
        S._localPhotoURL = firestorePhoto;
      } else {
        // Load from UID-specific key only
        chrome.storage.local.get([storageKey], result => {
          if (result[storageKey]) {
            chrome.storage.local.set({ accountPhotoURL: result[storageKey] });
            S._localPhotoURL = result[storageKey];
          } else {
            // Clear any leftover photo from another user
            chrome.storage.local.remove(['accountPhotoURL']);
            S._localPhotoURL = null;
          }
        });
      }
    } else {
      // No registry entry — clear leftover photo
      chrome.storage.local.remove(['accountPhotoURL']);
      S._localPhotoURL = null;
    }
  } catch(e) {}
  if (!S.firstName && user.displayName) { const p=user.displayName.split(' '); S.firstName=p[0]||''; S.lastName=p.slice(1).join(' ')||''; }
  if (!S.firstName) S.firstName = user.email.split('@')[0];

  S.isAdmin = (user.email === ADMIN_EMAIL);

  await loadUiSettings();
  await loadFeatureFlags();
  await loadProfiles();

  renderProfileListScreen();
  showScreen('screen-profiles');
  hideLoading();
}

/* ══════════════════════════════════════════
   PROFILE LIST SCREEN
══════════════════════════════════════════ */
function renderProfileListScreen() {
  el('profiles-welcome').textContent = 'Welcome back, '+S.firstName+'!';
  updateAvatarButtons();
  renderProfileCards();
}

function updateAvatarButtonsWithPhoto(photoURL) {
  const letter = (S.firstName||(S.user&&S.user.email)||'?')[0].toUpperCase();
  ['btn-open-acct-profiles','btn-open-acct-form'].forEach(id => {
    const btn = el(id); if (!btn) return;
    if (photoURL) btn.innerHTML = '<img src="'+esc(photoURL)+'" alt=""/>';
    else btn.textContent = letter;
  });
}

function updateAvatarButtons() {
  if (!S.user) return;
  // Check local cached photo first, then Firestore
  chrome.storage.local.get(['accountPhotoURL'], result => {
    const photo = result.accountPhotoURL || S._localPhotoURL || S.user.photoURL || null;
    updateAvatarButtonsWithPhoto(photo);
  });
}

function renderProfileCards() {
  const list = el('profile-list');
  list.innerHTML = '';
  const ids = Object.keys(S.profiles);
  if (ids.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--sub-text);font-size:12px;padding:20px 0;">No profiles yet. Create one below.</div>';
    return;
  }
  ids.sort((a,b) => { if(a===S.defaultProfileId) return -1; if(b===S.defaultProfileId) return 1; return 0; });
  ids.forEach(id => {
    const p = S.profiles[id];
    const name = p.name||'Unnamed';
    const letter = name[0].toUpperCase();
    const isDefault = id === S.defaultProfileId;
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = id;
    card.innerHTML =
      '<div class="profile-avatar">'+(p.photoURL?'<img src="'+esc(p.photoURL)+'" alt=""/>':letter)+'</div>'+
      '<div class="profile-info">'+
        '<div class="profile-name-row"><span class="profile-name">'+esc(name)+'</span>'+(isDefault?'<span class="badge-default">Default</span>':'')+'</div>'+
        '<div class="profile-sub">Profile</div>'+
      '</div>'+
      '<button class="profile-menu-btn" title="Options">&#8942;</button>';
    card.addEventListener('click', e => {
      if (e.target.classList.contains('profile-menu-btn')||e.target.closest('.dropdown-menu')) return;
      S.activeProfileId = id;
      openFormScreen(id);
    });
    card.querySelector('.profile-menu-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (S.activeDropdownId===id) { closeAllDropdowns(); return; }
      openProfileDropdown(id, e.currentTarget);
    });
    list.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   FORM SCREEN
══════════════════════════════════════════ */
function openFormScreen(profileId) {
  if (!S.profiles[profileId]) return;
  S.profileId = profileId;
  S.activeProfileId = profileId;
  const p = S.profiles[profileId];
  el('form-screen-profile-name').textContent = p.name||'Profile';
  updateAvatarButtons();
  loadProfileIntoForm(profileId);
  loadAndRenderCustomSections(profileId);
  applyFeatureFlags();
  el('form-screen-body').scrollTop = 0;
  showScreen('screen-form');
}

function loadProfileIntoForm(id) {
  if (!id||!S.profiles[id]) return;
  const data = S.profiles[id].data||{};
  restoreResultSelects(data);
  FIELD_IDS.forEach(fid => {
    const inp = el(fid);
    if (inp) inp.value = data[fid]!==undefined ? data[fid] : '';
  });
  el('form-status').textContent='';
}

function getFormData() {
  const d={};
  FIELD_IDS.forEach(id => { const e=el(id); if(e) d[id]=(e.value||'').trim(); });
  return d;
}

async function saveProfile() {
  if (!S.user||!S.profileId) return;
  const data = getFormData();
  const customSectionValues = getCustomSectionValues();
  S.profiles[S.profileId]=S.profiles[S.profileId]||{};
  S.profiles[S.profileId].data=data;
  S.profiles[S.profileId].customSectionValues=customSectionValues;
  await db.collection('users').doc(S.user.uid).collection('profiles').doc(S.profileId)
    .set(S.profiles[S.profileId],{merge:true});
  await chrome.storage.local.set({
    formFillData: data,
    customSections: S.customSections,
    customSectionValues: customSectionValues
  });
  showFormStatus('✓ Profile saved!');
}

/* ══════════════════════════════════════════
   FIRESTORE: PROFILES
══════════════════════════════════════════ */
async function loadProfiles() {
  if (!S.user) return;
  var _safetyTimer = setTimeout(function() {
    var loadingEl = document.getElementById('overlay-loading') || document.querySelector('.loading');
    if (loadingEl && (loadingEl.classList.contains('show') || loadingEl.style.display !== 'none')) {
      hideLoading();
      renderProfileListScreen();
      showScreen('screen-profiles');
    }
  }, 5000);
  try {
    const userDoc = await db.collection('users').doc(S.user.uid).get();
    S.defaultProfileId = userDoc.exists ? (userDoc.data().defaultProfileId||null) : null;
  } catch(e) {}
  try {
    const snap = await db.collection('users').doc(S.user.uid).collection('profiles').get();
    S.profiles={};
    snap.forEach(doc => { S.profiles[doc.id]=doc.data(); });
    if (Object.keys(S.profiles).length===0) {
      const ref = await db.collection('users').doc(S.user.uid).collection('profiles')
        .add({ name:S.firstName+"'s Profile", data:{}, customSectionValues:{}, shareCode:'', isDefault:true });
      S.profiles[ref.id]={ name:S.firstName+"'s Profile", data:{}, customSectionValues:{}, shareCode:'' };
      S.defaultProfileId=ref.id;
      await db.collection('users').doc(S.user.uid).set({defaultProfileId:ref.id},{merge:true});
    }
    if (!S.defaultProfileId||!S.profiles[S.defaultProfileId]) {
      S.defaultProfileId=Object.keys(S.profiles)[0];
      await db.collection('users').doc(S.user.uid).set({defaultProfileId:S.defaultProfileId},{merge:true});
    }
  } catch(e) {
    S.profiles = S.profiles || {};
  }
  clearTimeout(_safetyTimer);
}

async function createProfile(name) {
  const ref = await db.collection('users').doc(S.user.uid).collection('profiles')
    .add({name:name.trim(), data:{}, customSectionValues:{}, shareCode:''});
  S.profiles[ref.id]={name:name.trim(), data:{}, customSectionValues:{}, shareCode:''};
  if (Object.keys(S.profiles).length===1) {
    S.defaultProfileId=ref.id;
    await db.collection('users').doc(S.user.uid).set({defaultProfileId:ref.id},{merge:true});
  }
  renderProfileCards();
  return ref.id;
}

async function renameProfile(profileId, newName) {
  if (!newName||!S.profiles[profileId]) return;
  S.profiles[profileId].name=newName.trim();
  await db.collection('users').doc(S.user.uid).collection('profiles').doc(profileId)
    .set({name:newName.trim()},{merge:true});
  renderProfileCards();
  if (profileId===S.profileId) el('form-screen-profile-name').textContent=newName.trim();
}

async function setDefaultProfile(profileId) {
  S.defaultProfileId=profileId;
  await db.collection('users').doc(S.user.uid).set({defaultProfileId:profileId},{merge:true});
  renderProfileCards();
}

async function deleteProfile(profileId) {
  const pname=S.profiles[profileId]?.name||'this profile';
  showConfirm('Remove Profile','Delete "'+pname+'"? This cannot be undone.', async () => {
    await db.collection('users').doc(S.user.uid).collection('profiles').doc(profileId).delete();
    delete S.profiles[profileId];
    if (S.defaultProfileId===profileId) {
      const ids=Object.keys(S.profiles);
      S.defaultProfileId=ids.length>0?ids[0]:null;
      if (S.defaultProfileId) await db.collection('users').doc(S.user.uid).set({defaultProfileId:S.defaultProfileId},{merge:true});
    }
    if (S.profileId===profileId) S.profileId=null;
    if (S.activeProfileId===profileId) S.activeProfileId=null;
    renderProfileCards();
  }, true);
}

function triggerProfilePhoto(profileId) {
  const input=document.createElement('input');
  input.type='file'; input.accept='image/*';
  input.onchange=async () => {
    const file=input.files[0]; if(!file) return;
    if(file.size>200*1024){alert('Image too large. Use an image under 200KB.');return;}
    const reader=new FileReader();
    reader.onload=async e => {
      const b64=e.target.result;
      S.profiles[profileId].photoURL=b64;
      await db.collection('users').doc(S.user.uid).collection('profiles').doc(profileId)
        .set({photoURL:b64},{merge:true});
      renderProfileCards();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function exportProfileCV(profileId) {
  const p=S.profiles[profileId]; if(!p) return;
  const d=p.data||{}, name=p.name||'Profile';
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>'+esc(name)+' - CV</title>'+
    '<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;color:#212121;font-size:13px;}'+
    'h1{font-size:22px;color:#2E7D32;margin-bottom:4px;}.sub{color:#757575;font-size:12px;margin-bottom:20px;}'+
    'h2{font-size:14px;color:#2E7D32;border-bottom:2px solid #E8F5E9;padding-bottom:4px;margin:16px 0 8px;}'+
    '.r{display:flex;gap:8px;margin-bottom:5px;font-size:12px;}.l{font-weight:600;color:#424242;min-width:160px;}'+
    'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}'+
    'th{background:#2E7D32;color:#fff;padding:6px 8px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #E0E0E0;}'+
    '@media print{body{margin:20px;}}</style></head><body>'+
    '<h1>'+esc(d['f-name-en']||name)+'</h1>'+
    '<div class="sub">'+esc(d['f-email']||'')+(d['f-mobile']?' · '+esc(d['f-mobile']):'')+'</div>'+
    '<h2>Personal Information</h2>'+r('Name (Bangla)',d['f-name-bn'])+r("Father's Name",d['f-father-en'])+r("Mother's Name",d['f-mother-en'])+r('Date of Birth',d['f-dob'])+r('NID',d['f-nid'])+r('Religion',d['f-religion'])+r('Nationality',d['f-nationality'])+r('Gender',d['f-gender'])+r('Marital Status',d['f-marital'])+
    '<h2>Present Address</h2>'+r('Village/Road',d['f-village'])+r('Upazila',d['f-upazila'])+r('District',d['f-district'])+r('Post Office',(d['f-postoffice']||'')+(d['f-postcode']?' - '+d['f-postcode']:'')).trim()+
    '<h2>Education</h2><table><tr><th>Level</th><th>Board/Univ.</th><th>Group/Subject</th><th>Result</th><th>GPA</th><th>Year</th></tr>'+
    er('SSC',d['f-ssc-exam'],d['f-ssc-board'],d['f-ssc-group'],d['f-ssc-result'],d['f-ssc-gpa'],d['f-ssc-year'])+
    er('HSC',d['f-hsc-exam'],d['f-hsc-board'],d['f-hsc-group'],d['f-hsc-result'],d['f-hsc-gpa'],d['f-hsc-year'])+
    er('Graduation',d['f-grad-exam'],d['f-grad-univ'],d['f-grad-subject'],d['f-grad-result'],d['f-grad-gpa'],d['f-grad-year'])+
    er('Masters',d['f-masters-exam'],d['f-masters-univ'],d['f-masters-subject'],d['f-masters-result'],d['f-masters-gpa'],d['f-masters-year'])+
    '</table><script>window.print();<\/script></body></html>';
  const blob=new Blob([html],{type:'text/html'});
  window.open(URL.createObjectURL(blob),'_blank');
}
function r(label,val){ if(!val) return ''; return '<div class="r"><span class="l">'+label+'</span><span>'+esc(val)+'</span></div>'; }
function er(level,exam,board,group,result,gpa,year){ if(!exam&&!result) return ''; return '<tr><td>'+esc(level+(exam?': '+exam:''))+'</td><td>'+esc(board||'')+'</td><td>'+esc(group||'')+'</td><td>'+esc(result||'')+'</td><td>'+esc(gpa||'')+'</td><td>'+esc(year||'')+'</td></tr>'; }

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function openNewProfileModal() {
  el('new-profile-name').value='';
  el('modal-new-profile').style.display='flex';
  setTimeout(()=>el('new-profile-name').focus(),50);
}
function closeNewProfileModal() { el('modal-new-profile').style.display='none'; }
function openRenameModal(profileId) {
  el('rename-profile-name').value=S.profiles[profileId]?.name||'';
  el('modal-rename-profile').style.display='flex';
  el('modal-rename-profile').dataset.profileId=profileId;
  setTimeout(()=>el('rename-profile-name').focus(),50);
}
function closeRenameModal() { el('modal-rename-profile').style.display='none'; }

/* ══════════════════════════════════════════
   CUSTOM SECTIONS (Firestore-based)
══════════════════════════════════════════ */
async function loadAndRenderCustomSections(profileId) {
  try {
    const snap = await db.collection('customSections').get();
    S.customSections = [];
    snap.forEach(doc => {
      S.customSections.push({ id: doc.id, ...doc.data() });
    });
    S.customSections.sort((a, b) => {
      const as = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      const bs = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return as - bs;
    });
  } catch(e) { S.customSections = []; }

  // Also load local (My Account) sections from chrome.storage.local
  try {
    const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
    const mySections = local.myCustomSections || [];
    // Merge: avoid duplicates by id
    const existingIds = new Set(S.customSections.map(s => s.id));
    mySections.forEach(sec => {
      if (!existingIds.has(sec.id)) {
        S.customSections.push(sec);
      }
    });
  } catch(e) { /* local storage unavailable, skip */ }

  renderCustomSectionsInForm(profileId);
}

function getCustomSectionValues() {
  const values = {};
  S.customSections.forEach(sec => {
    values[sec.id] = {};
    (sec.fields||[]).forEach(field => {
      const inp = el('csf-' + sec.id + '-' + field.id);
      if (inp) values[sec.id][field.id] = inp.value || '';
    });
  });
  return values;
}

function renderCustomSectionsInForm(profileId) {
  const container = el('sec-custom-sections');
  if (!container) return;
  container.innerHTML = '';
  if (S.customSections.length === 0) return;

  const savedValues = (S.profiles[profileId] && S.profiles[profileId].customSectionValues)
    ? S.profiles[profileId].customSectionValues : {};

  S.customSections.forEach(sec => {
    const secValues = savedValues[sec.id] || {};
    const div = document.createElement('div');
    div.className = 'section';

    let fieldsHtml = '';
    (sec.fields||[]).forEach(field => {
      const val = esc(secValues[field.id] || '');
      const inputId = 'csf-' + sec.id + '-' + field.id;
      fieldsHtml +=
        '<div class="field-row">' +
          '<label class="field-label">' + esc(field.name) + '</label>' +
          '<input class="field-input" id="' + inputId + '" type="text" value="' + val + '" placeholder="Enter value"/>' +
        '</div>';
    });
    if (!fieldsHtml) {
      fieldsHtml = '<div style="font-size:11px;color:var(--sub-text);padding:4px 0;">No fields in this section yet.</div>';
    }

    div.innerHTML =
      '<div class="section-hdr"><span>' + esc(sec.name) + '</span><span class="chevron">&#9660;</span></div>' +
      '<div class="section-body">' + fieldsHtml + '</div>';

    div.querySelector('.section-hdr').addEventListener('click', () => div.classList.toggle('open'));
    container.appendChild(div);
  });
}

/* ══════════════════════════════════════════
   FILL FORM
══════════════════════════════════════════ */
async function fillForm() {
  if (!S.activeProfileId) { showFormStatus('No profile selected.',true); return; }
  if (!S.profiles[S.activeProfileId]) { showFormStatus('Profile not found.',true); return; }
  const data = getFormData();
  const customSectionValues = getCustomSectionValues();
  await chrome.storage.local.set({
    formFillData: data,
    customSections: S.customSections,
    customSectionValues: customSectionValues
  });
  chrome.tabs.query({active:true,currentWindow:true}, tabs => {
    if (!tabs[0]) { showFormStatus('No active tab.',true); return; }
    chrome.tabs.sendMessage(tabs[0].id,{action:'fill'}, response => {
      if (chrome.runtime.lastError) showFormStatus('Open the form page first, then click Fill.',true);
      else showFormStatus('✓ Form filled! (Profile: '+esc(S.profiles[S.activeProfileId].name||'')+ ')');
    });
  });
}

function resetForm() {
  showConfirm('Reset Form','Clear all fields in this profile?', () => {
    FIELD_IDS.forEach(id=>{ const e=el(id); if(e) e.value=''; });
    const container = el('sec-custom-sections');
    if (container) container.querySelectorAll('.field-input').forEach(inp => { inp.value = ''; });
    showFormStatus('Form reset.');
  });
}

/* ══════════════════════════════════════════
   ACCOUNT PANEL
══════════════════════════════════════════ */
function openAccountPanel() {
  if (!S.user) return;
  const u=S.user;
  const letter=(S.firstName||u.email)[0].toUpperCase();
  const avatarCircle=el('acct-avatar-circle');
  // Load photo from Firestore/local cache (Firebase Auth doesn't support large base64)
  chrome.storage.local.get(['accountPhotoURL'], function(result) {
    const photo = result.accountPhotoURL || S._localPhotoURL || u.photoURL || null;
    if (photo) avatarCircle.innerHTML='<img src="'+esc(photo)+'" alt=""/>';
    else avatarCircle.textContent=letter;
  });
  const fullName=(S.firstName&&S.lastName)?S.firstName+' '+S.lastName:(S.firstName||u.email.split('@')[0]);
  el('acct-full-name').textContent=fullName;
  el('acct-email').textContent=u.email;
  el('inp-display-name').value=fullName;
  if (S.isAdmin) { show('mi-dev-opts-wrap'); hide('mi-delete-acct-wrap'); }
  else { hide('mi-dev-opts-wrap'); show('mi-delete-acct-wrap'); }
  document.querySelectorAll('#panel-account .panel-expand').forEach(p=>p.classList.remove('open'));
  openPanel('panel-account');
}

async function uploadAccountAvatar(file) {
  if (!file) return;
  if (file.size > 250*1024) { alert('Image too large. Max size is 250KB.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    if (window._showCropModal) window._showCropModal(e.target.result);
  };
  reader.readAsDataURL(file);
}

async function saveDisplayName() {
  const name=el('inp-display-name').value.trim(); if(!name) return;
  const parts=name.split(' ');
  S.firstName=parts[0]||S.firstName; S.lastName=parts.slice(1).join(' ')||'';
  try {
    await S.user.updateProfile({displayName:name});
    await db.collection('userRegistry').doc(S.user.uid).set({firstName:S.firstName,lastName:S.lastName,displayName:name},{merge:true});
    el('acct-full-name').textContent=name;
    updateAvatarButtons();
    el('profiles-welcome').textContent='Welcome back, '+S.firstName+'!';
    setExpandMsg('msg-display-name','✓ Name updated!');
  } catch(e){ setExpandMsg('msg-display-name',e.message,true); }
}

async function changePassword() {
  const curPw=el('inp-cur-pw').value, newPw=el('inp-new-pw').value, confPw=el('inp-conf-pw').value;
  if (!curPw||!newPw){setExpandMsg('change-pw-error','Fill all fields.',true);return;}
  const r=pwRules(newPw);
  if (!r.len||!r.upper||!r.lower||!r.num||!r.special){setExpandMsg('change-pw-error','New password is too weak.',true);return;}
  if (newPw!==confPw){setExpandMsg('change-pw-error','Passwords do not match.',true);return;}
  try {
    const cred=firebase.auth.EmailAuthProvider.credential(S.user.email,curPw);
    await S.user.reauthenticateWithCredential(cred);
    await S.user.updatePassword(newPw);
    setExpandMsg('change-pw-error','✓ Password updated!');
    el('inp-cur-pw').value=''; el('inp-new-pw').value=''; el('inp-conf-pw').value='';
  } catch(e){ setExpandMsg('change-pw-error',e.message,true); }
}

async function changeEmail() {
  const newEmail=el('inp-new-email').value.trim(), pw=el('inp-email-pw').value;
  if (!newEmail||!pw){setExpandMsg('change-email-error','Fill all fields.',true);return;}
  try {
    const cred=firebase.auth.EmailAuthProvider.credential(S.user.email,pw);
    await S.user.reauthenticateWithCredential(cred);
    await S.user.verifyBeforeUpdateEmail(newEmail);
    setExpandMsg('change-email-error','✓ Verification sent to '+newEmail);
  } catch(e){ setExpandMsg('change-email-error',e.message,true); }
}

/* ══════════════════════════════════════════
   DEVELOPER OPTIONS SCREEN NAVIGATION
══════════════════════════════════════════ */
function openDevOptions() {
  const activeScreen = document.querySelector('.screen.active');
  S.screenBeforeDevops = activeScreen ? activeScreen.id : 'screen-profiles';
  closeAccountPanel();
  showScreen('screen-devops');
  loadUsers();
}

function closeDevOptionsBack() {
  showScreen(S.screenBeforeDevops);
  setTimeout(() => openAccountPanel(), 50);
}

function closeDevOptionsX() {
  showScreen(S.screenBeforeDevops);
}

/* ══════════════════════════════════════════
   ADMIN: UI SETTINGS
══════════════════════════════════════════ */
async function loadUiSettings() {
  // Load admin/global settings from Firestore first
  let adminSettings = null;
  try {
    const snap=await db.collection('adminConfig').doc('uiSettings').get();
    if (snap.exists) adminSettings = snap.data();
  } catch(e){}

  // Load personal override (wins over admin settings)
  let personalSettings = null;
  try {
    const local = await new Promise(res => chrome.storage.local.get(['myUiSettings'], res));
    if (local.myUiSettings) personalSettings = JSON.parse(local.myUiSettings);
  } catch(e) {}

  // Merge: personal wins where set, admin fills the rest
  const d = Object.assign({}, adminSettings||{}, personalSettings||{});

  // Apply defaults if nothing set
  if (!d.fontFamily) d.fontFamily = "'Times New Roman',Times,serif";
  if (!d.fontSize) d.fontSize = 13;

  if (d.bgColor)  document.documentElement.style.setProperty('--page-bg',d.bgColor);
  if (d.btnColor) document.documentElement.style.setProperty('--btn-bg',d.btnColor);
  if (d.hdrColor) document.documentElement.style.setProperty('--section-hdr',d.hdrColor);
  if (d.textColor) document.documentElement.style.setProperty('--text',d.textColor);
  document.documentElement.style.setProperty('--font',d.fontSize+'px');
  document.body.style.fontFamily = d.fontFamily;

  // Update UI editor controls
  if (el('ui-bg-color'))   el('ui-bg-color').value=d.bgColor||'#F1F8E9';
  if (el('ui-btn-color'))  el('ui-btn-color').value=d.btnColor||'#2E7D32';
  if (el('ui-hdr-color'))  el('ui-hdr-color').value=d.hdrColor||'#2E7D32';
  if (el('ui-text-color')) el('ui-text-color').value=d.textColor||'#212121';
  if (el('ui-font-family')) el('ui-font-family').value=d.fontFamily;
  // Apply font size — check if it matches a preset btn or use custom
  const presetSizes = ['11','13','15'];
  const fsStr = String(d.fontSize||13);
  document.querySelectorAll('.font-sz-btn').forEach(b=>b.classList.toggle('active', b.dataset.size===fsStr));
  if (el('ui-font-custom')) {
    // Set custom dropdown if not a preset
    el('ui-font-custom').value = presetSizes.includes(fsStr) ? '' : fsStr;
  }
}

function getUiValues() {
  const bgColor=el('ui-bg-color')?el('ui-bg-color').value:'#F1F8E9';
  const btnColor=el('ui-btn-color')?el('ui-btn-color').value:'#2E7D32';
  const hdrColor=el('ui-hdr-color')?el('ui-hdr-color').value:'#2E7D32';
  const textColor=el('ui-text-color')?el('ui-text-color').value:'#212121';
  // Custom font size wins if set; else use active btn
  const customSzEl = el('ui-font-custom');
  const customSz = customSzEl ? parseInt(customSzEl.value)||0 : 0;
  const activeFont=document.querySelector('#dtab-ui .font-sz-btn.active');
  const fontSize = customSz>0 ? customSz : (activeFont?+activeFont.dataset.size:13);
  const fontFamily=el('ui-font-family')?el('ui-font-family').value:"'Times New Roman',Times,serif";
  return {bgColor,btnColor,hdrColor,textColor,fontSize,fontFamily};
}

function applyUiLocally({bgColor,btnColor,hdrColor,textColor,fontSize,fontFamily}) {
  document.documentElement.style.setProperty('--page-bg',bgColor);
  document.documentElement.style.setProperty('--btn-bg',btnColor);
  document.documentElement.style.setProperty('--section-hdr',hdrColor);
  if (textColor) document.documentElement.style.setProperty('--text',textColor);
  document.documentElement.style.setProperty('--font',fontSize+'px');
  document.body.style.fontFamily = fontFamily;
}

async function saveUiSettings() {
  // Apply as Admin — saves to Firestore for all users
  const vals = getUiValues();
  applyUiLocally(vals);
  await db.collection('adminConfig').doc('uiSettings').set(vals);
  chrome.storage.local.set({fontSize:String(vals.fontSize), fontFamily:vals.fontFamily});
  const msg=el('ui-save-msg'); msg.textContent='✓ Applied for all users!';
  setTimeout(()=>{msg.textContent='';},2500);
}

async function saveUiSettingsMe() {
  // Apply only for current session (not saved to Firestore)
  const vals = getUiValues();
  applyUiLocally(vals);
  chrome.storage.local.set({fontSize:String(vals.fontSize), fontFamily:vals.fontFamily, myUiSettings:JSON.stringify(vals)});
  const msg=el('ui-save-msg'); msg.textContent='✓ Applied for your account!';
  setTimeout(()=>{msg.textContent='';},2500);
}

async function resetUiSettings() {
  showConfirm('Reset UI','Restore default colors and fonts?', async () => {
    const def={bgColor:'#F1F8E9',btnColor:'#2E7D32',hdrColor:'#2E7D32',textColor:'#212121',fontSize:13,fontFamily:"'Times New Roman',Times,serif"};
    await db.collection('adminConfig').doc('uiSettings').set(def);
    document.documentElement.style.setProperty('--page-bg',def.bgColor);
    document.documentElement.style.setProperty('--btn-bg',def.btnColor);
    document.documentElement.style.setProperty('--section-hdr',def.hdrColor);
    document.documentElement.style.setProperty('--text',def.textColor);
    document.documentElement.style.setProperty('--font',def.fontSize+'px');
    document.body.style.fontFamily = def.fontFamily;
    if(el('ui-bg-color')) el('ui-bg-color').value=def.bgColor;
    if(el('ui-btn-color')) el('ui-btn-color').value=def.btnColor;
    if(el('ui-hdr-color')) el('ui-hdr-color').value=def.hdrColor;
    if(el('ui-text-color')) el('ui-text-color').value=def.textColor;
    if(el('ui-font-family')) el('ui-font-family').value=def.fontFamily;
    if(el('ui-font-custom')) el('ui-font-custom').value='';
    document.querySelectorAll('#dtab-ui .font-sz-btn').forEach(b=>b.classList.toggle('active',+b.dataset.size===13));
    chrome.storage.local.remove(['myUiSettings']);
  });
}

/* ══════════════════════════════════════════
   ADMIN: FEATURE FLAGS
══════════════════════════════════════════ */
async function loadFeatureFlags() {
  try {
    const snap=await db.collection('adminConfig').doc('features').get();
    const d=snap.exists?snap.data():{};
    S.features.sharing=d.sharing!==false; S.features.education=d.education!==false; S.features.address=d.address!==false;
    if (el('feat-sharing')){el('feat-sharing').checked=S.features.sharing;el('feat-edu').checked=S.features.education;el('feat-addr').checked=S.features.address;}
  } catch(e){}
}
function applyFeatureFlags() {
  if (S.features.education) show('sec-edu'); else hide('sec-edu');
  if (S.features.address)   show('sec-address'); else hide('sec-address');
}
async function saveFeatureFlags() {
  const features={sharing:el('feat-sharing').checked,education:el('feat-edu').checked,address:el('feat-addr').checked};
  await db.collection('adminConfig').doc('features').set(features);
  S.features=features; applyFeatureFlags();
  const msg=el('feat-save-msg'); msg.textContent='✓ Features saved!';
  setTimeout(()=>{msg.textContent='';},2500);
}

/* ══════════════════════════════════════════
   ADMIN: CUSTOM SECTIONS MANAGER
══════════════════════════════════════════ */
async function loadCustomSectionsAdmin() {
  const container = el('admin-custom-sections');
  if (!container) return;
  container.innerHTML = '<p style="font-size:11px;color:var(--sub-text);padding:6px 0;">Loading sections...</p>';
  try {
    const snap = await db.collection('customSections').get();
    S.customSections = [];
    snap.forEach(doc => { S.customSections.push({ id: doc.id, ...doc.data() }); });
    S.customSections.sort((a, b) => {
      const as = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      const bs = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return as - bs;
    });
    // Also merge local (My Account) sections
    try {
      const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
      const mySections = local.myCustomSections || [];
      const existingIds = new Set(S.customSections.map(s => s.id));
      mySections.forEach(sec => {
        if (!existingIds.has(sec.id)) S.customSections.push(sec);
      });
    } catch(e2) { /* skip */ }
    renderCustomSectionsAdmin(container);
  } catch(e) {
    container.innerHTML = '<p style="font-size:11px;color:var(--danger);">Error: '+esc(e.message)+'</p>';
  }
}

function renderCustomSectionsAdmin(container) {
  container.innerHTML = '';
  if (S.customSections.length === 0) {
    container.innerHTML = '<p style="font-size:11px;color:var(--sub-text);padding:4px 0;">No sections yet. Add one below.</p>';
    return;
  }
  S.customSections.forEach(sec => {
    const safeId = sec.id.replace(/[^a-z0-9]/gi, '_');
    const addFieldFormId = 'aff-' + safeId;
    const addFieldInputId = 'nfn-' + safeId;

    const div = document.createElement('div');
    div.style.cssText = 'border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden;';

    let fieldsHtml = '';
    (sec.fields||[]).forEach(field => {
      fieldsHtml +=
        '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-top:1px solid var(--border);background:var(--g100);">' +
          '<span style="flex:1;font-size:11px;color:var(--text);">' + esc(field.name) + '</span>' +
          '<button class="cf-item-del cs-rmfield" data-secid="' + esc(sec.id) + '" data-fieldid="' + esc(field.id) + '" title="Remove field">&#215;</button>' +
        '</div>';
    });

    div.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--section-hdr);color:#fff;">' +
        '<span style="font-size:12px;font-weight:700;">' + esc(sec.name) + '</span>' +
        '<div style="display:flex;gap:5px;">' +
          '<button class="cs-addfld cf-btn cf-btn-ok" style="font-size:10px;padding:3px 8px;">+ Field</button>' +
          '<button class="cs-delsec cf-btn" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.22);color:#fff;border:1px solid rgba(255,255,255,0.4);" data-name="' + esc(sec.name) + '">Delete</button>' +
        '</div>' +
      '</div>' +
      fieldsHtml +
      '<div id="' + addFieldFormId + '" style="display:none;padding:8px 10px;border-top:1px solid var(--border);background:var(--g100);">' +
        '<input type="text" class="field-input cs-field-inp" id="' + addFieldInputId + '" placeholder="Field name (e.g. Company)" style="margin-bottom:6px;font-size:11px;"/>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="cf-btn cf-btn-ok cs-savefld" style="font-size:11px;">Save</button>' +
          '<button class="cf-btn cf-btn-no cs-cancelfld" style="font-size:11px;" data-formid="' + addFieldFormId + '" data-inpid="' + addFieldInputId + '">Cancel</button>' +
        '</div>' +
      '</div>';

    container.appendChild(div);

    div.querySelector('.cs-addfld').addEventListener('click', () => {
      const form = el(addFieldFormId);
      form.style.display = (form.style.display === 'none' || !form.style.display) ? 'block' : 'none';
      if (form.style.display === 'block') el(addFieldInputId).focus();
    });

    div.querySelector('.cs-delsec').addEventListener('click', () => {
      showConfirm('Delete Section', 'Delete "' + sec.name + '" and all its fields?', async () => {
        if (sec.id.startsWith('local_')) {
          const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
          const updated = (local.myCustomSections || []).filter(s => s.id !== sec.id);
          await new Promise(res => chrome.storage.local.set({ myCustomSections: updated }, res));
        } else {
          await db.collection('customSections').doc(sec.id).delete();
        }
        await loadCustomSectionsAdmin();
      }, true);
    });

    div.querySelector('.cs-savefld').addEventListener('click', async () => {
      const nameInp = el(addFieldInputId);
      const fname = nameInp.value.trim();
      if (!fname) return;
      const fieldId = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      if (sec.id.startsWith('local_')) {
        const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
        const mySections = local.myCustomSections || [];
        const idx = mySections.findIndex(s => s.id === sec.id);
        if (idx !== -1) {
          mySections[idx].fields = mySections[idx].fields || [];
          mySections[idx].fields.push({ id: fieldId, name: fname, value: '' });
          await new Promise(res => chrome.storage.local.set({ myCustomSections: mySections }, res));
        }
      } else {
        const secDoc = await db.collection('customSections').doc(sec.id).get();
        const existingFields = secDoc.exists ? (secDoc.data().fields || []) : [];
        existingFields.push({ id: fieldId, name: fname, value: '' });
        await db.collection('customSections').doc(sec.id).update({ fields: existingFields });
      }
      nameInp.value = '';
      el(addFieldFormId).style.display = 'none';
      await loadCustomSectionsAdmin();
    });

    div.querySelector('.cs-cancelfld').addEventListener('click', () => {
      el(addFieldFormId).style.display = 'none';
      el(addFieldInputId).value = '';
    });

    div.querySelectorAll('.cs-rmfield').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.secid;
        const fid = btn.dataset.fieldid;
        const secObj = S.customSections.find(s => s.id === sid);
        if (!secObj) return;
        showConfirm('Remove Field', 'Remove this field?', async () => {
          const newFields = (secObj.fields||[]).filter(f => f.id !== fid);
          if (sid.startsWith('local_')) {
            const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
            const mySections = local.myCustomSections || [];
            const idx = mySections.findIndex(s => s.id === sid);
            if (idx !== -1) { mySections[idx].fields = newFields; }
            await new Promise(res => chrome.storage.local.set({ myCustomSections: mySections }, res));
          } else {
            await db.collection('customSections').doc(sid).update({ fields: newFields });
          }
          await loadCustomSectionsAdmin();
        }, true);
      });
    });
  });
}

async function addCustomSection(saveForAll) {
  const inp = el('new-section-name');
  const name = inp ? inp.value.trim() : '';
  if (!name) return;
  const msg = el('feat-save-msg');
  if (saveForAll) {
    // Save to Firestore — visible to all users
    await db.collection('customSections').add({
      name: name,
      fields: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.textContent = '\u2713 Section saved for all users!';
  } else {
    // Save only to local chrome storage — visible only to this account's session
    const local = await new Promise(res => chrome.storage.local.get(['myCustomSections'], res));
    const mySections = local.myCustomSections || [];
    mySections.push({ id: 'local_' + Date.now(), name: name, fields: [], local: true });
    await new Promise(res => chrome.storage.local.set({ myCustomSections: mySections }, res));
    msg.textContent = '\u2713 Section saved for your account!';
  }
  setTimeout(() => { if (msg) msg.textContent = ''; }, 2500);
  if (inp) inp.value = '';
  el('add-section-form').style.display = 'none';
  await loadCustomSectionsAdmin();
}

/* ══════════════════════════════════════════
   ADMIN: USER MANAGER
══════════════════════════════════════════ */
async function loadUsers() {
  const list=el('user-list');
  list.innerHTML='<p style="font-size:12px;color:var(--sub-text);padding:8px 0;">Loading...</p>';
  try {
    let snap;
    try {
      snap = await db.collection('userRegistry').orderBy('createdAt','desc').get();
    } catch(e) {
      snap = await db.collection('userRegistry').get();
    }
    if (snap.empty){list.innerHTML='<p style="font-size:12px;color:var(--sub-text);">No users found.</p>';return;}
    list.innerHTML='';
    snap.forEach(doc => {
      const d=doc.data();
      const letter=(d.firstName||d.displayName||d.email||'?')[0].toUpperCase();
      const createdAt=d.createdAt?.toDate?d.createdAt.toDate().toLocaleDateString():'—';
      const lastLogin=d.lastLogin?.toDate?d.lastLogin.toDate().toLocaleString('en-BD',{dateStyle:'medium',timeStyle:'short'}):'—';
      const item=document.createElement('div'); item.className='user-item';
      item.innerHTML=
        '<div class="user-item-avatar">'+esc(letter)+'</div>'+
        '<div class="user-item-info">'+
          '<div class="user-item-name">'+esc(d.displayName||d.email||'Unknown')+'</div>'+
          '<div class="user-item-meta">'+esc(d.email||'')+' · Joined: '+createdAt+'</div>'+
          '<div class="user-item-meta" style="font-size:9px;color:var(--g400);">Last login: '+lastLogin+'</div>'+
        '</div>'+
        '<button class="user-item-del" data-uid="'+esc(doc.id)+'" data-email="'+esc(d.email||'')+'">Remove</button>';
      list.appendChild(item);
    });
    list.querySelectorAll('.user-item-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const uid=btn.dataset.uid, email=btn.dataset.email;
        showConfirm('Remove User','Remove "'+email+'" from user registry?', async ()=>{
          await db.collection('userRegistry').doc(uid).delete();
          loadUsers();
        },true);
      });
    });
  } catch(e){
    list.innerHTML='<p style="font-size:11px;color:var(--danger);">Error: '+esc(e.message)+'</p>';
  }
}


/* ══════════════════════════════════════════
   ABOUT SECTION
══════════════════════════════════════════ */
async function loadAboutText() {
  try {
    const snap = await db.collection('adminConfig').doc('aboutText').get();
    const text = snap.exists ? (snap.data().text || '') : '';
    const display = el('about-text-display');
    const empty = el('about-empty-msg');
    if (text) { display.textContent = text; display.style.display='block'; empty.style.display='none'; }
    else { display.style.display='none'; empty.style.display='block'; }
    if (S.isAdmin) {
      el('inp-about').value = text;
      el('about-edit-mode').style.display = 'block';
      el('about-view-mode').style.display = 'none';
    } else {
      el('about-edit-mode').style.display = 'none';
      el('about-view-mode').style.display = 'block';
    }
  } catch(e) {}
}

async function saveAboutText() {
  const text = el('inp-about').value.trim();
  try {
    await db.collection('adminConfig').doc('aboutText').set({ text });
    const display = el('about-text-display');
    const empty = el('about-empty-msg');
    if (text) { display.textContent = text; display.style.display='block'; empty.style.display='none'; }
    else { display.style.display='none'; empty.style.display='block'; }
    const msg = el('msg-about'); msg.textContent = '✓ Saved!';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  } catch(e) {
    el('msg-about').textContent = 'Error: ' + e.message;
  }
}


/* ══════════════════════════════════════════
   RESULT SELECT — GPA toggle
══════════════════════════════════════════ */
function onResultChange(prefix) {
  const sel = el('f-'+prefix+'-result');
  const row = el('gpa-row-'+prefix);
  if (!sel || !row) return;
  const val = sel.value;
  if (val === 'GPA(out of 4)' || val === 'GPA(out of 5)') {
    row.style.display = 'block';
  } else {
    row.style.display = 'none';
    const gpaInp = el('f-'+prefix+'-gpa');
    if (gpaInp) gpaInp.value = '';
  }
}

// Restore result selects on profile load
function restoreResultSelects(data) {
  ['jsc','ssc','hsc','diploma','grad','masters'].forEach(prefix => {
    const sel = el('f-'+prefix+'-result');
    if (!sel) return;
    const val = data['f-'+prefix+'-result'] || '';
    sel.value = val;
    onResultChange(prefix);
    const gpaInp = el('f-'+prefix+'-gpa');
    if (gpaInp && data['f-'+prefix+'-gpa']) gpaInp.value = data['f-'+prefix+'-gpa'];
  });
}

/* ══════════════════════════════════════════
   CROP MODAL
══════════════════════════════════════════ */
(function() {
  var cropState = { x:0, y:0, zoom:1, imgW:0, imgH:0, dragging:false, startX:0, startY:0, startOX:0, startOY:0 };

  function showCropModal(src) {
    const modal = el('modal-crop');
    const img = el('crop-img');
    const zoom = el('crop-zoom');
    cropState.zoom = 1; cropState.x = 0; cropState.y = 0;
    zoom.value = 1;
    img.onload = function() {
      cropState.imgW = img.naturalWidth; cropState.imgH = img.naturalHeight;
      applyCropTransform();
    };
    img.src = src;
    modal.style.display = 'flex';
    el('crop-uploading').style.display = 'none';
  }

  function applyCropTransform() {
    const img = el('crop-img');
    const vp = el('crop-viewport');
    const vpSize = 260;
    const scale = cropState.zoom * Math.max(vpSize / cropState.imgW, vpSize / cropState.imgH);
    const w = cropState.imgW * scale, h = cropState.imgH * scale;
    const maxX = (w - vpSize) / 2, maxY = (h - vpSize) / 2;
    cropState.x = Math.max(-maxX, Math.min(maxX, cropState.x));
    cropState.y = Math.max(-maxY, Math.min(maxY, cropState.y));
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.left = ((vpSize - w) / 2 + cropState.x) + 'px';
    img.style.top  = ((vpSize - h) / 2 + cropState.y) + 'px';
  }

  function cropAndSave() {
    const img = el('crop-img');
    const vpSize = 260;
    const scale = cropState.zoom * Math.max(vpSize / cropState.imgW, vpSize / cropState.imgH);
    const w = cropState.imgW * scale, h = cropState.imgH * scale;
    const offX = (vpSize - w) / 2 + cropState.x;
    const offY = (vpSize - h) / 2 + cropState.y;
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.beginPath(); ctx.arc(150,150,150,0,Math.PI*2); ctx.clip();
    const drawScale = 300 / vpSize;
    ctx.drawImage(img, offX * drawScale, offY * drawScale, w * drawScale, h * drawScale);
    el('crop-uploading').style.display = 'block';
    const b64 = canvas.toDataURL('image/jpeg', 0.82);
    db.collection('userRegistry').doc(S.user.uid).set({ photoURL: b64 }, { merge: true })
    .then(() => {
      const storageKey = 'accountPhotoURL_' + S.user.uid;
      chrome.storage.local.set({ accountPhotoURL: b64, [storageKey]: b64 });
      S._localPhotoURL = b64;
      el('acct-avatar-circle').innerHTML = '<img src="' + b64 + '" alt=""/>';
      updateAvatarButtonsWithPhoto(b64);
      el('modal-crop').style.display = 'none';
      el('crop-uploading').style.display = 'none';
    }).catch(err => {
      el('crop-uploading').style.display = 'none';
      alert('Upload failed: ' + err.message);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Zoom slider
    el('crop-zoom').addEventListener('input', function() {
      cropState.zoom = parseFloat(this.value);
      applyCropTransform();
    });
    // Drag
    const vp = el('crop-viewport');
    vp.addEventListener('mousedown', function(e) {
      cropState.dragging = true; cropState.startX = e.clientX; cropState.startY = e.clientY;
      cropState.startOX = cropState.x; cropState.startOY = cropState.y; e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!cropState.dragging) return;
      cropState.x = cropState.startOX + (e.clientX - cropState.startX);
      cropState.y = cropState.startOY + (e.clientY - cropState.startY);
      applyCropTransform();
    });
    document.addEventListener('mouseup', function() { cropState.dragging = false; });
    // Touch drag
    vp.addEventListener('touchstart', function(e) {
      const t = e.touches[0];
      cropState.dragging = true; cropState.startX = t.clientX; cropState.startY = t.clientY;
      cropState.startOX = cropState.x; cropState.startOY = cropState.y;
    });
    vp.addEventListener('touchmove', function(e) {
      if (!cropState.dragging) return;
      const t = e.touches[0];
      cropState.x = cropState.startOX + (t.clientX - cropState.startX);
      cropState.y = cropState.startOY + (t.clientY - cropState.startY);
      applyCropTransform(); e.preventDefault();
    }, { passive: false });
    vp.addEventListener('touchend', function() { cropState.dragging = false; });

    el('btn-crop-save').addEventListener('click', cropAndSave);
    el('btn-crop-cancel').addEventListener('click', () => { el('modal-crop').style.display = 'none'; });
  });

  // Expose showCropModal globally
  window._showCropModal = showCropModal;
})();

/* ══════════════════════════════════════════
   AUTH STATE LISTENER
══════════════════════════════════════════ */
auth.onAuthStateChanged(async user => {
  if (user) {
    S.user=user;
    showLoading('Loading your profiles...');
    await setupAfterLogin(user);
  } else {
    S.user=null; S.isAdmin=false; S.profiles={}; S.profileId=null;
    S.activeProfileId=null; S.defaultProfileId=null; S.customSections=[];
    closeAccountPanel();
    hideLoading();
    showScreen('screen-login');
  }
});

/* ══════════════════════════════════════════
   DOM READY
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Collapsible sections */
  document.querySelectorAll('.section-hdr').forEach(hdr => {
    hdr.addEventListener('click', () => hdr.closest('.section').classList.toggle('open'));
  });

  /* Same as present */
  el('perm-same-as-present').addEventListener('change', function() {
    if (!this.checked) return;
    ['careof','village','district','upazila','postoffice','postcode'].forEach(f => {
      const src=el('f-'+f), dst=el('f-perm-'+f);
      if(src&&dst) dst.value=src.value;
    });
  });

  /* ── LOGIN ── */
  el('btn-login').addEventListener('click', doLogin);
  el('li-pass').addEventListener('keydown', e=>{if(e.key==='Enter')doLogin();});
  el('li-email').addEventListener('keydown', e=>{if(e.key==='Enter')el('li-pass').focus();});
  el('btn-go-register').addEventListener('click', ()=>showScreen('screen-register'));
  el('link-forgot').addEventListener('click', ()=>showScreen('screen-forgot'));

  /* ── REGISTER ── */
  el('btn-back-login').addEventListener('click', ()=>showScreen('screen-login'));
  el('rg-pass').addEventListener('input', function(){updateStrengthUI(this.value);});
  el('rg-confirm').addEventListener('input', function(){
    const pw=el('rg-pass').value;
    setErr('rg-error',(this.value&&this.value!==pw)?'Passwords do not match.':'');
  });
  el('btn-register').addEventListener('click', doRegister);

  /* ── FORGOT ── */
  el('btn-forgot-back').addEventListener('click', ()=>showScreen('screen-login'));
  el('btn-send-reset').addEventListener('click', doForgotPassword);

  /* ── PROFILE LIST ── */
  el('btn-open-acct-profiles').addEventListener('click', openAccountPanel);
  el('btn-add-profile').addEventListener('click', openNewProfileModal);

  /* New Profile Modal */
  el('btn-new-profile-cancel').addEventListener('click', closeNewProfileModal);
  el('btn-new-profile-save').addEventListener('click', async () => {
    const name=el('new-profile-name').value.trim(); if(!name) return;
    closeNewProfileModal(); showLoading('Creating profile...');
    await createProfile(name); hideLoading();
  });
  el('new-profile-name').addEventListener('keydown', e=>{if(e.key==='Enter')el('btn-new-profile-save').click();});

  /* Rename Modal */
  el('btn-rename-cancel').addEventListener('click', closeRenameModal);
  el('btn-rename-save').addEventListener('click', async () => {
    const profileId=el('modal-rename-profile').dataset.profileId;
    const name=el('rename-profile-name').value.trim();
    if(!name||!profileId) return;
    closeRenameModal(); await renameProfile(profileId,name);
  });
  el('rename-profile-name').addEventListener('keydown', e=>{if(e.key==='Enter')el('btn-rename-save').click();});

  /* ── FORM SCREEN ── */
  el('btn-back-to-profiles').addEventListener('click', ()=>{ closeAllDropdowns(); showScreen('screen-profiles'); });
  el('btn-open-acct-form').addEventListener('click', openAccountPanel);
  el('btn-fill').addEventListener('click', ()=>{ saveProfile().then(fillForm); });
  el('btn-save').addEventListener('click', saveProfile);
  el('btn-reset').addEventListener('click', resetForm);

  /* ── ACCOUNT PANEL ── */
  el('btn-close-account').addEventListener('click', closeAccountPanel);
  el('btn-logout').addEventListener('click', doLogout);
  el('btn-delete-account').addEventListener('click', doDeleteAccount);
  el('acct-avatar-circle').addEventListener('click', ()=>el('acct-photo-input').click());
  el('acct-photo-input').addEventListener('change', e=>uploadAccountAvatar(e.target.files[0]));
  el('btn-save-display-name').addEventListener('click', saveDisplayName);
  el('btn-save-pw').addEventListener('click', changePassword);
  el('btn-save-email').addEventListener('click', changeEmail);

  el('inp-new-pw').addEventListener('input', function(){
    const bar=el('pw-change-bar'); if(!bar) return;
    const r=pwRules(this.value); const p=Object.values(r).filter(Boolean).length/5*100;
    bar.style.width=p+'%'; bar.style.background=p<=40?'#EF5350':p<=60?'#FFA726':'var(--primary)';
  });

  /* Dark mode */
  el('toggle-dark-mode').addEventListener('change', function(){
    document.body.classList.toggle('dark',this.checked);
    chrome.storage.local.set({darkMode:this.checked});
  });

  /* Font size (account panel) */
  document.querySelectorAll('#panel-account .font-sz-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#panel-account .font-sz-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.style.setProperty('--font',btn.dataset.size+'px');
      chrome.storage.local.set({fontSize:btn.dataset.size});
    });
  });

  /* Expandable sections in account panel */
  function toggleExpand(btnId, expandId) {
    el(btnId).addEventListener('click', ()=>{
      const exp=el(expandId); const isOpen=exp.classList.contains('open');
      document.querySelectorAll('#panel-account .panel-expand').forEach(p=>p.classList.remove('open'));
      if(!isOpen) exp.classList.add('open');
    });
  }
  toggleExpand('mi-edit-name','pe-edit-name');
  toggleExpand('mi-change-pw','pe-change-pw');
  toggleExpand('mi-change-email','pe-change-email');

  /* About section */
  el('mi-about').addEventListener('click', () => {
    const exp = el('pe-about');
    const isOpen = exp.classList.contains('open');
    document.querySelectorAll('#panel-account .panel-expand').forEach(p => p.classList.remove('open'));
    if (!isOpen) { exp.classList.add('open'); loadAboutText(); }
  });
  el('btn-save-about').addEventListener('click', saveAboutText);
  el('btn-cancel-about').addEventListener('click', () => {
    el('pe-about').classList.remove('open');
  });

  /* Developer options */
  el('mi-dev-opts').addEventListener('click', openDevOptions);

  /* ── DEV OPTIONS SCREEN ── */
  el('btn-devops-back').addEventListener('click', closeDevOptionsBack);
  el('btn-devops-close').addEventListener('click', closeDevOptionsX);

  /* Dev tabs */
  document.querySelectorAll('.dev-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.dev-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.dev-tab-pane').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      el('dtab-'+tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab==='users') loadUsers();
      if (tab.dataset.tab==='features') loadCustomSectionsAdmin();
    });
  });

  /* UI editor */
  el('btn-apply-ui-me').addEventListener('click', saveUiSettingsMe);
  el('btn-apply-ui-all').addEventListener('click', saveUiSettings);
  el('btn-reset-ui').addEventListener('click', resetUiSettings);
  document.querySelectorAll('#dtab-ui .font-sz-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#dtab-ui .font-sz-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.style.setProperty('--font',btn.dataset.size+'px');
      if(el('ui-font-custom')) el('ui-font-custom').value='';
    });
  });
  // Custom font size dropdown
  if(el('ui-font-custom')) {
    el('ui-font-custom').addEventListener('change', function(){
      const v=parseInt(this.value);
      if(v>=6&&v<=50){
        document.querySelectorAll('#dtab-ui .font-sz-btn').forEach(b=>b.classList.remove('active'));
        document.documentElement.style.setProperty('--font',v+'px');
      } else {
        // "–" selected, reactivate medium
        document.querySelectorAll('#dtab-ui .font-sz-btn').forEach(b=>b.classList.toggle('active',b.dataset.size==='13'));
      }
    });
  }

  /* Features */
  if (el('btn-save-features')) el('btn-save-features').addEventListener('click', saveFeatureFlags);
  if (el('btn-refresh-users')) el('btn-refresh-users').addEventListener('click', loadUsers);

  /* Custom Sections admin controls */
  if (el('btn-show-add-section')) el('btn-show-add-section').addEventListener('click', () => {
    const form = el('add-section-form');
    if (!form) return;
    form.style.display = (form.style.display === 'none' || !form.style.display) ? 'block' : 'none';
    if (form.style.display === 'block') { setTimeout(()=>{ if(el('new-section-name')) el('new-section-name').focus(); }, 50); }
  });
  if (el('btn-save-section-me')) el('btn-save-section-me').addEventListener('click', () => addCustomSection(false));
  if (el('btn-save-section-admin')) el('btn-save-section-admin').addEventListener('click', () => addCustomSection(true));
  if (el('btn-cancel-section')) el('btn-cancel-section').addEventListener('click', () => {
    if (el('add-section-form')) el('add-section-form').style.display = 'none';
    if (el('new-section-name')) el('new-section-name').value = '';
  });
  if (el('new-section-name')) el('new-section-name').addEventListener('keydown', e => { if(e.key==='Enter') addCustomSection(true); });

  /* Load saved settings */
  // Apply Times New Roman as immediate default before Firestore loads
  document.body.style.fontFamily = "'Times New Roman',Times,serif";

  chrome.storage.local.get(['darkMode','fontSize','fontFamily'], result=>{
    if (result.darkMode){ document.body.classList.add('dark'); el('toggle-dark-mode').checked=true; }
    if (result.fontSize){
      document.documentElement.style.setProperty('--font',result.fontSize+'px');
      document.querySelectorAll('.font-sz-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===result.fontSize));
    }
    if (result.fontFamily) {
      document.body.style.fontFamily = result.fontFamily;
      if (el('ui-font-family')) el('ui-font-family').value = result.fontFamily;
    }
  });

  /* Close dropdowns on outside click */
  document.addEventListener('click', e=>{
    if(!e.target.closest('.dropdown-menu')&&!e.target.closest('.profile-menu-btn')) closeAllDropdowns();
  });
});
