const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/load-typescript.cjs');
const root = path.resolve(__dirname, '../apps/extension/src');
const load = createLoader();
const guards = load(path.join(root, 'features/filling/fill.validation.ts'));
const { FillEngine } = load(path.join(root, 'content/fill-engine.ts'));
const id = (prefix, n) => `${prefix}_${String(n).padStart(32, '0')}`;
const item = () => ({ fieldId: id('fld', 1), target: { kind: 'text', value: 'Synthetic answer' }, overwriteExisting: false });
const context = () => ({ tabId: 7, scanId: id('scan', 2), documentId: id('doc', 3), origin: 'https://example.test' });
const grant = () => ({ ...context(), batchId: id('batch', 5), issuedAt: 1000, expiresAt: 11000, items: [{ ...item(), formId: id('frm', 4) }] });

test('strict fill contracts accept discriminated values and reject coercion, raw values, selectors, duplicate fields and extra permissions', () => {
  for (const kind of ['text', 'email', 'tel', 'number', 'date', 'textarea']) assert.equal(guards.isFillValue({ kind, value: '' }), true);
  for (const kind of ['select', 'radio']) assert.equal(guards.isFillValue({ kind, optionId: id('opt', 7) }), true);
  for (const checked of [true, false]) assert.equal(guards.isFillValue({ kind: 'checkbox', checked }), true);
  for (const value of [{kind:'checkbox',checked:'false'}, {kind:'checkbox',checked:0}, {kind:'select',value:'RAW'}, {kind:'radio',optionId:'#selector'}, {kind:'text',value:'x'.repeat(1025)}, {kind:'password',value:'x'}, {kind:'text',value:'x',selector:'input'}]) assert.equal(guards.isFillValue(value), false);
  assert.equal(guards.isInstructions([item(), item()]), false);
  assert.equal(guards.isInstructions(new Array(1)), false);
  assert.equal(guards.isFillValue({kind:['text'],value:'coerced kind'}), false);
  assert.equal(guards.isBatchResult({batchId:id('batch',5),status:['completed'],results:[{fieldId:id('fld',1),status:'filled'}]}),false);
  assert.equal(guards.isInstructions([{ ...item(), overwriteExisting: 'yes' }]), false);
  assert.equal(guards.isFillPanelRequest({ type:'PIKO_FILL_APPROVE',reviewId:id('review',8),items:[item()] }), false);
  assert.equal(guards.isFillPanelRequest({ type:'PIKO_FILL_REVIEW',tabId:7,scanId:id('scan',2),items:[item()],origin:'https://evil.test' }), false);
  assert.equal(guards.isAuthorization(grant()), true);
  assert.equal(guards.isAuthorization({...grant(),expiresAt:11001}), false);
  assert.equal(guards.isAuthorization({...grant(),origin:'https://example.test/path'}), false);
  assert.equal(guards.isAuthorization({...grant(),token:'model-created'}), false);
});

test('authorization schema and runtime guards agree on valid grants and structural attacks', () => {
  const Ajv = require('ajv');
  const schema = require('../contracts/approved-fill-batch.schema.json');
  const validate = new Ajv({ strict: true }).compile(schema);
  for (const value of [grant(), {...grant(),items:[{...grant().items[0],target:{kind:'checkbox',checked:false}}]}, {...grant(),items:[{...grant().items[0],target:{kind:'radio',optionId:id('opt',9)}}]}]) {
    assert.equal(validate(value), true); assert.equal(guards.isAuthorization(value), true);
  }
  for (const change of [{selector:'#name'}, {tabId:'7'}, {items:[{...grant().items[0],target:{kind:'checkbox',checked:'false'}}]}, {items:[]}]) {
    const value = {...grant(),...change}; assert.equal(validate(value), false); assert.equal(guards.isAuthorization(value), false);
  }
});

test('expired, future and reused engine authorizations fail before DOM access and consume once', async () => {
  const engine = new FillEngine({}, () => assert.fail('DOM access'), () => assert.fail('DOM access'), () => 20000);
  assert.equal((await engine.commit(grant())).results[0].reason, 'expired');
  assert.equal((await engine.commit(grant())).results[0].reason, 'replayed');
  const future = {...grant(),batchId:id('batch',9),issuedAt:21000,expiresAt:22000};
  assert.equal((await engine.commit(future)).results[0].reason, 'expired');
});

function coordinator() {
  let now = 1000;
  let url = 'https://example.test/form';
  let fresh = true;
  let ok = true;
  const calls = [];
  const field = {fieldId:id('fld',1),eligible:true,fieldType:'text',options:[]};
  const session = {scanId:id('scan',2),documentId:id('doc',3),chromeDocumentId:'actual-document',inventory:{origin:'https://example.test',forms:[{formId:id('frm',4),fields:[field]}]}};
  const sessions = new Map([[7,session]]);
  const chrome = {
    runtime:{id:'own',getURL:(file)=>`chrome-extension://own/${file}`},
    tabs:{ get:async (tabId) => { assert.equal(tabId,7); return {url}; }, sendMessage:async (tabId,message,options) => {
      calls.push({tabId,message,options});
      if(message.type==='PIKO_SCAN_CURRENT') return {current:fresh};
      if(message.type==='PIKO_FILL_PREFLIGHT') return {ok,results:message.items.map(({fieldId})=>ok?{fieldId,status:'not-verified'}:{fieldId,status:'blocked',reason:'existing-value'})};
      const auth=message.authorization;
      return {batchId:auth.batchId,status:'completed',results:auth.items.map(({fieldId})=>({fieldId,status:'filled'}))};
    }},
  };
  const {ApprovalCoordinator,fromPanel} = createLoader({chrome,setTimeout:()=>0})(path.join(root,'background/approval-coordinator.ts'));
  const instance = new ApprovalCoordinator(sessions,()=>now);
  const review = () => instance.handle({type:'PIKO_FILL_REVIEW',tabId:7,scanId:session.scanId,items:[item()]});
  return {instance,review,calls,sessions,session,field,fromPanel,setNow:(value)=>now=value,setUrl:(value)=>url=value,setFresh:(value)=>fresh=value,setOk:(value)=>ok=value};
}

test('only the exact extension side panel is trusted; content scripts and arbitrary extension pages cannot approve', () => {
  const {fromPanel} = coordinator();
  const sender = {id:'own',url:'chrome-extension://own/src/sidepanel/index.html'};
  assert.equal(fromPanel(sender),true);
  assert.equal(fromPanel({...sender,tab:{id:7}}),true); // Own extension page opened in a tab.
  for(const change of [{tab:{id:7},url:'https://example.test'}, {id:'other'}, {url:'https://example.test'}, {url:'chrome-extension://own/evil.html'}, {url:'malformed'}, {url:sender.url+'?spoof=1'}]) assert.equal(fromPanel({...sender,...change}),false);
});

test('review is mutation-free; approval delivers the exact reviewed values and derived context to its bound document once', async () => {
  const bg = coordinator();
  const reviewed = await bg.review();
  assert.equal(reviewed.ok,true); assert.equal(bg.calls.some(call=>call.message.type==='PIKO_FILL_COMMIT'),false);
  const applied = await bg.instance.handle({type:'PIKO_FILL_APPROVE',reviewId:reviewed.reviewId});
  assert.equal(applied.result.status,'completed');
  const delivery = bg.calls.find(call=>call.message.type==='PIKO_FILL_COMMIT');
  assert.equal(delivery.tabId,7); assert.deepEqual(delivery.options,{documentId:'actual-document'});
  assert.deepEqual(delivery.message.authorization.items,[{...item(),formId:id('frm',4)}]);
  assert.deepEqual(guards.contextOf(delivery.message.authorization),context());
  assert.equal(delivery.message.authorization.expiresAt-delivery.message.authorization.issuedAt,10000);
  assert.equal('value' in applied.result.results[0],false);
  assert.equal((await bg.instance.handle({type:'PIKO_FILL_APPROVE',reviewId:reviewed.reviewId})).ok,false);
  assert.equal(bg.calls.filter(call=>call.message.type==='PIKO_FILL_COMMIT').length,1);
});

for (const scenario of ['expiry','lost worker context','changed origin','stale document','explicit invalidation','proposal edit cancellation','new review']) {
  test(`approval fails closed after ${scenario}`, async () => {
    const bg=coordinator(); const reviewed=await bg.review();
    if(scenario==='expiry') bg.setNow(61000);
    if(scenario==='lost worker context') bg.sessions.clear();
    if(scenario==='changed origin') bg.setUrl('https://other.test');
    if(scenario==='stale document') bg.setFresh(false);
    if(scenario==='explicit invalidation') bg.instance.invalidate(7);
    if(scenario==='proposal edit cancellation') await bg.instance.handle({type:'PIKO_FILL_CANCEL',reviewId:reviewed.reviewId});
    if(scenario==='new review') await bg.review();
    const response=await bg.instance.handle({type:'PIKO_FILL_APPROVE',reviewId:reviewed.reviewId});
    assert.equal(response.ok,false); assert.equal(bg.calls.some(call=>call.message.type==='PIKO_FILL_COMMIT'),false);
  });
}

test('failed preflight and unknown fields/options never issue a review or a mutation', async () => {
  const bg=coordinator(); bg.setOk(false);
  const failed=await bg.review(); assert.equal(failed.ok,false); assert.equal(failed.preflight.results[0].reason,'existing-value');
  bg.field.fieldId=id('fld',99); assert.equal((await bg.review()).ok,false);
  bg.field.fieldId=id('fld',1); bg.field.fieldType='select';
  const invalid=await bg.instance.handle({type:'PIKO_FILL_REVIEW',tabId:7,scanId:id('scan',2),items:[{...item(),target:{kind:'select',optionId:id('opt',99)}}]});
  assert.equal(invalid.ok,false); assert.equal(bg.calls.some(call=>call.message.type==='PIKO_FILL_COMMIT'),false);
});
