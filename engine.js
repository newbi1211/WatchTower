(function(root){
const defs={power:{name:'발전소',cost:90,time:45},store:{name:'물류 창고',cost:60,time:35},home:{name:'거주동',cost:50,time:30},factory:{name:'제련 공장',cost:80,time:50},lab:{name:'연구소',cost:100,time:60},tower:{name:'감시탑',cost:75,time:40}};
function fresh(){return {version:1,time:0,steel:160,water:90,food:100,people:10,policy:'manual',stage:0,nextEvent:150,incident:null,refugees:false,research:0,tech:false,expedition:0,discovered:false,core:false,diplomacy:false,relations:{arca:0,sanctuary:0},buildings:[{id:1,type:'power',x:3,y:3,left:0},{id:2,type:'store',x:6,y:3,left:0},{id:3,type:'home',x:4,y:6,left:0}],logs:[{time:0,text:'독립 복합 거점 07의 관제권을 인계받았습니다.'}],resolved:0};}
function log(s,text){s.logs.unshift({time:s.time,text});s.logs=s.logs.slice(0,40);}
function count(s,type){return s.buildings.filter(b=>b.type===type&&!b.left).length;}
function capacity(s){return count(s,'store')*300;}
function power(s){return Math.max(0,count(s,'power')*60-(s.incident?.type==='coolant'?40:0));}
function demand(s){return s.buildings.filter(b=>!b.left&&b.type!=='power').length*12;}
function tick(s,seconds){for(let i=0;i<Math.floor(seconds);i++){
 s.time++;const working=power(s)>=demand(s);s.steel=Math.min(capacity(s),s.steel+(s.incident?.type==='logistics'?0:working?0.18+count(s,'factory')*.7:.04));s.water=Math.min(150,s.water+.025);s.food=Math.max(0,Math.min(200,s.food+.11-s.people*.008));
 for(const b of s.buildings)if(b.left>0&&--b.left===0)log(s,defs[b.type].name+' 건설 완료');
 if(s.stage===0&&s.time>=30){s.stage=1;s.incident={type:'coolant',at:s.time};log(s,'발전 구역에서 불안정한 빛이 관측되었습니다.');}
 if(s.stage===2&&s.time>=s.arrival){s.refugees=true;s.stage=3;log(s,'성역회의 구호 차량 도착. 생존자 5명이 거주 공간을 기다립니다.');}
 if(s.time>=s.nextEvent&&!s.incident&&s.stage>=3){s.incident={type:Math.floor(s.time/150)%2?'logistics':'fire',at:s.time};s.nextEvent=s.time+150;log(s,'산업·물류 구역에서 이상 활동 감지. 현장을 확인하세요.');}
 if(s.incident&&s.time-s.incident.at>60&&s.policy==='safe')resolve(s);
 if(s.incident&&s.time-s.incident.at>120&&s.time%30===0){s.steel=Math.max(0,s.steel-8);log(s,'미해결 사고로 물자가 손실되었습니다.');}
 if(s.research>0&&working&&--s.research===0){s.tech=true;log(s,'고효율 배터리 연구 완료. 감시탑 건설이 해금되었습니다.');}
 if(s.expedition>0&&--s.expedition===0){s.discovered=true;s.core=true;s.steel=Math.min(capacity(s),s.steel+60);log(s,'ALPHA 귀환: 북부 구조물과 AI 코어 발견. 아르카와 성역회의가 연락을 요청했습니다.');}
 }return s;}
function resolve(s){if(!s.incident)return false;const coolant=s.incident.type==='coolant';if(coolant?s.water<20:s.steel<15)return false;if(coolant)s.water-=20;else s.steel-=15;log(s,(coolant?'냉각수 공급 완료. 발전 출력 정상화.':'현장 정비 완료. 물류와 생산이 복구되었습니다.'));s.incident=null;s.resolved++;if(s.stage===1){s.stage=2;s.arrival=s.time+20;}return true;}
function build(s,type,x,y){const d=defs[type];if(!d||!Number.isInteger(x)||!Number.isInteger(y)||x<1||x>9||y<1||y>9||s.buildings.some(b=>b.x===x&&b.y===y)||s.steel<d.cost||type==='tower'&&!s.tech)return false;s.steel-=d.cost;s.buildings.push({id:Math.max(...s.buildings.map(b=>b.id))+1,type,x,y,left:d.time});log(s,d.name+' 건설 시작');return true;}
function act(s,action){if(action==='resolve')return resolve(s);if(action==='admit'&&s.refugees&&count(s,'home')*10>=s.people+5){s.people+=5;s.refugees=false;log(s,'생존자 5명 합류. 탐사대를 편성할 수 있습니다.');return true;}if(action==='research'&&count(s,'lab')&&!s.tech&&!s.research&&s.steel>=40){s.steel-=40;s.research=90;log(s,'고효율 배터리 연구 시작');return true;}if(action==='explore'&&s.people>=15&&!s.expedition&&!s.discovered&&s.food>=20){s.food-=20;s.expedition=120;log(s,'ALPHA 출발. 북부 황무지에서 구세계 신호 추적 중.');return true;}if((action==='arca'||action==='sanctuary')&&s.core){s.core=false;s.diplomacy=true;s.relations.arca+=action==='arca'?25:-15;s.relations.sanctuary+=action==='arca'?-15:25;if(action==='arca'){s.tech=true;s.steel=Math.min(capacity(s),s.steel+40);}else s.food=Math.min(200,s.food+60);log(s,action==='arca'?'AI 코어를 아르카에 양도. 배터리 기술과 철강 40 확보. 성역회의 신뢰 하락.':'AI 코어를 봉인. 성역회의 식량 60 지원. 아르카 신뢰 하락.');return true;}return false;}
// v2: causal production network. All rates use simulated seconds.
defs.mine={name:'잔해 채굴장',cost:55,time:35};
const originalFresh=fresh,originalBuild=build,originalAct=act,originalResolve=resolve;
fresh=function(){return migrate(originalFresh());};
function migrate(s){s.version=2;s.ore??=20;s.raw??=0;s.trucks??=1;s.throttle??=false;s.maintenance??=false;s.cooling??=false;s.strain??=0;s.congestion??=0;s.shipment??=null;s.contract??={accepted:false,done:false,left:0};s.specialization??='independent';s.assignment??='repair';s.fatigue??=0;s.totalDelivered??=0;return s;}
function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
function routes(s){const stores=s.buildings.filter(b=>b.type==='store'&&!b.left);return s.buildings.filter(b=>['mine','factory'].includes(b.type)&&!b.left).map(b=>{const store=stores.slice().sort((a,c)=>distance(a,b)-distance(c,b))[0];return {from:b,to:store,distance:store?distance(b,store):Infinity};});}
function metrics(s){const rs=routes(s),mines=count(s,'mine'),factories=count(s,'factory'),avg=rs.length?rs.reduce((n,r)=>n+r.distance,0)/rs.length:0;const supply=power(s)>=demand(s)?1:.25;const labor=s.food<1?.5:1;const rate=mines*.55*labor;const travel=Number.isFinite(avg)?8+avg*3:Infinity;const hauling=s.trucks*10/travel*(s.assignment==='logistics'?1.5:1);const production=factories*.65*(s.throttle?.45:1)*(s.specialization==='arca'?1.25:1)*labor;const noisy=s.buildings.filter(b=>b.type==='home'&&!b.left).some(h=>s.buildings.some(b=>['power','factory'].includes(b.type)&&!b.left&&distance(h,b)<=2));return {rate,travel,hauling,production,supply,noisy,rs};}
power=function(s){return Math.max(0,count(s,'power')*60-(s.incident?.type==='coolant'?(s.incident.contained?30:40):0));};
build=function(s,type,x,y){if(x===5||y===5)return false;return originalBuild(s,type,x,y);};
resolve=function(s){if(!s.incident)return false;const discount=s.assignment==='repair'&&s.incident.type!=='coolant'?5:0;if(s.steel+discount<15&&s.incident.type!=='coolant')return false;s.steel+=discount;const ok=originalResolve(s);if(!ok)s.steel-=discount;if(ok){s.strain=0;s.congestion=0;s.fatigue=Math.min(100,s.fatigue+8);}return ok;};
tick=function(s,seconds){migrate(s);for(let i=0;i<Math.floor(seconds);i++){
 s.time++;const m=metrics(s);s.water=Math.min(150,s.water+.04);s.food=Math.max(0,Math.min(200,s.food+(s.specialization==='sanctuary'?.2:.13)-s.people*.008));
 s.fatigue=Math.max(0,Math.min(100,s.fatigue+(m.noisy?.012:-.015)));s.raw=Math.min(150,s.raw+m.rate);s.steel=Math.min(capacity(s),s.steel+.08);
 if(!s.shipment&&s.raw>=1&&m.rs.some(r=>r.from.type==='mine')&&Number.isFinite(m.travel)){const amount=Math.min(s.raw,s.trucks*10);s.raw-=amount;s.shipment={amount,left:Math.ceil(m.travel/(s.assignment==='logistics'?1.5:1)),total:Math.ceil(m.travel/(s.assignment==='logistics'?1.5:1))};}
 if(s.shipment&&--s.shipment.left<=0){const room=Math.max(0,capacity(s)-s.ore);const amount=Math.min(room,s.shipment.amount);s.ore+=amount;s.raw=Math.min(150,s.raw+s.shipment.amount-amount);s.totalDelivered+=amount;s.shipment=null;}
 const blocked=s.incident?.type==='fire';const use=blocked?0:Math.min(s.ore,m.production*m.supply,Math.max(0,(capacity(s)-s.steel)/.8));s.ore-=use;s.steel+=use*.8;
 for(const b of s.buildings)if(b.left>0&&--b.left===0)log(s,defs[b.type].name+' 건설 완료');
 if(s.stage===0&&s.time>=30){if(s.cooling){s.stage=2;s.arrival=s.time+20;log(s,'예비 냉각 계통이 출력 이상을 예방했습니다.');}else{s.stage=1;s.incident={type:'coolant',at:s.time};log(s,'냉각 압력 저하. 발전소의 경고등을 확인하세요.');}}
 if(s.stage===2&&s.time>=s.arrival){s.stage=3;s.refugees=true;log(s,'성역회의 구호 차량 도착. 생존자 5명 대기.');}
 s.congestion=s.raw>35?s.congestion+1:Math.max(0,s.congestion-2);s.strain=Math.max(0,s.strain+(m.production>0&&!s.throttle&&!s.maintenance?(1+s.fatigue/100): -2));
 if(!s.incident&&s.stage>=3){if(s.congestion>45){s.incident={type:'logistics',at:s.time};log(s,'채굴장 적재물이 누적됩니다. 운송 거리와 차량 용량을 확인하세요.');}else if(s.strain>240){s.incident={type:'fire',at:s.time};log(s,'연속 가동과 정비 부족으로 제련 구역에서 화재 발생.');}}
 if(s.incident&&!s.incident.contained&&s.time-s.incident.at>60&&s.policy==='safe'){s.incident.contained=true;log(s,'AI 응급 조치: 위험 구역 격리. 손실은 차단했지만 원인 개선이 필요합니다.');}
 if(s.incident&&!s.incident.contained&&s.time-s.incident.at>120&&s.time%30===0){s.steel=Math.max(0,s.steel-4);log(s,'미해결 사고로 철강 4 손실.');}
 if(s.incident?.type==='logistics'&&s.raw<10){s.incident=null;s.congestion=0;s.resolved++;log(s,'운송 적체 해소. 정상 물류 재개.');}
 if(s.maintenance&&s.time%30===0){if(s.steel>=1)s.steel--;else{s.maintenance=false;log(s,'철강 부족으로 예방 정비 중단.');}}
 if(s.research>0&&m.supply===1&&(s.research=Math.max(0,s.research-(s.assignment==='research'?2:1)))===0){s.tech=true;log(s,'배터리 연구 완료. 감시탑 해금.');}
 if(s.expedition>0&&--s.expedition===0){s.discovered=true;s.core=true;s.steel=Math.min(capacity(s),s.steel+60);log(s,'ALPHA 귀환: AI 코어 발견. 아르카와 성역회의의 상충하는 요청 수신.');}
 if(s.contract.accepted&&!s.contract.done&&s.contract.left>0&&--s.contract.left===0){s.contract.accepted=false;log(s,'납품 기한 초과. 계약을 다시 체결할 수 있습니다.');}
 }return s;};
act=function(s,a){migrate(s);if(a==='resolve')return resolve(s);if(a==='truck'&&s.steel>=35&&s.trucks<6){s.steel-=35;s.trucks++;log(s,'화물차 추가. 운송량 증가.');return true;}if(a==='throttle'){s.throttle=!s.throttle;log(s,s.throttle?'감산 가동: 생산 45%, 과열 완화.':'정상 생산 재개.');return true;}if(a==='maintenance'){s.maintenance=!s.maintenance;log(s,s.maintenance?'예방 정비: 30초당 철강 1, 과열 완화.':'예방 정비 중단.');return true;}if(a==='cooling'&&s.steel>=35&&!s.cooling){s.steel-=35;s.cooling=true;log(s,'예비 냉각 계통 설치.');if(s.incident?.type==='coolant'){s.incident=null;s.resolved++;if(s.stage===1){s.stage=2;s.arrival=s.time+20;}}return true;}if(a==='contract'&&!s.contract.accepted&&!s.contract.done){s.contract={accepted:true,done:false,left:360};log(s,'자유상단 계약: 6분 안에 철강 120 납품.');return true;}if(a==='deliver'&&s.contract.accepted&&!s.contract.done&&s.steel>=120){s.steel-=120;s.food=Math.min(200,s.food+80);s.trucks=Math.min(6,s.trucks+1);s.contract.done=true;log(s,'계약 완료. 식량 80과 화물차 1대 확보.');return true;}if(a.startsWith('assign:')){const role=a.split(':')[1];if(!['repair','logistics','research'].includes(role))return false;s.assignment=role;log(s,'김도윤의 지원 업무 변경: '+{repair:'현장 수리',logistics:'물류 지원',research:'연구 지원'}[role]);return true;}
 const result=originalAct(s,a);if(result&&a==='arca')s.specialization='arca';if(result&&a==='sanctuary')s.specialization='sanctuary';return result;};
const api={defs,fresh,tick,build,act,count,power,demand,capacity,migrate,metrics,routes};if(typeof module!=='undefined')module.exports=api;root.Watchtower=api;
})(globalThis);
