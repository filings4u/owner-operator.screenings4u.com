(async()=>{'use strict';
const status=document.getElementById('handoff-status'),back=document.getElementById('handoff-return');
const code=new URLSearchParams(location.search).get('code');
history.replaceState(null,'','/auth-handoff.html');
const fail=message=>{status.textContent=message;back.hidden=false};
if(!code||!/^[a-f0-9]{64}$/i.test(code)){fail('This sign-in link is invalid. Return to the central portal selector.');return}
try{
 const C=window.PORTAL_CONFIG;
 const response=await fetch(C.workforceUrl+'/functions/v1/portal-session-handoff',{method:'POST',headers:{'Content-Type':'application/json','apikey':C.workforceKey},body:JSON.stringify({action:'redeem',code})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||!payload.token_hash)throw Error(payload.error||'The secure handoff could not be verified.');
 if(payload.target_surface!=='dot'||payload.target_portal!=='owner_operator')throw Error('The handoff is not intended for the Owner-Operator portal.');
 const client=window.S4UGetSupabaseClient();
 const {data,error}=await client.auth.verifyOtp({token_hash:payload.token_hash,type:'magiclink'});
 if(error||!data?.session)throw error||Error('Unable to establish your portal session.');
 status.textContent='Checking Owner-Operator access…';
 const r=await fetch(C.workforceUrl+'/functions/v1/owner-operator-session',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token,'apikey':C.workforceKey},body:JSON.stringify(window.S4UWithPortal({portal_code:'owner_operator',requested_portal_code:'owner_operator',page:'auth-handoff'}))});
 const result=await r.json().catch(()=>({}));
 if(!r.ok||result.error)throw Error(typeof result.error==='string'?result.error:'Owner-Operator access could not be verified.');
 const next=new URL(payload.next_path||'/dashboard.html',location.origin);
 if(next.origin!==location.origin||next.pathname!=='/dashboard.html')throw Error('The handoff destination is invalid.');
 location.replace(next.pathname);
}catch(e){fail(e?.message||'Secure sign-in could not be completed. Please return to the selector.')}
})();