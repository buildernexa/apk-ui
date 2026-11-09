async function build(){
 if(busy)return;
 if(!S.t){toast("Hubungkan GitHub dulu");drawer(true);return}
 if(!val()){toast("Perbaiki isian yang ditandai");return}
 let c;try{c=cfg()}catch(e){$("#bm").textContent=e.message;return}
 const pf=preflight(c);
 if(pf.E.length){$("#bm").textContent=pf.E[0];return}
 if(pf.W.length)toast(pf.W[0]);
 if(await queue()){toast("Ada build lain yang sedang berjalan");return}
 if(TPLOK!==true){
  $("#go").disabled=true;await checkTpl();
  if(TPLOK===false&&!await syncTpl(true)){$("#go").disabled=false;return}
  $("#go").disabled=false;
 }
 if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();
 busy=true;run=null;PL={};T={t0:Date.now(),steps:[],f:"",as:true,lf:0,pct:0,c,zip:c.sr==="zip"};
 const tm=$("#term");
 $("#nl").innerHTML="";$("#gl").innerHTML="";$("#lgd").hidden=true;$("#lgd").open=false;$("#hn").innerHTML="";$("#rs").innerHTML="";$("#mu").hidden=true;$("#sq").value="";
 $("#pct").dataset.v=0;$("#pct").textContent=0;$("#pf").style.width="0%";
 document.querySelectorAll("[data-f]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.f===""));$("#as").setAttribute("aria-pressed","true");
 $("#go").disabled=true;$("#bm").textContent="";$("#logo").classList.add("spin");
 tm.classList.remove("land");void tm.offsetWidth;tm.classList.add("land");
 tmr=setInterval(termDraw,250);termDraw();plRender();tm.scrollIntoView({behavior:"smooth",block:"start"});
 const e={id:Date.now(),name:c.name,vn:c.vn,vc:c.vc,st:"running",t:Date.now(),cfg:c};H.unshift(e);sv("h",H);stats();
 const getJob=async()=>{const j=(await api(`/repos/${S.r}/actions/runs/${run.id}/jobs`)).jobs[0];if(j){T.steps=j.steps;j.steps.forEach(x=>PL[x.name]=x.conclusion||x.status)}return j};
 const getLog=async j=>{T.log=await(await api(`/repos/${S.r}/actions/jobs/${j.id}/logs`,{raw:true})).text();logApply();const m=[...T.log.slice(-6000).matchAll(/> Task :([\w:.-]+)/g)];T.task=m.length?m[m.length-1][1].replace(/^app:/,""):""};
 try{
  if(c.sr==="zip")c.zip=await upZip(PF);
  const prev=(await api(`/repos/${S.r}/actions/runs?per_page=1`)).workflow_runs[0]?.id||0;
  const rp=await api("/repos/"+S.r);
  await api(`/repos/${S.r}/actions/workflows/build.yml/dispatches`,{method:"POST",body:JSON.stringify({ref:rp.default_branch,inputs:{config:JSON.stringify(c)}})});
  T.dsp=true;termDraw();
  for(let i=0;i<20&&!run;i++){await sleep(3000);run=(await api(`/repos/${S.r}/actions/runs?event=workflow_dispatch&per_page=5`)).workflow_runs.find(r=>r.id>prev)||null}
  if(!run)throw Error("Run tidak ditemukan. Pastikan Actions aktif di repo build.");
  let r,j;
  for(let k=0;;k++){
   j=await getJob();termDraw();plRender();
   if(j&&!T.nolive)try{await getLog(j)}catch{if(++T.lf>2){T.nolive=true;line("nolive","Log langsung belum tersedia dari GitHub. Log lengkap muncul setelah selesai.","nt")}}
   r=await api(`/repos/${S.r}/actions/runs/${run.id}`);
   if(r.status==="completed")break;
   await sleep(2500+Math.min(k,10)*250);
  }
  j=await getJob();try{await getLog(j)}catch{}
  T.fin=true;T.ok=r.conclusion==="success";T.cx=r.conclusion==="cancelled";
  e.st=r.conclusion;e.dur=Math.round((Date.parse(r.updated_at)-Date.parse(r.run_started_at))/1000);T.dur=e.dur;
  e.sd={};KEY.forEach(k=>{const x=by(k);if(x&&x.conclusion==="success"&&x.started_at&&x.completed_at)e.sd[k]=Math.max(1,Math.round((Date.parse(x.completed_at)-Date.parse(x.started_at))/1000))});
  plRender();termDraw();logDraw();
  if(T.ok){
   const rel=(await api(`/repos/${S.r}/releases?per_page=5`))[0];
   if(rel){
    e.rel=rel.html_url;e.relid=rel.id;e.tag=rel.tag_name;e.assets=rel.assets.map(a=>({n:a.name,u:a.browser_download_url,id:a.id,s:a.size}));
    const m=(rel.body||"").match(/<!--nexa:(.*?)-->/s);try{e.sum=m?JSON.parse(m[1]):null}catch{}
   }else{e.rel=r.html_url;toast("Build berhasil, tetapi release tidak ditemukan. Buka run di GitHub.")}
   sv("h",H);summ(e);
  }else if(!T.cx){
   const d=diagnose(T.log),fs=T.steps.find(x=>sc(x)==="er"),fk=fs&&key(fs.name);
   e.hint=d?(d.hint||d.primary):"Buka run di GitHub untuk detail.";e.err=d?d.primary:"";
   $("#hn").innerHTML=failCard(d,fk?NR[fk][0]:"",r.html_url);
  }
 }catch(err){
  let m=err.message;
  if(/^(404|422)/.test(m))m="Workflow belum siap di repo build ("+m+"). Perbarui repo build lewat banner di atas, lalu coba lagi.";
  e.st="failure";e.hint=m;T.fin=true;T.ok=false;T.dur=Math.round((Date.now()-T.t0)/1000);$("#bm").textContent=m;termDraw();
  $("#hn").innerHTML=failCard({primary:m,ctx:[],hint:""},"",run?run.html_url:"");
 }
 clearInterval(tmr);$("#logo").classList.remove("spin");busy=false;run=null;$("#go").disabled=false;sv("h",H);stats();plRender();
 toast(`${e.name}: ${lab(e.st)}`);notify(`${e.name} ${lab(e.st).toLowerCase()}`);queue();
}
async function cancel(){
 if(!run)return toast("Tidak ada build yang berjalan");
 try{await api(`/repos/${S.r}/actions/runs/${run.id}/cancel`,{method:"POST"});toast("Pembatalan dikirim")}catch(e){toast(e.message)}
}
function val(){
 const p=$("#pkg").value.trim(),v=$("#vc").value,pb=!!p&&!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(p),vb=v!==""&&!(+v>0&&Number.isInteger(+v));
 $("#pe").textContent=pb?"Format: com.contoh.app (huruf kecil, minimal dua bagian)":"";$("#ve").textContent=vb?"Harus bilangan bulat positif":"";
 $("#pkg").setAttribute("aria-invalid",pb);$("#vc").setAttribute("aria-invalid",vb);auUI();return !pb&&!vb;
}
const TPL={"WebView":{ori:"unspecified",mf:1,pm:["internet"]},"Link-in-bio":{ori:"portrait",mf:1,pm:["internet"],col:"#ffd600"},"Portfolio":{ori:"unspecified",mf:1,pm:["internet"],col:"#000000"},"PWA wrapper":{ori:"unspecified",mf:1,pm:["internet","notifications"]},"Kiosk":{ori:"landscape",ki:1,pm:["internet"]}};
const tplInit=()=>$("#tpl").innerHTML=Object.keys(TPL).map(k=>`<button class="chipb" onclick="tpl('${k}')">${k}</button>`).join("");
function tpl(k){
 const t=TPL[k];$("#ori").value=t.ori;$("#mf").checked=!!t.mf;$("#ki").checked=!!t.ki;if(t.col)$("#col").value=t.col;
 document.querySelectorAll(".pm").forEach(x=>x.checked=t.pm.includes(x.value));
 $("#v-build details").open=true;$("#url").focus();toast("Template "+k+" dimuat. Isi URL situsmu.");
}
async function upIcon(f){
 const im=t=>$("#im").textContent=t;
 if(!S.t){im("Hubungkan GitHub dulu.");return}
 try{
  im("1/3 Membaca ikon...");
  const b=await new Promise((ok,no)=>{const x=new FileReader();x.onload=()=>ok(x.result.split(",")[1]);x.onerror=no;x.readAsDataURL(f)});
  im("2/3 Memeriksa repo...");let sha;try{sha=(await api(`/repos/${S.r}/contents/assets/icon.png`)).sha}catch{}
  im("3/3 Mengunggah ke repo...");
  await api(`/repos/${S.r}/contents/assets/icon.png`,{method:"PUT",body:JSON.stringify({message:"Update ikon",content:b,sha})});
  S.icon=true;sv("s",S);im("Ikon terpasang. Dipakai di build berikutnya.");toast("Ikon diunggah");
 }catch(e){im(e.message)}
}

const KW=new Set("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import in instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null as fun is object typealias val var when".split(" "));
function preflight(c){
 const E=[],W=[],bad=c.pkg.split(".").find(x=>KW.has(x));
 if(bad)W.push(`Segmen package "${bad}" adalah kata kunci. Otomatis diubah menjadi "${bad}_".`);
 if(c.vc>2100000000)E.push("versionCode terlalu besar (maksimal 2.100.000.000).");
 if(c.min<26||c.min>34)W.push("minSdk disesuaikan ke rentang 26 sampai 34.");
 if(c.url&&!/^https?:\/\//.test(c.url))E.push("URL WebView harus diawali http:// atau https://.");
 if(c.flv&&c.flv.split(",").some(x=>x.trim()&&!/^[a-z][a-z0-9]*$/i.test(x.trim())))W.push("Nama flavor hanya boleh huruf dan angka. Karakter lain dibuang.");
 (c.bc||"").split("\n").forEach(l=>{if(l.trim()&&!/^[A-Za-z_][A-Za-z0-9_]*=/.test(l.trim()))W.push(`BuildConfig "${l.trim().slice(0,24)}" bukan format KEY=nilai dan dilewati.`)});
 if(!navigator.onLine)E.push("Perangkat sedang offline.");
 return{E,W};
}
