const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../engine.js');
function boot(saved){
 const elements=new Map();let writes=0;const storage=new Map(saved?[['watchtower-save-v1',JSON.stringify(saved)]]:[]);
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',hidden:false,inert:false,value:'',classList:{toggle(){}},getContext(){return {};},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const context=vm.createContext({Watchtower:engine,document:{getElementById:element,addEventListener(){},body:{classList:{remove(){},add(){}}}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem(k,v){writes++;storage.set(k,v);}},performance:{now:()=>0},Date,console,confirm:()=>true,requestAnimationFrame(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
 return {context,element,writes:()=>writes,read:()=>JSON.parse(storage.get('watchtower-save-v1'))};
}
test('title boot does not overwrite existing save or advance simulation',()=>{const state=engine.fresh();state.steel=87;const app=boot({state,at:Date.now()});vm.runInContext('frame(15000)',app.context);assert.equal(app.writes(),0);assert.equal(app.read().state.steel,87);assert.equal(app.element('continueGame').disabled,false);});
test('new game starts once, menu suspends writes, continue restores progress',()=>{const app=boot();assert.equal(app.element('continueGame').disabled,true);app.element('newGame').onclick();assert.equal(app.element('titleScreen').hidden,true);assert.equal(app.element('gameScreen').inert,false);assert.equal(app.read().state.version,2);app.element('menu').onclick();const count=app.writes();vm.runInContext('frame(30000);save()',app.context);assert.equal(app.writes(),count);app.element('continueGame').onclick();assert.equal(app.element('titleScreen').hidden,true);});
test('v1 saves migrate only when continuing',()=>{const state=engine.fresh();state.version=1;delete state.trucks;const app=boot({state,at:Date.now()});assert.equal(app.writes(),0);app.element('continueGame').onclick();assert.equal(app.read().state.trucks,1);assert.equal(app.read().state.version,2);});
