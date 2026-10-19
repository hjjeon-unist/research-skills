'use strict';
(() => {
  const D = JSON.parse(document.getElementById('atlas-data').textContent);
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const papers = new Map(D.papers.map(p => [p.id, p]));
  const people = new Map(D.researchers.map(p => [p.id, p]));
  const sources = new Map(D.sources.map(s => [s.id, s]));
  const S = {tab:'map', map:{selected:null, query:'', core:true, zoom:1}, people:{selected:null, query:'', zoom:1}};
  const graph = {map:{items:D.papers, edges:D.edges, byId:papers}, people:{items:D.researchers, edges:D.researcher_edges, byId:people}};
  const layouts = {};
  const external = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;
  function cites(ids) {
    return `<div class="citations">${ids.map(id => {const s=sources.get(id);return external(s.url, s.title + (s.locator ? ' · '+s.locator : ''));}).join('')}</div>`;
  }
  function claim(c) { return `<p>${esc(c.text)}</p>${cites(c.sources)}`; }
  function media(m, person=false) {
    if (!m) return `<p class="muted">${person?'Verified portrait':'Source figure'} unavailable for embedding. See the linked original sources.</p>`;
    return `<figure><img ${person?'class="portrait"':''} src="${esc(m.src)}" alt="${esc(m.alt)}"><figcaption>${esc(m.caption)} · ${esc(m.credit)} · ${esc(m.license)} · ${external(m.source_url,'Original source')}</figcaption></figure>`;
  }
  function flow(p) {
    return `<div class="flow"><div><b>INPUT →</b><p>${esc(p.mechanism.input)}</p></div><div><b>OUTPUT →</b><p>${esc(p.mechanism.output)}</p></div><div><b>LEARNING / EVALUATION OBJECTIVE</b><p>${esc(p.mechanism.objective)}</p></div></div>`;
  }
  function technical(p) {
    const m=p.mechanism;
    return m.architecture||m.loss ? `<details><summary>Architecture & loss details</summary>${m.architecture?`<p>${esc(m.architecture)}</p>`:''}${m.loss?`<pre class="formula">${esc(m.loss)}</pre>`:''}${cites(p.sources)}</details>`:'';
  }
  function activateTab(name, focus=false) {
    S.tab=name;
    document.querySelectorAll('[data-tab]').forEach(b => {const on=b.dataset.tab===name;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;if(on&&focus)b.focus();});
    document.querySelectorAll('[role=tabpanel]').forEach(p => p.hidden=p.id!=='panel-'+name);
  }
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click',()=>activateTab(button.dataset.tab));
    button.addEventListener('keydown',event=>{
      const names=['map','mechanisms','people','index','sources'];let i=names.indexOf(button.dataset.tab);
      if(event.key==='ArrowRight')i=(i+1)%names.length;else if(event.key==='ArrowLeft')i=(i+names.length-1)%names.length;else if(event.key==='Home')i=0;else if(event.key==='End')i=names.length-1;else return;
      event.preventDefault();activateTab(names[i],true);
    });
  });
  function matches(item, query) {return JSON.stringify(item, (key,value)=>key==='src'?undefined:value).toLowerCase().includes(query.trim().toLowerCase());}
  function visible(kind) {return graph[kind].items.filter(p => (kind!=='map'||!S.map.core||p.core)&&matches(p,S[kind].query));}
  function nodeTitle(kind,p) {return kind==='map'?p.title:p.name;}
  function renderGraph(kind) {
    const list=visible(kind), canvas=$(kind+'-canvas');
    const groups=[...new Set(list.map(p=>kind==='map'?String(p.year):p.affiliation_at_study))].sort((a,b)=>kind==='map'?Number(a)-Number(b):a.localeCompare(b));
    const pos=new Map();let maxRows=1;
    const labels=[];
    groups.forEach((g,col)=>{
      const members=list.filter(p=>(kind==='map'?String(p.year):p.affiliation_at_study)===g).sort((a,b)=>nodeTitle(kind,a).localeCompare(nodeTitle(kind,b)));
      maxRows=Math.max(maxRows,members.length);
      labels.push(`<span class="column-label" style="left:${28+col*302}px;top:14px" title="${esc(g)}">${esc(g)}</span>`);
      members.forEach((p,row)=>pos.set(p.id,{x:28+col*302,y:48+row*260,w:260,h:232}));
    });
    const width=Math.max(400,groups.length*302+28),height=Math.max(360,maxRows*260+55);
    layouts[kind]={pos,width,height};
    const edges=graph[kind].edges.filter(e=>pos.has(e.from)&&pos.has(e.to));
    const paths=edges.map(e=>{
      const a=pos.get(e.from),b=pos.get(e.to);let d;
      if(a.x===b.x){const x=a.x+a.w+10;d=`M ${a.x+a.w} ${a.y+a.h/2} C ${x+30} ${a.y+a.h/2} ${x+30} ${b.y+b.h/2} ${b.x+b.w} ${b.y+b.h/2}`;}
      else{const forward=b.x>a.x,x1=a.x+(forward?a.w:0),x2=b.x+(forward?0:b.w),mid=(x1+x2)/2;
        if(Math.abs(b.x-a.x)>303){const offset=forward?18:-18,rail=Math.max(a.y+a.h,b.y+b.h)+12;d=`M ${x1} ${a.y+a.h/2} L ${x1+offset} ${a.y+a.h/2} L ${x1+offset} ${rail} L ${x2-offset} ${rail} L ${x2-offset} ${b.y+b.h/2} L ${x2} ${b.y+b.h/2}`;}
        else d=`M ${x1} ${a.y+a.h/2} C ${mid} ${a.y+a.h/2} ${mid} ${b.y+b.h/2} ${x2} ${b.y+b.h/2}`;
      }
      return `<path class="edge ${esc(e.confidence)}" data-edge="${esc(e.id)}" d="${d}" marker-end="url(#arrow-${kind})"/>`;
    }).join('');
    const nodes=list.map(p=>{
      const a=pos.get(p.id),m=kind==='map'?p.figure:p.portrait;
      const thumb=m?`<img class="thumb" src="${esc(m.src)}" alt="${esc(m.alt)}">`:`<span class="placeholder">${kind==='map'?'Source figure unavailable':esc(p.name.split(/\s+/).map(n=>n[0]).slice(0,2).join(''))}</span>`;
      const meta=kind==='map'?`${p.year} · ${p.category}`:'Researcher · documented context';
      return `<button class="node" data-node="${esc(p.id)}" aria-pressed="false" aria-label="${esc(nodeTitle(kind,p))}. Select to trace relationships; activate again for details." style="left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px">${thumb}<span class="body"><span class="meta">${esc(meta)}</span><strong>${esc(nodeTitle(kind,p))}</strong><span class="venue">${esc(kind==='map'?p.venue:p.affiliation_at_study)}</span></span></button>`;
    }).join('');
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    canvas.innerHTML=`<svg aria-hidden="true" width="${width}" height="${height}"><defs><marker id="arrow-${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#416c9e"/></marker></defs>${paths}</svg>${labels.join('')}${nodes}${list.length?'':'<p class="empty">No matching items. Clear the search or show all links.</p>'}`;
    canvas.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>{
      if(S[kind].selected===b.dataset.node)openDetail(kind,b.dataset.node,b);else{S[kind].selected=b.dataset.node;updateSelection(kind);}
    }));
    scale(kind);updateSelection(kind);
  }
  function scale(kind) {
    const l=layouts[kind],z=S[kind].zoom;
    $(kind+'-canvas').style.transform=`scale(${z})`;
    $(kind+'-sizer').style.width=l.width*z+'px';$(kind+'-sizer').style.height=l.height*z+'px';$(kind+'-zoom').textContent=Math.round(z*100)+'%';
  }
  function edgeInfo(e,kind) {
    const g=graph[kind];
    return `<span class="badge">${esc(e.type)} · ${esc(e.confidence)}</span><strong>${esc(nodeTitle(kind,g.byId.get(e.from)))} → ${esc(nodeTitle(kind,g.byId.get(e.to)))}</strong><p>${esc(e.explanation)}</p>${cites(e.sources)}`;
  }
  function updateSelection(kind) {
    const id=S[kind].selected,g=graph[kind],related=g.edges.filter(e=>e.from===id||e.to===id),neighbors=new Set(related.flatMap(e=>[e.from,e.to]));
    $(kind+'-canvas').querySelectorAll('[data-node]').forEach(b=>{const selected=b.dataset.node===id;b.classList.toggle('selected',selected);b.classList.toggle('neighbor',!selected&&neighbors.has(b.dataset.node));b.classList.toggle('dim',!!id&&!selected&&!neighbors.has(b.dataset.node));b.setAttribute('aria-pressed',String(selected));});
    $(kind+'-canvas').querySelectorAll('[data-edge]').forEach(p=>{const on=related.some(e=>e.id===p.dataset.edge);p.classList.toggle('active',!!id&&on);p.classList.toggle('dim',!!id&&!on);});
    const shown=layouts[kind].pos,totalEdges=g.edges.length,visibleEdges=g.edges.filter(e=>shown.has(e.from)&&shown.has(e.to)).length;
    const box=$(kind+'-selection');
    if(!id){box.innerHTML=`<p>${shown.size} / ${g.items.length} items · ${visibleEdges} / ${totalEdges} links visible.</p><small>Select a card to highlight relationships. Hidden links can be revealed with “Show all links”.</small>`;return;}
    const hidden=related.filter(e=>!shown.has(e.from)||!shown.has(e.to)).length;
    box.innerHTML=`<p><strong>${esc(nodeTitle(kind,g.byId.get(id)))}</strong> · ${related.length} connections · ${hidden} hidden by filters${shown.has(id)?'':' · selected card is filtered out'}</p><button data-read-selected>Read details</button><details><summary>Relationship evidence (${related.length})</summary><ul>${related.map(e=>`<li>${edgeInfo(e,kind)}</li>`).join('')}</ul>${related.length?'':'<p>No relationships recorded.</p>'}</details>`;
    box.querySelector('[data-read-selected]').addEventListener('click',e=>openDetail(kind,id,e.currentTarget));
  }
  ['map','people'].forEach(kind=>{
    $(kind+'-search').addEventListener('input',e=>{S[kind].query=e.target.value;renderGraph(kind);});
    $(kind+'-canvas').addEventListener('click',event=>{if(!event.target.closest('[data-node]')){S[kind].selected=null;updateSelection(kind);}});
  });
  $('core-only').addEventListener('change',e=>{S.map.core=e.target.checked;renderGraph('map');});
  document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{S[b.dataset.clear].selected=null;updateSelection(b.dataset.clear);}));
  document.querySelectorAll('[data-reveal]').forEach(b=>b.addEventListener('click',()=>{const kind=b.dataset.reveal;S[kind].query='';$(kind+'-search').value='';if(kind==='map'){S.map.core=false;$('core-only').checked=false;}renderGraph(kind);}));
  document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{const kind=b.dataset.zoom;S[kind].zoom=Math.max(.4,Math.min(1.9,S[kind].zoom+Number(b.dataset.step)));scale(kind);}));
  const dialog=$('detail');let stack=[],returnFocus=null;
  function paperDetails(p) {
    const context=Object.entries(p.team_context).map(([key,c])=>`<h4>${esc({before:'Before this work',current:'This contribution',after:'Later direction'}[key])}</h4>${claim(c)}`).join('');
    const edges=D.edges.filter(e=>e.from===p.id||e.to===p.id);
    return `<h2 id="detail-title">${esc(p.title)}</h2><p class="muted">${esc(p.authors.join(', '))} · ${p.year} · ${esc(p.venue)}</p>${external(p.url,'Read original paper')}<h3>Research question</h3><p>${esc(p.question)}</p><h3>Contribution</h3><p>${esc(p.contribution)}</p>${cites(p.sources)}${flow(p)}${technical(p)}${media(p.figure)}<h3>Findings</h3>${p.findings.length?p.findings.map(claim).join(''):'<p>No supported finding recorded.</p>'}<h3>Limitations</h3>${p.limitations.length?p.limitations.map(claim).join(''):'<p>No limitation extracted; this is not evidence of absence.</p>'}<h3>Research team context</h3><div class="chips">${p.researcher_ids.map(id=>`<button data-person="${id}">${esc(people.get(id).name)}</button>`).join('')}</div>${context||'<p>Team chronology has not been verified.</p>'}<h3>Connected work</h3><ul>${edges.map(e=>`<li>${edgeInfo(e,'map')}</li>`).join('')}</ul><h3>Sources</h3>${cites(p.sources)}`;
  }
  function personDetails(p) {
    const works=D.papers.filter(q=>q.researcher_ids.includes(p.id)),edges=D.researcher_edges.filter(e=>e.from===p.id||e.to===p.id);
    return `<h2 id="detail-title">${esc(p.name)}</h2><p class="muted">Affiliation at study: ${esc(p.affiliation_at_study)}</p>${media(p.portrait,true)}<p>${esc(p.context)}</p><h3>Verified roles</h3>${p.roles.length?p.roles.map(claim).join(''):'<p>No role verified.</p>'}<h3>Selected studies</h3><div class="chips">${works.map(q=>`<button data-paper="${q.id}">${q.year} · ${esc(q.title)}</button>`).join('')}</div><h3>Documented relationships</h3><ul>${edges.map(e=>`<li>${edgeInfo(e,'people')}</li>`).join('')}</ul>${edges.length?'':'<p>No personal relationships recorded.</p>'}${cites(p.sources)}`;
  }
  function renderDetail() {
    const entry=stack.at(-1);$('detail-kind').textContent=entry.kind==='map'?'Paper evidence':'Researcher evidence';$('back').hidden=stack.length<2;
    $('detail-body').innerHTML=entry.kind==='map'?paperDetails(papers.get(entry.id)):personDetails(people.get(entry.id));
    $('detail-body').querySelectorAll('[data-person],[data-paper]').forEach(b=>b.addEventListener('click',()=>{
      entry.scroll=dialog.scrollTop;entry.focusKey=b.dataset.person?'person:'+b.dataset.person:'paper:'+b.dataset.paper;
      entry.openDetails=[...$('detail-body').querySelectorAll('details')].map(d=>d.open);
      stack.push({kind:b.dataset.person?'people':'map',id:b.dataset.person||b.dataset.paper,scroll:0});renderDetail();$('back').focus({preventScroll:true});
    }));
    if(entry.openDetails)$('detail-body').querySelectorAll('details').forEach((d,i)=>{d.open=!!entry.openDetails[i];});
    requestAnimationFrame(()=>{dialog.scrollTop=entry.scroll;});
  }
  function openDetail(kind,id,origin) {
    returnFocus=origin;stack=[{kind,id,scroll:0}];renderDetail();dialog.showModal();$('close').focus({preventScroll:true});
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)dialog.animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:160,easing:'ease-out'});
  }
  $('back').addEventListener('click',()=>{
    if(stack.length<2)return;stack.pop();renderDetail();const previous=stack.at(-1);
    requestAnimationFrame(()=>{const [kind,id]=(previous.focusKey||'').split(':');const button=$('detail-body').querySelector(`[data-${kind}="${id}"]`);(button||$('close')).focus({preventScroll:true});dialog.scrollTop=previous.scroll;});
  });
  $('close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true});stack=[];});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&['map','people'].includes(S.tab)){S[S.tab].selected=null;updateSelection(S.tab);}});
  function renderIndex() {
    const list=D.papers.filter(p=>matches(p,$('index-search').value)).sort((a,b)=>a.year-b.year);
    $('paper-index').innerHTML=`<p class="muted">${list.length} papers</p>`+list.map(p=>`<article class="index-row"><b>${p.year}</b><div><button class="text-button" data-index-paper="${p.id}">${esc(p.title)}</button><p class="muted">${esc(p.authors.join(', '))} · ${esc(p.venue)}</p><p>${esc(p.contribution)}</p><span class="badge">${esc(p.category)}</span></div></article>`).join('');
    document.querySelectorAll('[data-index-paper]').forEach(b=>b.addEventListener('click',()=>openDetail('map',b.dataset.indexPaper,b)));
  }
  $('index-search').addEventListener('input',renderIndex);
  $('title').textContent=D.title;$('summary').textContent=D.summary;$('cutoff').textContent='REVIEWED THROUGH '+D.as_of;
  $('counts').textContent=`${D.papers.length} papers · ${D.researchers.length} researchers · ${D.edges.length} paper relationships`;$('demo').hidden=!D.demo;
  $('mechanisms').innerHTML=D.papers.map(p=>`<article class="study"><span class="badge">${p.year} · ${esc(p.category)}</span><h3>${esc(p.title)}</h3>${flow(p)}${technical(p)}${cites(p.sources)}</article>`).join('');
  $('scope').innerHTML=`<p>${esc(D.scope.review_type||'Selected literature review')} · cutoff ${esc(D.as_of)}</p><div class="scope-grid">${['inclusion','exclusions','gaps','queries'].map(k=>`<section><h3>${esc({inclusion:'Included scope',exclusions:'Exclusions',gaps:'Known gaps',queries:'Search log'}[k])}</h3><ul>${D.scope[k].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${D.scope[k].length?'':'<p>None recorded.</p>'}</section>`).join('')}</div>`;
  $('source-list').innerHTML=D.sources.map(s=>`<li>${external(s.url,s.title)}<small>Read: ${esc(s.read)} · accessed ${esc(s.accessed)}${s.locator?' · '+esc(s.locator):''}</small></li>`).join('');
  renderGraph('map');renderGraph('people');renderIndex();
})();
