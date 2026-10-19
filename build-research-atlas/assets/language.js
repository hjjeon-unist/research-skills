'use strict';
// Translate text in place so selection, zoom, scroll, dialogs and focus survive.
(() => {
  const source = document.getElementById('research-language-data') || document.getElementById('atlas-data');
  const data = JSON.parse(source.textContent);
  const ui = {
    'Research Topic:':'연구 주제:', 'Map':'연구 지도', 'Models':'모델', 'Researchers':'연구자',
    'Papers':'논문', 'Sources':'출처', 'Language':'언어', 'Skip to content':'본문으로 이동',
    'Research views':'연구 보기', 'Search papers':'논문 검색', 'Search researchers':'연구자 검색',
    'Title, author, question…':'제목, 저자, 주제…', 'Name, context, affiliation…':'이름, 연구, 소속…',
    'Core only':'핵심 논문', 'All links':'전체 연결', 'Clear':'선택 해제',
    'Documented':'문헌 근거', 'Inferred':'해석', 'Input / output':'입력 / 출력',
    'Search all papers':'전체 논문 검색', 'Scope & sources':'범위와 출처',
    'Close ×':'닫기 ×', 'Close details':'상세 닫기', '← Back':'← 뒤로',
    'Details':'상세', 'Research question':'연구 질문', 'Contribution':'기여',
    'Findings':'결과', 'Limitations':'한계', 'Research team context':'연구진의 연구 흐름',
    'Connected work':'관련 연구', 'Read original paper':'원문', 'Original source':'원출처',
    'INPUT →':'입력 →', 'OUTPUT →':'출력 →', 'LEARNING / EVALUATION OBJECTIVE':'학습 / 평가 목표',
    'Architecture & loss details':'구조와 손실함수', 'Before this work':'선행 연구',
    'This contribution':'이번 연구', 'Later direction':'후속 방향', 'Verified roles':'확인된 역할',
    'Selected studies':'수록 논문', 'Documented relationships':'확인된 관계',
    'Paper evidence':'논문 상세', 'Researcher evidence':'연구자 상세',
    'Included scope':'포함 범위', 'Exclusions':'제외 항목', 'Known gaps':'검토의 한계',
    'Search log':'검색 기록', 'None recorded.':'기록 없음.', 'No relationships recorded.':'기록된 관계 없음.',
    'No personal relationships recorded.':'기록된 인적 관계 없음.', 'No role verified.':'확인된 역할 없음.',
    'No supported finding recorded.':'근거를 확인한 결과 없음.',
    'No limitation extracted; this is not evidence of absence.':'추출한 한계 없음. 한계가 없다는 의미는 아닙니다.',
    'Team chronology has not been verified.':'연구진의 선후 연구 흐름은 확인하지 못했습니다.',
    'Source figure unavailable':'그림 미수록', 'Researcher · documented context':'연구자 · 확인된 정보',
    'Source figure unavailable for embedding. See the linked original sources.':'그림 미수록. 원출처를 확인하세요.',
    'Verified portrait unavailable for embedding. See the linked original sources.':'사진 미수록. 원출처를 확인하세요.',
    'No matching items. Clear the search or show all links.':'검색 결과 없음.',
    'Zoom out paper map':'논문 지도 축소', 'Zoom in paper map':'논문 지도 확대',
    'Zoom out researcher map':'연구자 지도 축소', 'Zoom in researcher map':'연구자 지도 확대',
    'Scrollable paper graph':'스크롤 가능한 논문 지도', 'Scrollable researcher graph':'스크롤 가능한 연구자 지도',
    'Fictional demo · not research evidence.':'가상 예시 · 실제 연구 근거가 아닙니다.',
    'antecedent':'선행 연구', 'original':'원 연구', 'extension':'확장', 'application':'응용',
    'replication':'재현', 'critique':'비판적 검토', 'alternative':'대안',
    'coauthor':'공동 저자', 'supervision':'지도', 'collaboration':'협업',
    'documented':'문헌 근거', 'inferred':'해석'
  };
  const dictionaries = {ko:{...ui,...(data.translations?.ko || {})},en:data.translations?.en || {}};
  const textState = new WeakMap(), attributeState = new WeakMap();
  const attributes = ['aria-label','title','placeholder','alt'];
  const key = 'research-topic-language:' + location.pathname;
  let language = data.language === 'ko' ? 'ko' : 'en';
  try { const saved=localStorage.getItem(key);if(saved==='en'||saved==='ko')language=saved; } catch {}
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function translate(value) {
    const trimmed=value.trim(), dict=dictionaries[language];
    let result=own(dict,trimmed)?dict[trimmed]:trimmed;
    if(result===trimmed && language==='ko') {
      const rules = [
        [/^Research Topic: (.+)$/,m=>'연구 주제: '+m[1]],
        [/^Reviewed: (.+)$/,m=>'검토 기준: '+m[1]],
        [/^(\d+) papers · (\d+) researchers · (\d+) links$/,m=>`논문 ${m[1]} · 연구자 ${m[2]} · 연결 ${m[3]}`],
        [/^(\d+) papers$/,m=>`논문 ${m[1]}편`],
        [/^(\d+) \/ (\d+) items · (\d+) \/ (\d+) links$/,m=>`항목 ${m[1]} / ${m[2]} · 연결 ${m[3]} / ${m[4]}`],
        [/^· (\d+) connections · (\d+) filtered( · selected card is filtered out)?$/,m=>`· 연결 ${m[1]} · 필터 제외 ${m[2]}${m[3]?' · 선택 항목은 필터로 숨겨짐':''}`],
        [/^Relationship evidence \((\d+)\)$/,m=>`연결 근거 (${m[1]})`],
        [/^Affiliation at study: (.+)$/,m=>'연구 당시 소속: '+translate(m[1])],
        [/^(.+)\. Select to trace relationships; activate again for details\.$/,m=>m[1]+'. 선택하면 연결 표시, 다시 선택하면 상세 보기.'],
        [/^(antecedent|extension|application|replication|critique|alternative|coauthor|supervision|collaboration) · (documented|inferred)$/,m=>ui[m[1]]+' · '+ui[m[2]]],
        [/^(\d{4}) · (antecedent|original|extension|application|replication|critique|alternative)$/,m=>m[1]+' · '+ui[m[2]]],
        [/^Read: (.+) · accessed (.+)$/,m=>'검토: '+({'full-text':'전문','abstract':'초록','metadata':'서지정보','profile':'프로필'}[m[1]]||m[1])+' · 확인일 '+m[2]]
      ];
      for(const [pattern,replace] of rules){const m=trimmed.match(pattern);if(m){result=replace(m);break;}}
    }
    if(result===trimmed && trimmed.endsWith(' ↗')) result=translate(trimmed.slice(0,-2))+' ↗';
    if(result===trimmed && trimmed.includes(' · ')) result=trimmed.split(' · ').map(translate).join(' · ');
    return value.slice(0,value.indexOf(trimmed))+result+value.slice(value.indexOf(trimmed)+trimmed.length);
  }
  function allowed(element) {return element && !element.closest('script,style,code,pre,[data-no-translate]');}
  function text(node) {
    if(!node.nodeValue.trim() || !allowed(node.parentElement))return;
    let record=textState.get(node);
    if(!record || node.nodeValue!==record.last)record={original:node.nodeValue,last:node.nodeValue};
    const next=translate(record.original);
    if(node.nodeValue!==next)node.nodeValue=next;
    record.last=next;textState.set(node,record);
  }
  function attr(element) {
    if(!allowed(element))return;
    let records=attributeState.get(element)||{};
    for(const name of attributes){
      const current=element.getAttribute(name);if(current===null)continue;
      let record=records[name];if(!record||current!==record.last)record={original:current,last:current};
      const next=translate(record.original);if(current!==next)element.setAttribute(name,next);
      record.last=next;records[name]=record;
    }
    attributeState.set(element,records);
  }
  function walk(root) {
    if(root.nodeType===Node.TEXT_NODE){text(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE || !allowed(root))return;
    attr(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
      acceptNode:n=>n.nodeType===Node.ELEMENT_NODE&&!allowed(n)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT
    });
    let node;while((node=walker.nextNode()))node.nodeType===Node.TEXT_NODE?text(node):attr(node);
  }
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const r of records){if(r.type==='childList')r.addedNodes.forEach(walk);else if(r.type==='characterData')text(r.target);else attr(r.target);}
    observe();
  });
  function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});}
  function setLanguage(next) {
    if(next!=='en'&&next!=='ko')return;
    observer.disconnect();language=next;walk(document.body);
    document.documentElement.lang=next;
    document.querySelectorAll('.language-switch').forEach(group=>group.setAttribute('aria-label',next==='ko'?'언어':'Language'));
    document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===next)));
    const title=document.querySelector('h1');if(title)document.title=title.textContent.trim();
    try{localStorage.setItem(key,next);}catch{}
    observe();document.dispatchEvent(new CustomEvent('research-language-change',{detail:next}));
  }
  document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.language)));
  window.researchSearchText = value => {
    const parts=[];
    function collect(item){
      if(typeof item==='string'){if(!item.startsWith('data:')){parts.push(item);for(const dict of Object.values(dictionaries))if(own(dict,item.trim()))parts.push(dict[item.trim()]);}}
      else if(Array.isArray(item))item.forEach(collect);
      else if(item&&typeof item==='object')Object.values(item).forEach(collect);
    }
    collect(value);return parts.join(' ').toLowerCase();
  };
  setLanguage(language);
})();
