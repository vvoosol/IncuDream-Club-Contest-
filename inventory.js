'use strict';
// The bag stores occupied cells, not bounding boxes, so irregular pieces interlock.
let itemSerial=0, itemDrag=null, inventorySignature='', nearbySignature='',lastItemTap=null;
function bagSize(){return state?.bagSize||{cols:5,rows:4};}
function configureBagGrid(){const {cols,rows}=bagSize(),cell=Math.floor(Math.min((360-10-(cols-1)*3)/cols,(190-10-(rows-1)*3)/rows));$('bag').style.cssText=`grid-template-columns:repeat(${cols},${cell}px);grid-template-rows:repeat(${rows},${cell}px);width:${cell*cols+(cols-1)*3+10}px;height:${cell*rows+(rows-1)*3+10}px;`;$('bag').setAttribute('aria-label',`${cols}열 ${rows}행 연구 가방`);}
// Future expansion rewards can call this once with their unique acquisition ID.
function expandBag({cols=0,rows=0,sourceId}){if(!state||!sourceId||state.bagExpansions.includes(sourceId)||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<0||rows<0||cols+rows===0)return false;cancelItemDrag();state.bagSize.cols+=cols;state.bagSize.rows+=rows;state.bagExpansions.push(sourceId);updateInventory(true);updateUI();return true;}
function autoPack(item){if(!canArrange()||!loot.includes(item)||dist(item,state.player)>80)return false;const d=itemDefs[item.id],{cols,rows}=bagSize();for(let y=0;y<=rows-d.h;y++)for(let x=0;x<=cols-d.w;x++){if(!canPlaceItem(item.id,x,y))continue;loot.splice(loot.indexOf(item),1);state.bag.push({id:item.id,uid:identify(item),x,y});hideTooltip();recalc();updateInventory(true);updateUI();toast(d.name+' · '+d.effect);return true;}toast('아이템을 넣을 수 있는 빈 공간이 없습니다');return false;}
function identify(item){if(!item.uid)item.uid=++itemSerial;return item.uid;}
function itemCells(id){const d=itemDefs[id];return d.cells||Array.from({length:d.w*d.h},(_,i)=>[i%d.w,Math.floor(i/d.w)]);}
function canArrange(){return !!state&&['play','pause'].includes(mode);}
function canPlaceItem(id,x,y,ignore=null){
 const {cols,rows}=bagSize();const cells=itemCells(id).map(([cx,cy])=>[x+cx,y+cy]);
 if(cells.some(([cx,cy])=>cx<0||cx>=cols||cy<0||cy>=rows))return false;
 const occupied=new Set();for(const b of state.bag){if(b===ignore)continue;for(const [cx,cy]of itemCells(b.id))occupied.add((b.y+cy)*cols+b.x+cx);}
 return cells.every(([cx,cy])=>!occupied.has(cy*cols+cx));
}
function bagGeometry(){
 const {cols,rows}=bagSize();const cells=$('bag').querySelectorAll('.cell');if(cells.length<cols*rows)return null;
 const a=cells[0].getBoundingClientRect(),b=cells[1].getBoundingClientRect(),c=cells[cols].getBoundingClientRect(),box=$('bag').getBoundingClientRect(),scale=$('game').getBoundingClientRect().width/540;
 return {left:a.left,top:a.top,px:(b.left-a.left)/scale,py:(c.top-a.top)/scale,cw:a.width/scale,ch:a.height/scale,scale,ox:(a.left-box.left)/scale-1,oy:(a.top-box.top)/scale-1};
}
function pieceMarkup(id,g){
 const d=itemDefs[id],cells=itemCells(id),anchor=d.cells?[.5,1.5]:[d.w/2,d.h/2];
 const size=Math.min(49,g.cw*.88*Math.min(d.w,d.h));return cells.map(([x,y])=>`<i class="shape-tile" style="left:${x*g.px}px;top:${y*g.py}px;width:${g.cw}px;height:${g.ch}px;--rarity:${d.color}"></i>`).join('')+`<span class="item-art" style="width:${size}px;height:${size}px;left:${anchor[0]*g.px-1.5}px;top:${anchor[1]*g.py-1.5}px">${icon(d.icon)}</span>`;
}
function updateInventory(force=false){
 if(!state)return;
 state.bag.forEach(identify);loot.forEach(identify);
 const size=bagSize();const bagKey=size.cols+':'+size.rows+':'+state.bag.map(b=>[b.uid,b.id,b.x,b.y].join(':')).join('|');
 if((force||bagKey!==inventorySignature||!$('bag').children.length)&&!itemDrag?.active){
  inventorySignature=bagKey;configureBagGrid();$('bag').innerHTML=Array.from({length:size.cols*size.rows},(_,i)=>`<div class="cell" data-cell="${i}"></div>`).join('');
  const g=bagGeometry();
  for(const b of state.bag){const d=itemDefs[b.id],node=document.createElement('button');node.className='bagitem';node.dataset.bagUid=b.uid;node.setAttribute('aria-label',`${d.name}: ${d.effect}`);node.style.cssText=`left:${g.ox+b.x*g.px}px;top:${g.oy+b.y*g.py}px;width:${d.w*g.px-3}px;height:${d.h*g.py-3}px;--rarity:${d.color};`;node.innerHTML=pieceMarkup(b.id,g);$('bag').appendChild(node);}
 }
 const near=loot.filter(l=>dist(l,state.player)<80).sort((a,b)=>dist(a,state.player)-dist(b,state.player)).slice(0,3);
 const nearKey=near.map(l=>l.uid).join('|');
 if((force||nearKey!==nearbySignature||!$('loot').children.length)&&!itemDrag?.active){
  nearbySignature=nearKey;
  $('loot').innerHTML=near.length?near.map(l=>{const d=itemDefs[l.id];return `<button class="loot-card" data-loot-uid="${l.uid}" style="--rarity:${d.color}" aria-label="${d.name}: ${d.effect}。가방으로 드래그">${icon(d.icon)}<span>${d.name}</span><small>${d.w}×${d.h}${d.cells?' · L':''}</small></button>`;}).join(''):'<div class="empty-loot">주변에 연구 장비가 없습니다<br>실험체와 보급 상자에서 장비를 찾아보세요</div>';
 }
}
function itemFromNode(node){if(!node||!state)return null;const bag=node.dataset.bagUid!==undefined,list=bag?state.bag:loot,uid=+(bag?node.dataset.bagUid:node.dataset.lootUid);const item=list.find(i=>i.uid===uid);return item?{item,source:bag?'bag':'loot',node}:null;}
function itemTarget(e){return e.target.closest?.('[data-bag-uid],[data-loot-uid]');}
function localPoint(e){const r=$('game').getBoundingClientRect(),s=r.width/540;return{x:(e.clientX-r.left)/s,y:(e.clientY-r.top)/s};}
function hideTooltip(){$('item-tooltip').hidden=true;}
function showTooltip(item,e){
 if(itemDrag?.active||!canArrange())return;const d=itemDefs[item.id],tip=$('item-tooltip');
 const categories={notebook:'보조장비 · 희귀',cell:'과학 도구 · 정교',boots:'방어구 · 일반',ring:'장신구 · 고급',coat:'방어구 · 희귀',coil:'과학 도구 · 희귀'};
 const details={notebook:'가방에 넣으면 모든 무기 공격의 피해가 증가합니다.',cell:'자동 공격이 더 자주 발동합니다. 다른 쿨타임 감소 장비와 합산됩니다.',boots:'기본 이동속도에 더해집니다. 실제 이동에는 기존 속도 계수 0.85가 적용됩니다.',ring:'작은 공간으로 공격력을 보조합니다.',coat:'최대 체력이 증가합니다. 탈착만으로 체력이 회복되지는 않습니다.',coil:'L자 모양의 빈 모서리를 다른 장비와 맞물려 배치할 수 있습니다.'};
 tip.innerHTML=`<b style="color:${d.color}">${d.name}</b><small>${categories[item.id]}</small><strong>${d.effect}</strong><p>${details[item.id]}</p><footer>점유 ${itemCells(item.id).length}칸 · ${d.w}×${d.h}${d.cells?' L자':''}<br>가방 안의 모든 장비 효과 적용 · 드래그로 배치</footer>`;
 tip.hidden=false;const p=localPoint(e),h=tip.offsetHeight,w=tip.offsetWidth;tip.style.left=clamp(p.x+16,8,540-w-8)+'px';tip.style.top=clamp(p.y-h-15,8,960-h-8)+'px';
}
function clearPreview(){document.querySelectorAll('.cell.valid,.cell.invalid').forEach(c=>c.classList.remove('valid','invalid'));$('dropzone').classList.remove('drop-ready');}
function cancelItemDrag(){
 if(itemDrag){const id=itemDrag.pointerId;itemDrag=null;if($('game').hasPointerCapture(id))$('game').releasePointerCapture(id);}
 $('drag-ghost').hidden=true;document.querySelectorAll('.drag-origin').forEach(n=>n.classList.remove('drag-origin'));clearPreview();
}
function inside(e,rect){return e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;}
function updateDrag(e){
 const d=itemDrag;if(!d||e.pointerId!==d.pointerId)return;
 const p=localPoint(e);
 if(!d.active){if(Math.hypot(p.x-d.start.x,p.y-d.start.y)<5)return;d.active=true;hideTooltip();d.node.classList.add('drag-origin');}
 const g=bagGeometry(),def=itemDefs[d.item.id],ghost=$('drag-ghost');
 ghost.hidden=false;ghost.innerHTML=pieceMarkup(d.item.id,g);ghost.style.width=(def.w*g.px-3)+'px';ghost.style.height=(def.h*g.py-3)+'px';ghost.style.left=(p.x-d.grab.x*g.px-g.cw/2)+'px';ghost.style.top=(p.y-d.grab.y*g.py-g.ch/2)+'px';
 clearPreview();const x=Math.floor((e.clientX-g.left)/(g.px*g.scale))-d.grab.x,y=Math.floor((e.clientY-g.top)/(g.py*g.scale))-d.grab.y;
 const overBag=inside(e,$('bag').getBoundingClientRect()),inReach=d.source==='bag'||dist(d.item,state.player)<=80;
 const valid=overBag&&inReach&&canPlaceItem(d.item.id,x,y,d.source==='bag'?d.item:null);
 const dropping=d.source==='bag'&&inside(e,$('dropzone').getBoundingClientRect());
 d.candidate={x,y,valid,dropping};ghost.className=valid||dropping?'valid':'invalid';
 if(overBag)for(const [cx,cy]of itemCells(d.item.id)){let xx=x+cx,yy=y+cy;if(xx>=0&&xx<bagSize().cols&&yy>=0&&yy<bagSize().rows)$('bag').querySelector(`[data-cell="${yy*bagSize().cols+xx}"]`).classList.add(valid?'valid':'invalid');}
 if(dropping)$('dropzone').classList.add('drop-ready');
}
function endDrag(e){
 const d=itemDrag;if(!d||e.pointerId!==d.pointerId)return;
 if(!d.active){const item=d.item,now=performance.now(),doubleTap=d.source==='loot'&&lastItemTap?.uid===item.uid&&now-lastItemTap.time<350;cancelItemDrag();if(doubleTap){lastItemTap=null;autoPack(item);}else{lastItemTap={uid:item.uid,time:now};showTooltip(item,e);}return;}
 updateDrag(e);const c=d.candidate;let message='배치할 수 없어 원래 자리로 돌아갔습니다';
 if(canArrange()&&c?.valid){
  if(d.source==='bag'){d.item.x=c.x;d.item.y=c.y;message='가방 배치를 변경했습니다';}
  else{const idx=loot.indexOf(d.item);if(idx>=0){loot.splice(idx,1);state.bag.push({id:d.item.id,uid:d.item.uid,x:c.x,y:c.y});recalc();message=itemDefs[d.item.id].name+' · '+itemDefs[d.item.id].effect;}}
 }else if(canArrange()&&c?.dropping){const idx=state.bag.indexOf(d.item);if(idx>=0){state.bag.splice(idx,1);loot.push({id:d.item.id,uid:d.item.uid,x:state.player.x,y:state.player.y+20});recalc();message=itemDefs[d.item.id].name+'을 바닥에 내려놓았습니다';}}
 cancelItemDrag();updateInventory(true);updateUI();toast(message);
}
const gameRoot=$('game');
gameRoot.addEventListener('pointerdown',e=>{
 const node=itemTarget(e);if(!node){if(!e.target.closest('#item-tooltip'))hideTooltip();return;}if(!canArrange()||(e.pointerType==='mouse'&&e.button!==0)||itemDrag)return;
 const found=itemFromNode(node);if(!found)return;e.preventDefault();const g=bagGeometry(),p=localPoint(e),rect=node.getBoundingClientRect(),def=itemDefs[found.item.id];
 const grab=found.source==='bag'?{x:clamp(Math.floor((e.clientX-rect.left)/(g.px*g.scale)),0,def.w-1),y:clamp(Math.floor((e.clientY-rect.top)/(g.py*g.scale)),0,def.h-1)}:{x:0,y:0};
 itemDrag={...found,pointerId:e.pointerId,start:p,grab,active:false,candidate:null};gameRoot.setPointerCapture(e.pointerId);if(e.pointerType==='touch')showTooltip(found.item,e);
});
gameRoot.addEventListener('pointermove',e=>{if(itemDrag&&e.pointerId===itemDrag.pointerId){e.preventDefault();updateDrag(e);return;}if(e.pointerType==='mouse'){const found=itemFromNode(itemTarget(e));if(found)showTooltip(found.item,e);else hideTooltip();}});
gameRoot.addEventListener('pointerup',endDrag);
gameRoot.addEventListener('pointercancel',e=>{if(itemDrag?.pointerId===e.pointerId){cancelItemDrag();updateInventory(true);}});
gameRoot.addEventListener('lostpointercapture',e=>{if(itemDrag?.pointerId===e.pointerId){cancelItemDrag();updateInventory(true);}});
gameRoot.addEventListener('pointerleave',hideTooltip);
gameRoot.addEventListener('focusin',e=>{const found=itemFromNode(itemTarget(e));if(found){const r=found.node.getBoundingClientRect();showTooltip(found.item,{clientX:r.left,clientY:r.top});}});
$('loot').addEventListener('dblclick',e=>{e.preventDefault();const found=itemFromNode(itemTarget(e));if(found?.source==='loot')autoPack(found.item);});
title();syncPauseButton();requestAnimationFrame(frame);
