/* ─── CORE HELPERS ─────────────────────────────────────────────────────────── */

function fillField(input, value) {
  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  var nativeTextareaSetter   = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
  var setter = (input.tagName === 'TEXTAREA' && nativeTextareaSetter)
    ? nativeTextareaSetter.set
    : (nativeInputValueSetter ? nativeInputValueSetter.set : null);
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur',   { bubbles: true }));
}

function selectOption(select, value) {
  if (!value) return false;
  var norm = value.toLowerCase().replace(/[\s_.]/g, '');
  for (var i = 0; i < select.options.length; i++) {
    var t = select.options[i].text.toLowerCase().replace(/[\s_.]/g, '');
    var v = (select.options[i].value || '').toLowerCase().replace(/[\s_.]/g, '');
    if (t === norm || v === norm || t.includes(norm) || norm.includes(t)) {
      select.value = select.options[i].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

function getLabel(el) {
  if (el.id) {
    var lbl = document.querySelector('label[for="' + el.id + '"]');
    if (lbl) return lbl.innerText.trim();
  }
  var parent = el.closest('td, div, tr, li');
  if (parent) {
    var prev = parent.previousElementSibling;
    if (prev) return prev.innerText.trim();
  }
  return '';
}

function collectByLabel(selector, labelTest) {
  return Array.from(document.querySelectorAll(selector)).filter(function(el) {
    return labelTest(getLabel(el).toLowerCase());
  });
}

function findNextFormEl(refEl, keywords) {
  var past = false;
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    var node = walker.currentNode;
    if (node === refEl) { past = true; continue; }
    if (!past) continue;
    var tag = node.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') continue;
    if (node.disabled || node.readOnly) continue;
    var type = (node.type || '').toLowerCase();
    if (['hidden','submit','button','reset','file','checkbox','radio'].includes(type)) continue;
    if (keywords.length === 0) return node;
    var lbl = getLabel(node).toLowerCase();
    var ph  = (node.placeholder || '').toLowerCase();
    var nm  = (node.name || '').toLowerCase();
    var id  = (node.id  || '').toLowerCase();
    var combined = lbl + ' ' + ph + ' ' + nm + ' ' + id;
    for (var k = 0; k < keywords.length; k++) {
      if (combined.includes(keywords[k])) return node;
    }
  }
  return null;
}

var CUSTOM_SECTIONS = [];
var CUSTOM_SECTION_VALUES = {};

var EDU = [
  { exam: '', board: '', roll: '', group: '', result: '', gpa: '', year: '', institute: '' }, // JSC [0]
  { exam: '', board: '', roll: '', group: '', result: '', gpa: '', year: '', institute: '' }, // SSC [1]
  { exam: '', board: '', roll: '', group: '', result: '', gpa: '', year: '', institute: '' }, // HSC [2]
  { exam: '', board: '', roll: '', group: '', result: '', gpa: '', year: '', institute: '' }, // Diploma [3]
  { exam: '', board: '', univ: '', group: '', result: '', gpa: '', year: '' }, // Graduation [4]
  { exam: '', board: '', univ: '', group: '', result: '', gpa: '', year: '' }  // Masters [5]
];

function fillEduSections() {
  var examSelects   = collectByLabel('select', function(l) { return l.includes('examination') || l.includes('exam name') || l.includes('exam type'); });
  var boardSelects  = collectByLabel('select', function(l) { return l.includes('board') && !l.includes('district') && !l.includes('upazila') && !l.includes('thana'); });
  var groupSelects  = collectByLabel('select', function(l) { return l.includes('group') || (l.includes('subject') && !l.includes('university')); });
  var resultSelects = collectByLabel('select', function(l) { return l.includes('result') && !l.includes('search') && !l.includes('filter'); });
  var yearSelects   = collectByLabel('select', function(l) { return (l.includes('passing year') || l.includes('pass year') || l.includes('year of pass')); });
  var rollInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])')).filter(function(inp) {
    var lbl = getLabel(inp).toLowerCase(); var nm = (inp.name||'').toLowerCase(); var id = (inp.id||'').toLowerCase();
    return lbl.includes('roll') || nm.includes('roll') || id.includes('roll');
  });
  // Institute name inputs
  var instituteInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])')).filter(function(inp) {
    var lbl = getLabel(inp).toLowerCase(); var nm = (inp.name||'').toLowerCase(); var id = (inp.id||'').toLowerCase(); var ph = (inp.placeholder||'').toLowerCase();
    var combined = lbl+' '+nm+' '+id+' '+ph;
    return combined.includes('institute') || combined.includes('institution') || combined.includes('school name') || combined.includes('college name') || combined.includes('university name') || combined.includes('madrasah') || combined.includes('madrasa') || combined.includes('polytechnic');
  });

  EDU.forEach(function(data, idx) {
    if (!data.exam && !data.board && !data.roll && !data.group && !data.result && !data.institute) return;
    if (data.exam   && examSelects[idx])  selectOption(examSelects[idx],  data.exam);
    if (data.board  && boardSelects[idx]) selectOption(boardSelects[idx], data.board);
    if (data.group  && groupSelects[idx]) selectOption(groupSelects[idx], data.group);
    if (data.roll   && rollInputs[idx])   fillField(rollInputs[idx], data.roll);
    if (data.year   && yearSelects[idx])  selectOption(yearSelects[idx],  data.year);
    if (data.institute && instituteInputs[idx]) fillField(instituteInputs[idx], data.institute);
    if (data.result && resultSelects[idx]) {
      selectOption(resultSelects[idx], data.result);
      if (data.result.toLowerCase().includes('gpa')) {
        (function(resultSel, sectionData, sectionIdx) { setTimeout(function() { fillGpaAndOutOf(resultSel, sectionData, sectionIdx); }, 1000); })(resultSelects[idx], data, idx);
      }
    }
  });
}

function fillGpaAndOutOf(resultSel, data, idx) {
  if (data.outOf) {
    var outOfSelects = Array.from(document.querySelectorAll('select')).filter(function(sel) {
      var lbl=(sel.name||'').toLowerCase(); var snm=(sel.name||'').toLowerCase(); var sid=(sel.id||'').toLowerCase();
      return lbl.includes('out of')||lbl.includes('outof')||lbl.includes('out-of')||snm.includes('outof')||snm.includes('scale')||snm.includes('total')||sid.includes('outof')||sid.includes('scale')||sid.includes('total');
    });
    var outOfInputs = collectByLabel('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])', function(l) { return l.includes('out of')||l.includes('outof')||l.includes('maximum')||l.includes('out-of'); });
    if (outOfSelects[idx]) { selectOption(outOfSelects[idx], data.outOf); }
    else if (outOfInputs[idx]) { fillField(outOfInputs[idx], data.outOf); }
    else { var nextEl=findNextFormEl(resultSel,['out','max','total','of']); if(!nextEl)nextEl=findNextFormEl(resultSel,[]); if(nextEl){if(nextEl.tagName==='SELECT')selectOption(nextEl,data.outOf);else fillField(nextEl,data.outOf);} }
  }
  if (data.gpa) {
    var gpaInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])')).filter(function(inp) {
      var lbl=getLabel(inp).toLowerCase(); var ph=(inp.placeholder||'').toLowerCase(); var nm=(inp.name||'').toLowerCase(); var id=(inp.id||'').toLowerCase();
      return lbl.includes('gpa')||lbl.includes('grade point')||ph.includes('gpa')||ph.includes('grade')||nm.includes('gpa')||nm.includes('grade')||id.includes('gpa')||id.includes('grade');
    });
    if (gpaInputs[idx]) { fillField(gpaInputs[idx], data.gpa); }
    else { var nextInp=findNextFormEl(resultSel,['gpa','grade','point','value']); if(!nextInp)nextInp=findNextFormEl(resultSel,[]); if(nextInp&&nextInp.tagName==='INPUT')fillField(nextInp,data.gpa); }
  }
}

/* ─── FILL CUSTOM SECTIONS ──────────────────────────────────────────────────── */
function fillCustomSections() {
  if (!CUSTOM_SECTIONS || CUSTOM_SECTIONS.length === 0) return;
  CUSTOM_SECTIONS.forEach(function(sec) {
    var secValues = (CUSTOM_SECTION_VALUES && CUSTOM_SECTION_VALUES[sec.id]) ? CUSTOM_SECTION_VALUES[sec.id] : {};
    (sec.fields || []).forEach(function(field) {
      var value = secValues[field.id] || '';
      if (!value) return;
      var keyword = field.name.toLowerCase();
      document.querySelectorAll('input, select, textarea').forEach(function(el) {
        if (el.disabled || el.readOnly) return;
        var type = (el.type || '').toLowerCase();
        if (['hidden','submit','button','reset','file','checkbox','radio'].includes(type)) return;
        var lbl = getLabel(el).toLowerCase();
        var nm  = (el.name || '').toLowerCase();
        var id  = (el.id || '').toLowerCase();
        var ph  = (el.placeholder || '').toLowerCase();
        var combined = lbl + ' ' + nm + ' ' + id + ' ' + ph;
        if (combined.includes(keyword)) {
          if (el.tagName === 'SELECT') selectOption(el, value);
          else fillField(el, value);
        }
      });
    });
  });
}

function fillAll(savedData) {
  var inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="button"])');
  inputs.forEach(function(input) {
    if (input.disabled || input.readOnly) return;
    var label=getLabel(input).toLowerCase(); var labelRaw=getLabel(input);
    var ph=(input.placeholder||'').toLowerCase(); var nm=(input.name||'').toLowerCase(); var id=(input.id||'').toLowerCase();
    var d = savedData || {};
    if (label.includes('applicant')&&!label.includes('বাংলা')&&!label.includes('bangla')) { fillField(input, d['f-name-en']||''); }
    else if (labelRaw.includes('আবেদনকারীর')||(label.includes('applicant')&&label.includes('বাংলা'))) { fillField(input, d['f-name-bn']||''); }
    else if (label.includes('father')&&!label.includes('বাংলা')&&!label.includes('bangla')) { fillField(input, d['f-father-en']||''); }
    else if (labelRaw.includes('পিতার')) { fillField(input, d['f-father-bn']||''); }
    else if (label.includes('mother')&&!label.includes('বাংলা')&&!label.includes('bangla')) { fillField(input, d['f-mother-en']||''); }
    else if (labelRaw.includes('মাতার')) { fillField(input, d['f-mother-bn']||''); }
    else if (label.includes('date of birth')||label.includes('dob')||label.includes('birth date')) { if(d['f-dob']) { var dob=d['f-dob']; fillField(input, dob); var formats=[dob, dob.split('-').reverse().join('-'), dob.split('-')[2]+'/'+dob.split('-')[1]+'/'+dob.split('-')[0]]; formats.forEach(function(fmt){ if(!input.value) fillField(input,fmt); }); } }
    else if (label.includes('national id number')||label.includes('nid number')||ph.includes('national id')||nm.includes('nid')||id.includes('nid')) { if(d['f-nid']) fillField(input, d['f-nid']); }
    else if (label.includes('birth registration number')||label.includes('birth reg')||ph.includes('birth registration')||nm.includes('birth_reg')||id.includes('birth_reg')||nm.includes('birthreg')||id.includes('birthreg')) { if(d['f-birth-reg']) fillField(input, d['f-birth-reg']); }
    else if (label.includes('confirm mobile')||label.includes('confirm phone')||nm.includes('confirm_mobile')||id.includes('confirm_mobile')) { if(d['f-mobile-confirm']||d['f-mobile']) fillField(input, d['f-mobile-confirm']||d['f-mobile']||''); }
    else if (label.includes('mobile')||label.includes('phone')) { if(d['f-mobile']) fillField(input, d['f-mobile']); }
    else if (label.includes('email')) { if(d['f-email']) fillField(input, d['f-email']); }
    else if (label.includes('nationality')) { if(d['f-nationality']) fillField(input, d['f-nationality']); }
    else if (label.includes('care of')) { if(d['f-careof']) fillField(input, d['f-careof']); }
    else if (nm.includes('village')||nm.includes('vill')||nm.includes('road')||nm.includes('house')||nm.includes('flat')||id.includes('village')||id.includes('vill')||id.includes('road')||ph.includes('village')||ph.includes('road')) { if(d['f-village']) fillField(input, d['f-village']); }
    else if (label.includes('post code')||label.includes('zip')||ph.includes('post code')) { if(d['f-postcode']) fillField(input, d['f-postcode']); }
    else if (label.includes('post office')||ph.includes('post office')) { if(d['f-postoffice']) fillField(input, d['f-postoffice']); }
    else if (label.includes('district')&&!nm.includes('perm')&&!id.includes('perm')) { if(d['f-district']) fillField(input, d['f-district']); }
    else if (label.includes('upazila')||label.includes('thana')) { if(d['f-upazila']) fillField(input, d['f-upazila']); }
  });
  var selects = document.querySelectorAll('select');
  selects.forEach(function(select) {
    var label=getLabel(select).toLowerCase();
    var d = savedData || {};
    if (label.includes('nationality')) { selectOption(select, d['f-nationality']||'Bangladeshi'); }
    else if (label.includes('religion')) { if(d['f-religion']) selectOption(select, d['f-religion']); }
    else if (label.includes('gender')) { if(d['f-gender']) selectOption(select, d['f-gender']); }
    else if (label.includes('marital')) { if(d['f-marital']) selectOption(select, d['f-marital']); }
    else if (label.includes('passport')) { selectOption(select,'No'); }
    else if (label.includes('quota')) { selectOption(select,'Not Applicable'); }
    else if (label.includes('departmental')) { selectOption(select,'Not Applicable'); }
    else if (label.includes('national id')&&!label.includes('number')) { selectOption(select,'Yes'); (function(sel,nid){setTimeout(function(){var inp=findNextFormEl(sel,['nid','national_id','national id','nationalid','voter']);if(!inp)inp=findNextFormEl(sel,[]);if(inp&&inp.tagName==='INPUT')fillField(inp,nid);},1000);})(select, d['f-nid']||''); }
    else if (label.includes('birth registration')&&!label.includes('number')) { selectOption(select,'Yes'); (function(sel,brn){setTimeout(function(){var inp=findNextFormEl(sel,['birth_reg','birthreg','birth reg','brn','birth registration']);if(!inp)inp=findNextFormEl(sel,[]);if(inp&&inp.tagName==='INPUT')fillField(inp,brn);},1000);})(select, d['f-birth-reg']||''); }
    else if (label.includes('district')) { if(d['f-district']){ selectOption(select,d['f-district']); setTimeout(function(){document.querySelectorAll('select').forEach(function(s){var l=getLabel(s).toLowerCase();if(l.includes('upazila')||l.includes('upazilla')||l.includes('p.s.')||l.includes('thana')){if(d['f-upazila'])selectOption(s,d['f-upazila']);}});},1500); } }
  });
  fillEduSections();
  document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (cb.disabled) return;
    var labelText=getLabel(cb).toLowerCase();
    var parentText=cb.parentElement?(cb.parentElement.innerText||'').toLowerCase():'';
    var gpText=(cb.parentElement&&cb.parentElement.parentElement)?(cb.parentElement.parentElement.innerText||'').toLowerCase():'';
    // Also check nearby label elements and sibling text
    var nearbyText='';
    var nearEl=document.querySelector('label[for="'+cb.id+'"]');
    if(nearEl) nearbyText=nearEl.innerText.toLowerCase();
    // Check next sibling text
    if(cb.nextSibling && cb.nextSibling.textContent) nearbyText+=' '+cb.nextSibling.textContent.toLowerCase();
    if(cb.nextElementSibling && cb.nextElementSibling.textContent) nearbyText+=' '+cb.nextElementSibling.textContent.toLowerCase();
    var combined=labelText+' '+parentText+' '+gpText+' '+nearbyText;
    var isSameAsPresent = combined.includes('same as present')||combined.includes('same as permanent')||
      combined.includes('permanent same')||combined.includes('বর্তমান')||
      (combined.includes('same')&&combined.includes('address'));
    if (isSameAsPresent && !cb.checked) {
      cb.checked=true;
      cb.dispatchEvent(new Event('input',{bubbles:true}));
      cb.dispatchEvent(new Event('change',{bubbles:true}));
      cb.click();
    }
  });
  setTimeout(function(){
    document.querySelectorAll('input, select').forEach(function(el){
      var n=(el.name||'').toLowerCase(); var i=(el.id||'').toLowerCase(); var p=(el.placeholder||'').toLowerCase();
      if(n.includes('outof')||n.includes('out_of')||n.includes('scale')||i.includes('outof')||i.includes('scale')){if(el.tagName==='SELECT'){selectOption(el,'5');}else{fillField(el,'5');}}
      // GPA is handled per-section by fillGpaAndOutOf
    });
  },1500);
  fillCustomSections();
  document.querySelectorAll('input, textarea').forEach(function(el) {
    var n=(el.name||'').toLowerCase();
    var i=(el.id||'').toLowerCase();
    var p=(el.placeholder||'').toLowerCase();
    if(n.includes('village')||n.includes('vill')||n.includes('road')||n.includes('house')||n.includes('flat')||i.includes('village')||i.includes('vill')||i.includes('road')||p.includes('village')||p.includes('road')){
      if (savedData && savedData['f-village']) fillField(el, savedData['f-village']);
    }
  });
}

function run(savedData, customSections, customSectionValues) {
  CUSTOM_SECTIONS = customSections || [];
  CUSTOM_SECTION_VALUES = customSectionValues || {};
  if (savedData) {
    // JSC [0]
    EDU[0].exam=savedData['f-jsc-exam']||''; EDU[0].board=savedData['f-jsc-board']||''; EDU[0].roll=savedData['f-jsc-roll']||''; EDU[0].group=savedData['f-jsc-group']||''; EDU[0].result=savedData['f-jsc-result']||''; EDU[0].gpa=savedData['f-jsc-gpa']||''; EDU[0].year=savedData['f-jsc-year']||''; EDU[0].institute=savedData['f-jsc-institute']||'';
    // SSC [1]
    EDU[1].exam=savedData['f-ssc-exam']||''; EDU[1].board=savedData['f-ssc-board']||''; EDU[1].roll=savedData['f-ssc-roll']||''; EDU[1].group=savedData['f-ssc-group']||''; EDU[1].result=savedData['f-ssc-result']||''; EDU[1].gpa=savedData['f-ssc-gpa']||''; EDU[1].year=savedData['f-ssc-year']||''; EDU[1].institute=savedData['f-ssc-institute']||'';
    // HSC [2]
    EDU[2].exam=savedData['f-hsc-exam']||''; EDU[2].board=savedData['f-hsc-board']||''; EDU[2].roll=savedData['f-hsc-roll']||''; EDU[2].group=savedData['f-hsc-group']||''; EDU[2].result=savedData['f-hsc-result']||''; EDU[2].gpa=savedData['f-hsc-gpa']||''; EDU[2].year=savedData['f-hsc-year']||''; EDU[2].institute=savedData['f-hsc-institute']||'';
    // Diploma [3]
    EDU[3].exam=savedData['f-diploma-exam']||''; EDU[3].board=savedData['f-diploma-board']||''; EDU[3].roll=''; EDU[3].group=savedData['f-diploma-group']||''; EDU[3].result=savedData['f-diploma-result']||''; EDU[3].gpa=savedData['f-diploma-gpa']||''; EDU[3].year=savedData['f-diploma-year']||''; EDU[3].institute=savedData['f-diploma-institute']||'';
    // Graduation [4]
    EDU[4].exam=savedData['f-grad-exam']||''; EDU[4].board=savedData['f-grad-univ']||''; EDU[4].group=savedData['f-grad-subject']||''; EDU[4].result=savedData['f-grad-result']||''; EDU[4].gpa=savedData['f-grad-gpa']||''; EDU[4].year=savedData['f-grad-year']||'';
    // Masters [5]
    EDU[5].exam=savedData['f-masters-exam']||''; EDU[5].board=savedData['f-masters-univ']||''; EDU[5].group=savedData['f-masters-subject']||''; EDU[5].result=savedData['f-masters-result']||''; EDU[5].gpa=savedData['f-masters-gpa']||''; EDU[5].year=savedData['f-masters-year']||'';
  }
  setTimeout(function() { fillAll(savedData); }, 1500);
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.action === 'fill') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['formFillData', 'customSections', 'customSectionValues'], function(result) {
        var formData = (result && result.formFillData) ? result.formFillData : null;
        var sections = (result && result.customSections) ? result.customSections : [];
        var sectionValues = (result && result.customSectionValues) ? result.customSectionValues : {};
        run(formData, sections, sectionValues);
      });
    } else { run(null, [], {}); }
    sendResponse({ ok: true });
  }
  return true;
});
