(async()=>{"use strict";
const $=id=>document.getElementById(id),esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\x27/g,"&#39;");
const key="sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC",endpoint="https://elpbnytpciqnbexiaebp.supabase.co/functions/v1/workforce-ctpa-private-chat";
let sb,rows=[],selected=null,me=null,channel=null;
const type=(window.PORTAL_CONFIG?.kind==="owner_operator"?"owner_operator":"employer");
const say=x=>{$("chatStatus").textContent=x};
try{
 sb=window.S4UGetSupabaseClient?.();if(!sb?.auth)throw Error("Portal session unavailable");
 const session=(await sb.auth.getSession()).data?.session;if(!session)throw Error("Sign in through your Workforce portal to view messages.");
 const api=async(action,params={})=>{
  const token=(await sb.auth.getSession()).data?.session?.access_token;if(!token)throw Error("Session expired");
  const res=await fetch(endpoint,{method:"POST",cache:"no-store",headers:{"Authorization":"Bearer "+token,"apikey":key,"Content-Type":"application/json"},body:JSON.stringify({action,portal_type:type,...params})});
  const data=await res.json().catch(()=>({}));if(!res.ok||data.error)throw Error(data.error||"Private chat unavailable");return data;
 };
 async function list(){
  const data=await api("list");rows=data.threads||[];me=data.user_id;
  $("chatThreads").innerHTML=rows.length?rows.map(r=>'<button class="chat-thread '+(selected===r.id?"selected":"")+'" data-thread="'+esc(r.id)+'"><strong>'+esc(r.name||"C/TPA Conversation")+'</strong><span>'+esc(r.subject||"Conversation")+' · '+esc(r.context.toUpperCase())+'</span><span>'+esc(r.last_message?.body?.slice(0,90)||"No messages yet")+'</span></button>').join(""):'<p style="padding:19px;color:#647a90">No private conversations are available yet. Your C/TPA can initiate one from its Messages page.</p>';
  $("chatThreads").querySelectorAll("[data-thread]").forEach(b=>b.onclick=()=>void open(b.dataset.thread));
 }
 async function history(id){
  if(id!==selected)return;const result=await api("history",{thread_id:id}),box=$("chatMessages");if(!box||id!==selected)return;
  const near=box.scrollHeight-box.scrollTop-box.clientHeight<120;
  box.innerHTML=(result.messages||[]).map(m=>'<div class="bubble '+(m.sender_user_id===me?"mine":"theirs")+'"><div>'+esc(m.body)+'</div><small>'+esc(new Date(m.created_at).toLocaleString())+'</small></div>').join("")||'<p>Start chatting with your C/TPA.</p>';
  if(near)box.scrollTop=box.scrollHeight;
 }
 async function open(id){
  selected=id;
  if(channel){sb.removeChannel(channel);channel=null}
  const thread=rows.find(r=>r.id===id);if(!thread)return;
  $("chatMain").innerHTML='<div class="chat-room-head">'+esc(thread.subject)+' · '+esc(thread.context.toUpperCase())+'</div><div class="chat-messages" id="chatMessages" role="log" aria-label="Private messages"></div><form class="chat-compose" id="chatForm"><textarea name="message" maxlength="4000" placeholder="Reply privately…" required></textarea><button type="submit" id="chatSend">Send</button></form>';
  $("chatForm").onsubmit=async e=>{e.preventDefault();const input=e.currentTarget.elements.message,value=input.value.trim();if(!value)return;const b=$("chatSend");b.disabled=true;try{await api("send",{thread_id:id,message:value});input.value="";await history(id);await list()}catch(err){say(err.message)}finally{b.disabled=false}};
  await history(id);await api("read",{thread_id:id}).catch(()=>{});
  channel=sb.channel("external-private-chat-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"workforce_ctpa_private_messages",filter:"thread_id=eq."+id},()=>{void history(id);void list()}).subscribe();
 }
 await list();say("");
}catch(err){say(err.message||"Private messages are unavailable");console.error("[Private CTPA Chat]",err)}
})();