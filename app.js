const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let S=ld("s",{}),H=ld("h",[]),PR=ld("p",{}),P={},run=null,busy=false,stp="",lg="";
const LAB={success:"Berhasil",failure:"Gagal",running:"Berjalan",cancelled:"Dibatalkan"},lab=s=>LAB[s]||"Terputus";
const IC={home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',gauge:'<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',layers:'<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',run:'<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',check:'<path d="M4 12l5 5 11-11"/>',plus:'<path d="M12 5v14M5 12h14"/>',redo:'<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>',hist:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',github:'<path d="M9 19c-4 1-4-2-6-2m12 4v-3.2a2.8 2.8 0 0 0-.8-2.2c2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.5 6a4.3 4.3 0 0 0-.1-3S17.4 2.7 15 4a13 13 0 0 0-6 0C6.6 2.7 5.6 3 5.6 3A4.3 4.3 0 0 0 5.5 6a4.7 4.7 0 0 0-1.2 3.3c0 4.7 2.8 5.7 5.5 6A2.8 2.8 0 0 0 9 17.5V21"/>'};
const ic=n=>`<svg viewBox="0 0 24 24">${IC[n]}</svg>`;
let tab=0,tt,ANIM=true,PL={};
function toast(m){const t=$("#ts");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),2600)}

async function api(p,o={}){
 const h={Authorization:"Bearer "+S.t,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(o.body)h["Content-Type"]="application/json";
 const r=await fetch("https://api.github.com"+p,{...o,headers:h});
 if(r.status===401)throw Error("Token salah atau sudah kedaluwarsa.");
 if(r.status===403&&r.headers.get("x-ratelimit-remaining")==="0")throw Error("Batas API GitHub habis. Coba lagi setelah reset.");
 if(!r.ok){let m="";try{m=(await r.json()).message}catch{}throw Error(r.status+" "+m)}
 return o.raw?r:r.status===204?null:r.json();
}
function scopes(r){
 const s=r.headers.get("x-oauth-scopes");if(s===null)return;
 const have=s.split(",").map(x=>x.trim()),miss=["repo","workflow"].filter(x=>!have.includes(x));
 if(miss.length)throw Error("Scope kurang: "+miss.join(", ")+". Buat ulang token dengan scope tersebut.");
}

/* drawer */
function drawer(o){document.body.classList.toggle("open",o);$("#dr").setAttribute("aria-hidden",!o);if(o)ui()}
function ui(){
 $("#ds").innerHTML=S.t?`<span class="tag success">Terhubung</span><p style="margin:8px 0 0">${esc(S.u)}<br>${esc(S.r)}</p>`:`<span class="tag">Belum terhubung</span>`;
 if(S.tp&&!$("#tu").dataset.s){const q=S.tp.split("/");$("#tu").value=q[0];$("#tr").value=q[1]||"";$("#tu").dataset.s=1}
 $("#tk").placeholder=S.t?"Tersimpan di perangkat":"ghp_...";
 $("#lo").disabled=$("#tt").disabled=!S.t;
}
async function connect(){
 const t=$("#tk").value.trim()||S.t,tp=$("#tu").value.trim()+"/"+$("#tr").value.trim(),m=$("#lm"),b=$("#lb");
 if(!t||!/^[\w.-]+\/[\w.-]+$/.test(tp)){m.textContent="Isi token dan repo template (username/repo).";return}
 b.disabled=true;const old=S;S={...S,t,tp};
 try{
  m.textContent="1/3 Memeriksa token...";
  const r=await api("/user",{raw:true});scopes(r);const u=await r.json();
  S.u=u.login;S.r=u.login+"/apk-builder";
  try{await api("/repos/"+S.r)}catch(e){
   if(!/^404/.test(e.message))throw e;
   m.textContent="2/3 Membuat repo dari template...";
   try{await api(`/repos/${tp}/generate`,{method:"POST",body:JSON.stringify({owner:u.login,name:"apk-builder",private:false})})}
   catch(e2){throw Error(/^404/.test(e2.message)?"Repo template tidak ditemukan atau belum ditandai Template.":e2.message)}
   m.textContent="3/3 Menunggu workflow siap...";
   for(let i=0;i<15;i++){await sleep(2000);try{await api(`/repos/${S.r}/contents/.github/workflows/build.yml`);break}catch{}}
  }
  sv("s",S);$("#tk").value="";m.textContent="";toast("Terhubung ke GitHub");drawer(false);loadProfile();checkTpl();
 }catch(e){S=old;m.textContent=e.message}
 b.disabled=false;ui();
}
async function test(){
 const m=$("#lm");m.textContent="Menguji koneksi...";
 try{const r=await api("/user",{raw:true});scopes(r);await api("/repos/"+S.r);m.textContent="";toast("Koneksi baik")}
 catch(e){m.textContent=e.message}
}
function disc(){S={vc:S.vc};localStorage.setItem("s",JSON.stringify(S));P={};ui();home();toast("Koneksi diputus")}

/* home */
async function loadProfile(){
 if(!S.t)return home();
 P.loading=!P.name;home();
 const [u,r,l]=await Promise.allSettled([api("/user"),api("/repos/"+S.r),api("/rate_limit")]);
 P.ok=u.status==="fulfilled"||l.status==="fulfilled";
 if(u.status==="fulfilled"){const v=u.value;P.name=v.name||v.login;P.email=v.email||v.login;P.av=v.avatar_url;P.plan=v.plan?.name||"free"}else toast(u.reason.message);
 if(r.status==="fulfilled")P.priv=r.value.private;
 if(l.status==="fulfilled")P.rate=l.value.resources.core;
 if(!P.name)P.name=S.u;P.loading=false;home();
}
function avatar(){P.av=(P.av||"").split("&t=")[0];loadProfile().then(()=>{P.av+="&t="+Date.now();home();toast("Avatar diperbarui")})}
/* === WIDGET BERANDA ===
   Tiap widget = fungsi yang mengembalikan satu elemen HTML.
   Urutan di WIDGETS = urutan tampil. Untuk ide sendiri: buat fungsi baru, lalu tambahkan ke array. */
const WIDGETS=[wHero,wFrame,wNext,wActions,wPipeline,wActivity,wRecent];
function wHero(){return `<section class="home-hero">
 <div class="hero-copy"><span class="eyebrow"><i></i> WORKSPACE OVERVIEW</span><h2>Build aplikasi Android.<br><em>Lebih terarah.</em></h2><p>Kelola proyek, jalankan build, dan pantau hasilnya dari satu tempat.</p>
 <button class="hero-cta" onclick="${S.t?"go(1)":"drawer(true)"}"><span>${ic(S.t?"plus":"github")}</span> ${S.t?"Mulai build baru":"Hubungkan GitHub"} <b>↗</b></button></div>
 <div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-a"></div><div class="art-orbit orbit-b"></div><div class="art-cube"><i></i><b></b><em></em></div><span class="art-spark spark-a">✳</span><span class="art-spark spark-b">✦</span><span class="art-label">APK<br>STUDIO</span></div>
 </section>`}
function home(){
 const el=$("#v-home");
 if(!S.t){el.className="";el.innerHTML=`${wHero()}<div class="card connect-card"><div class="connect-mark">${ic("github")}</div><div class="connect-copy"><span class="section-kicker">LANGKAH PERTAMA</span><h2>Hubungkan workspace</h2><p style="margin:5px 0 0">Sambungkan GitHub untuk menyimpan konfigurasi proyek, menjalankan workflow, dan menerima hasil build.</p></div><button class="btn" onclick="drawer(true)">Atur koneksi GitHub</button></div>`;return}
 if(P.loading||!P.name){el.className="";el.innerHTML=`<div class="card sk" style="height:150px"></div><div class="row"><div class="card sk" style="height:110px"></div><div class="card sk" style="height:110px"></div></div>`;return}
 el.className=ANIM?"pop":"";ANIM=false;
 el.innerHTML=WIDGETS.map(f=>f()).join("");
 stats();plRender();tick();
}
function wProfile(){return `<div class="card pf"><div class="top"><div class="av"><img src="${esc(P.av||"https://github.com/identicons/"+encodeURIComponent(S.u)+".png")}" alt="Avatar akun"><button class="cam" onclick="avatar()" aria-label="Perbarui avatar">${ic("cam")}</button></div>
 <div class="who"><span class="note">Halo,</span><b class="ell">${esc(P.name||S.u)}</b><span class="note ell">${esc(P.email||S.u)}</span></div>
 <div class="clk"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#fff"/><line id="hh" x1="24" y1="24" x2="24" y2="14" stroke-width="3"/><line id="hm" x1="24" y1="24" x2="24" y2="8"/></svg><span class="tag" id="tm"></span><span class="tag" id="dateChip"></span></div></div>
 <div class="chips"><span class="tag">${esc((P.plan||"free").replace(/^./,c=>c.toUpperCase()))}</span><span class="tag">${P.priv?"Private":"Public"}</span></div></div>`}
function wInfo(){
 const rt=P.rate,pc=rt?Math.round(rt.remaining/rt.limit*100):0,on=navigator.onLine&&P.ok;
 return `<div class="row2"><div class="card it"><div class="ib">${ic("gauge")}</div><div class="tt"><b>Kuota API</b><span class="note">${rt?rt.remaining+" / "+rt.limit:"-"}</span><div class="bar"><i style="width:${pc}%"></i></div></div></div>
 <div class="card it"><div class="ib">${ic("wifi")}</div><div class="tt"><b>${on?"Online":"Offline"}</b><span class="note ell">${esc(S.r)}</span></div></div></div>`}
function wFrame(){return `<div class="fr"><div class="section-kicker">AKUN & PERFORMA</div>${wProfile()}${wInfo()}${wStats()}</div>`}
function wStats(){return `<div class="g3"><div class="card"><div class="ib">${ic("layers")}</div><b id="s1"></b><span class="note">Total</span><span class="tag">Semua</span></div>
 <div class="card"><div class="ib">${ic("run")}</div><b id="s2"></b><span class="note">Berjalan</span><span class="tag success" id="lv">Live</span></div>
 <div class="card"><div class="ib">${ic("check")}</div><b id="s3"></b><span class="note">Berhasil</span><span class="tag" id="b3"></span></div></div>`}
function wPipeline(){return `<div class="card pipeline-card"><div class="wh"><div><span class="section-kicker">BUILD MONITOR</span><h2>Pipeline</h2></div><span class="tag" id="pls"></span></div><div class="pl" id="pl"></div></div>`}
function wActions(){return `<div class="section-heading"><div><span class="section-kicker">SHORTCUT</span><h2>Akses cepat</h2></div><span class="section-meta">PILIH AKSI</span></div><div class="g2"><button class="qa" onclick="go(1)"><span class="ib">${ic("plus")}</span>Build baru</button>
 <button class="qa" onclick="again(0);toast('Konfigurasi dimuat')" ${H.length?"":"disabled"}><span class="ib">${ic("redo")}</span>Ulangi terakhir</button>
 <button class="qa" onclick="go(2)"><span class="ib">${ic("hist")}</span>Riwayat</button>
 <a class="qa" href="https://github.com/${esc(S.r)}" target="_blank" rel="noopener"><span class="ib">${ic("ext")}</span>Buka repo</a></div>`}
function wActivity(){
 const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);return d});
 const n=days.map(d=>H.filter(h=>new Date(h.t).toDateString()===d.toDateString()).length),mx=Math.max(1,...n);
 return `<div class="card activity-card"><div class="wh"><div><span class="section-kicker">RINGKASAN</span><h2>Aktivitas</h2></div><span class="tag">7 hari</span></div><div class="ch">${days.map((d,i)=>`<div class="cb"><b>${n[i]||""}</b><i style="height:${Math.max(4,Math.round(n[i]/mx*64))}px${i===6?";background:var(--ac)":""}"></i><span>${d.toLocaleDateString("id-ID",{weekday:"short"})}</span></div>`).join("")}</div></div>`}
function wRecent(){return `<div class="card recent-card"><div class="wh"><div><span class="section-kicker">RIWAYAT TERBARU</span><h2>Build terakhir</h2></div></div>${H.length?H.slice(0,3).map(h=>`<div class="li"><span class="ell">${esc(h.name)} ${esc(h.vn)}</span><span class="tag ${h.st}">${lab(h.st)}</span></div>`).join(""):"<p style='margin:0'>Belum ada build. Mulai dari Build baru.</p>"}</div>`}
const PS=[["Setup Java","Java"],["Setup Gradle","Gradle"],["Generate project","Gen"],["Build","Build"],["Collect output","Hasil"],["Release","Rilis"]];
function plRender(){
 const e=$("#pl");if(!e)return;
 e.innerHTML=PS.map(([n,l])=>{const v=PL[n],c=v==="success"?"ok":v==="in_progress"?"on":v==="failure"?"er":"";return `<div class="ps ${c}"><i>${c==="ok"?"OK":c==="er"?"!":""}</i><span>${l}</span></div>`}).join("");
 $("#pls").textContent=busy?"Berjalan":Object.values(PL).includes("failure")?"Gagal":Object.keys(PL).length?"Selesai":"Siap";
}
function stats(){
 const t=H.length,ok=H.filter(h=>h.st==="success").length,s=(i,v)=>{const e=$("#"+i);if(e)/^\d+$/.test(v)?cu(e,+v):e.textContent=v};
 s("s1",t);s("s2",busy?1:0);s("s3",ok);s("b3",(t?Math.round(ok/t*100):0)+"%");const lv=$("#lv");if(lv)lv.classList.toggle("live",busy);
}
function tick(){
 const d=new Date(),h=$("#hh");if(!h)return;
 h.setAttribute("transform",`rotate(${(d.getHours()%12+d.getMinutes()/60)*30} 24 24)`);
 $("#hm").setAttribute("transform",`rotate(${d.getMinutes()*6} 24 24)`);
 $("#tm").textContent=d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"});const dt=$("#dateChip");if(dt)dt.textContent=d.toLocaleDateString("id-ID",{day:"numeric",month:"short"});
}

/* nav */
function go(n){
 tab=n;["#v-home","#v-build","#v-hist"].forEach((s,i)=>{const e=$(s);e.hidden=i!==n;if(i===n){e.classList.remove("in");void e.offsetWidth;e.classList.add("in")}});
 document.querySelectorAll("nav button").forEach(b=>{const on=+b.dataset.t===n;on?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current")});
 if(n===0){ANIM=true;home()}if(n===1){queue();checkTpl()}if(n===2)hist();scrollTo(0,0);
}

/* history */
function hist(){
 const q=$("#hq").value.trim().toLowerCase(),f=$("#hf").value;
 const rows=H.map((h,i)=>({h,i})).filter(({h})=>(!f||h.st===f)&&(!q||h.name.toLowerCase().includes(q))).sort((a,b)=>!!b.h.pin-!!a.h.pin);
 $("#hl").innerHTML=cmpHtml()+(rows.length?rows.map(({h,i})=>`<div class="card"><b style="font-size:16px">${esc(h.name)}</b> <span class="tag ${h.st}">${lab(h.st)}</span>${h.pin?' <span class="tag">Disematkan</span>':""}
 <p style="margin:6px 0 10px">v${esc(h.vn)} (${h.vc}) &middot; ${new Date(h.t).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"})}${h.dur!=null?" &middot; "+h.dur+" dtk":""}</p>
 <div class="stack" style="margin:0">${(h.assets||[]).map((a,j)=>`<button class="btn" onclick="dl(${i},${j})">Unduh ${esc(a.n)}</button>`).join("")}${h.sum?`<button class="btn w" onclick="share(${i})">Bagikan</button><div>${kv(h)}</div>`:h.hint?`<p style="margin:0">${esc(h.hint)}</p>`:""}
 <div class="row" style="margin:0"><button class="btn w" onclick="again(${i})">Ulangi</button><button class="btn w" onclick="pin(${i})">${h.pin?"Lepas":"Sematkan"}</button><button class="btn w" onclick="del(${i})">Hapus</button></div><div class="row" style="margin:0"><button class="btn w" onclick="cmpT(${i})">${CMP.includes(i)?"Batal banding":"Bandingkan"}</button></div></div></div>`).join(""):`<p>${H.length?"Tidak ada hasil.":"Belum ada build. Mulai dari tab Build."}</p>`);
}
async function del(i){
 if(!confirm("Hapus build ini? Release dan filenya di GitHub ikut dihapus."))return;
 const h=H[i];
 if(h.relid&&S.t)try{await api(`/repos/${S.r}/releases/${h.relid}`,{method:"DELETE"});if(h.tag)await api(`/repos/${S.r}/git/refs/tags/${h.tag}`,{method:"DELETE"})}catch(e){toast("Release tidak terhapus: "+e.message)}
 H.splice(i,1);sv("h",H);hist();toast("Riwayat dihapus");
}
function fill(c){
 const g=x=>$("#"+x);
 g("name").value=c.name;g("pkg").value=c.pkg;g("vn").value=c.vn;g("vc").value=c.vc;g("min").value=c.min;g("fmt").value=c.fmt;g("var").value=c.var;
 g("mf").checked=c.minify;g("abi").checked=c.abi;g("ori").value=c.orient;g("url").value=c.url;g("col").value=c.color;g("fb").checked=c.fb;g("out").value=c.out;g("ar").value=c.args;g("nt").value=c.notes||"";g("fl").value=c.flv||"";g("bc").value=c.bc||"";g("ki").checked=!!c.kiosk;g("fs").checked=!!c.fs;g("kp").checked=!!c.kp;g("zm").checked=!!c.zm;g("ex").checked=!!c.ex;g("of").checked=!!c.of;g("pt").checked=!!c.pt;g("scb").checked=!!c.sc;if(c.sc)g("sc").value=c.sc;g("ua").value=c.ua||"";g("su").value=c.src||"";g("rf").value=c.ref||"";g("sb").value=c.sub||"";g("ov").checked=c.ov!==false;setSrc(c.sr==="zip"?"zip":c.sr==="repo"||c.sr==="ziplink"||c.site?"url":"scratch");if(c.site)$("#su").value=c.url;auUI();
 document.querySelectorAll(".pm").forEach(x=>x.checked=c.perms.includes(x.value));
}
function again(i){fill(H[i].cfg);go(1)}

/* build */
function cfg(dry){
 const g=i=>$("#"+i),n=g("name").value.trim();
 if(!n)throw Error("Nama aplikasi wajib diisi.");
 if(g("sr").value==="url"&&!g("su").value.trim())throw Error("Isi URL target dulu.");
 if(!g("sr").value)throw Error("Pilih sumber proyek dulu.");
 if(g("sr").value==="zip"&&!PF)throw Error("Pilih file ZIP atau HTML dulu.");
 const slug=n.toLowerCase().replace(/[^a-z0-9]/g,"");
 const pkg=g("pkg").value.trim()||"com.app."+(/^[a-z]/.test(slug)?slug:"a"+slug);
 if(!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg))throw Error("Package name tidak valid. Contoh: com.contoh.app");
 let vc=+g("vc").value||1;
 if(!dry){if(g("ai").checked)vc=Math.max(vc,(S.vc||0)+1);g("vc").value=vc;S.vc=vc;sv("s",S)}
 return{name:n,pkg,vn:g("vn").value.trim()||"1.0.0",vc,min:+g("min").value||26,fmt:g("fmt").value,var:g("var").value,minify:g("mf").checked,abi:g("abi").checked,orient:g("ori").value,perms:[...document.querySelectorAll(".pm:checked")].map(x=>x.value),url:g("url").value.trim(),color:g("col").value,fb:g("fb").checked,out:g("out").value.trim().replace(/[^\w.-]/g,"")||slug||"app",args:g("ar").value.trim(),notes:g("nt").value.trim(),flv:g("fl").value.trim(),bc:g("bc").value.trim(),kiosk:g("ki").checked,ref:g("rf").value.trim(),sub:g("sb").value.trim(),ov:g("ov").checked,ps:AUTO.pkg===undefined?!!g("pkg").value.trim():g("pkg").value.trim()!==AUTO.pkg,kind:effKind()==="site"?"":effKind(),fs:g("fs").checked,kp:g("kp").checked,zm:g("zm").checked,ex:g("ex").checked,of:g("of").checked,pt:g("pt").checked,sc:g("scb").checked?g("sc").value:"",ua:g("ua").value.trim(),...srMap()};
}
const KEY=["Set up job","Run actions/checkout","Prepare source","Setup Java","Setup Node","Setup Flutter","Setup Gradle","Generate project","Build","Collect output","Upload artifact","Release"];
const NR={"Set up job":["Menyiapkan ruang kerja","Ruang kerja siap"],"Run actions/checkout":["Mengambil kode","Kode siap"],"Prepare source":["Membaca sumber proyekmu","Sumber proyek dikenali"],"Setup Java":["Menyalakan Java 17","Java 17 siap"],"Setup Node":["Menyiapkan Node.js","Node.js siap"],"Setup Flutter":["Menyiapkan Flutter","Flutter siap"],"Setup Gradle":["Menyiapkan Gradle","Gradle siap"],"Generate project":["Merakit proyek dari konfigurasimu","Proyek, ikon, dan kunci tanda tangan siap"],"Build":["Mengompilasi aplikasi, tahap terlama","Aplikasi berhasil dikompilasi"],"Collect output":["Menandatangani aplikasi","Aplikasi ditandatangani, SHA-256 dihitung"],"Upload artifact":["Mengemas hasil","Hasil dikemas"],"Release":["Menerbitkan ke Releases","Diterbitkan ke Releases"]};
const WD={"Set up job":5,"Run actions/checkout":3,"Prepare source":8,"Setup Java":5,"Setup Node":8,"Setup Flutter":60,"Setup Gradle":10,"Generate project":10,"Build":150,"Collect output":12,"Upload artifact":6,"Release":8};
const key=n=>KEY.find(k=>n.startsWith(k));
let T={as:true,f:"",lf:0},DL=null,tmr=null;
const fmtT=x=>{x=Math.max(0,Math.round(x));return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0")};
const sc=x=>!x?"":x.status==="in_progress"?"on":x.status!=="completed"?"":x.conclusion==="success"?"ok":x.conclusion==="skipped"?"":"er";
const cls=x=>/BUILD SUCCESSFUL/.test(x)?"s":/##\[error\]|\berror\b|FAILED|Exception/i.test(x)?"e":/##\[warning\]|\bwarning\b|deprecated/i.test(x)?"w":"";
const HINT=[[/namespace|package|applicationId/i,"Package name atau namespace tidak valid. Gunakan huruf kecil, contoh com.contoh.app."],[/minSdk|compileSdk|SDK|platform/i,"Versi SDK tidak cocok. Naikkan minSdk (minimal 26)."],[/R8|minify|proguard|missing class/i,"R8 gagal memproses kode. Matikan R8 minify di Opsi lanjutan."],[/keystore|\.jks|alias|password/i,"Keystore atau password tidak cocok. Hapus secrets KEYSTORE_B64 agar keystore dibuat otomatis."],[/Unsupported class file|source option|JDK|Java version/i,"Versi Java proyek tidak cocok (runner memakai Java 17). Proyek lama mungkin perlu AGP 8 atau lebih baru."],[/resolve|timeout|network|connection/i,"Gagal mengunduh dependensi. Jalankan ulang build."]];
const wt=k=>{const a=H.map(h=>h.sd&&h.sd[k]).filter(Boolean);return a.length?a.reduce((x,y)=>x+y)/a.length:WD[k]};
const by=k=>(T.steps||[]).find(x=>key(x.name)===k);
const rows=()=>KEY.filter(k=>{const x=by(k);return!(x&&x.conclusion==="skipped")&&!(!x&&T.c&&T.c.sr==="scratch"&&(k==="Setup Node"||k==="Setup Flutter"))});
function pctNow(){
 if(T.fin)return T.ok?100:T.pct||0;
 if(!T.steps.length)return T.zip?Math.round((T.up||0)*8):0;
 let tot=0,got=0;
 rows().forEach(k=>{const w=wt(k),x=by(k);tot+=w;if(!x)return;if(x.conclusion==="success")got+=w;else if(x.status==="in_progress"&&x.started_at)got+=w*Math.min(.95,Math.max(0,(Date.now()-Date.parse(x.started_at))/1000)/w)});
 const f=tot?got/tot:0;return Math.min(99,Math.round(T.zip?8+92*f:f*100));
}
function line(id,txt,c,tm){
 let e=document.getElementById(id);
 if(!e){e=document.createElement("div");e.id=id;e.innerHTML="<i></i><span></span><em></em>";$("#nl").appendChild(e)}
 const k="nl "+c;if(e.className!==k)e.className=k;
 if(e.children[1].textContent!==txt)e.children[1].textContent=txt;
 e.children[2].textContent=tm||"";
}
function termDraw(){
 if(!T.t0)return;
 const p=Math.max(T.pct||0,pctNow());T.pct=p;
 const pe=$("#pct");if(Math.abs(p-(+pe.dataset.v||0))>2)cu(pe,p);else{pe.dataset.v=p;pe.textContent=p}
 $("#pf").style.width=p+"%";$("#pf").style.borderRightWidth=p?"2px":"0";
 $("#el").textContent=fmtT(T.fin?(T.dur||0):(Date.now()-T.t0)/1000);
 if(!T.dsp&&!T.zip)line("p0","Mengirim permintaan ke GitHub","on");
 if(T.dsp){line("p0","Permintaan terkirim ke GitHub","ok");line("p2",T.steps.length?"Runner tersedia":"Menunggu runner tersedia",T.steps.length?"ok":"on")}
 let cur=T.dsp?"Menunggu runner tersedia":T.zip&&(T.up||0)<1?"Mengunggah ZIP":"Mengirim permintaan";
 T.steps.forEach(x=>{
  const k=key(x.name),c=sc(x);if(!k||!c)return;
  let t=c==="ok"?NR[k][1]:NR[k][0];
  if(c==="on"){if(k==="Build"&&T.task)t+=" · "+T.task;cur=t}
  if(c==="er")t=NR[k][0]+" (gagal)";
  line("n_"+k,t,c,x.started_at?Math.max(0,Math.round(((x.completed_at?Date.parse(x.completed_at):Date.now())-Date.parse(x.started_at))/1000))+" dtk":"");
 });
 if(T.fin){cur=T.ok?"Selesai":T.cx?"Dibatalkan":"Gagal";line("fin",T.ok?"Selesai. Aplikasimu siap diunduh.":T.cx?"Build dibatalkan.":"Build berhenti. Penyebabnya ada di bagian atas.",T.ok?"ok":"er")}
 const te=$("#tt2");if(te.textContent!==cur)te.textContent=cur;
}
function parseLog(t){
 const gs=[];let g={n:"Log",l:[]};gs.push(g);
 t.split("\n").forEach(x=>{x=x.replace(/^\S+Z /,"");const m=x.match(/^##\[group\](.*)/);if(m){g={n:m[1],l:[]};gs.push(g);return}if(x.startsWith("##[endgroup]")){g={n:"Log",l:[]};gs.push(g);return}g.l.push(x)});
 return gs.filter(g=>g.l.some(l=>l.trim()));
}
function logApply(){
 if(!T.log)return;
 const gs=parseLog(T.log),box=$("#gl"),sb=$("#tb"),q=($("#sq").value||"").toLowerCase();
 const nb=sb.scrollHeight-sb.scrollTop-sb.clientHeight<48;
 $("#lgd").hidden=false;let base=0;
 gs.forEach((g,i)=>{
  let d=document.getElementById("g"+i);
  if(!d){d=document.createElement("details");d.id="g"+i;d.dataset.n=0;d.innerHTML="<summary></summary><pre></pre>";d.firstChild.onclick=()=>{d.dataset.u=1};if(i===gs.length-1)d.open=true;box.appendChild(d)}
  const n=+d.dataset.n,pre=d.lastChild;
  if(g.l.length>n&&n<1500){
   const add=g.l.slice(n,1500);
   pre.insertAdjacentHTML("beforeend",add.map((x,j)=>{const c=cls(x),v=(!T.f||c===T.f)&&(!q||x.toLowerCase().includes(q));return `<span class="ll L${c}" data-c="${c}"${v?"":" hidden"}><span class="ln">${base+n+j+1}</span>${esc(x)}</span>`}).join(""));
   d.dataset.n=n+add.length;
   if(add.some(x=>cls(x)==="e")&&!d.dataset.u)d.open=true;
  }
  const er=!!d.querySelector(".Le"),sm=d.firstChild,h=esc(g.n)+'<span class="tag">'+g.l.length+"</span>"+(er?'<span class="tag">Error</span>':"");
  if(sm.dataset.h!==h){sm.innerHTML=h;sm.dataset.h=h}
  base+=g.l.length;
 });
 if(T.as&&nb)sb.scrollTop=sb.scrollHeight;
}
function filt(){
 const q=($("#sq").value||"").toLowerCase(),on=!!(T.f||q);
 document.querySelectorAll("#gl details").forEach(d=>{let n=0;d.querySelectorAll(".ll").forEach(l=>{const v=(!T.f||l.dataset.c===T.f)&&(!q||l.textContent.toLowerCase().includes(q));l.hidden=!v;if(v)n++});d.hidden=on&&!n;if(on&&n&&!d.dataset.u)d.open=true});
}
const logDraw=()=>{logApply();filt()};
const termTxt=()=>(T.steps||[]).map(x=>`[${x.conclusion||x.status}] ${x.name}`).join("\n")+"\n\n"+(T.log||"");
function pin(i){H[i].pin=!H[i].pin;sv("h",H);hist()}
function upZip(f){
 return new Promise((ok,no)=>{
  if(f.size>50*1048576)return no(Error("ZIP lebih dari 50 MB. Gunakan opsi repo GitHub untuk proyek besar."));
  const path=`uploads/${Date.now()}.zip`,rd=new FileReader();
  rd.onerror=()=>no(Error("Gagal membaca file ZIP."));
  rd.onload=()=>{
   const x=new XMLHttpRequest(),t0=performance.now();
   x.open("PUT",`https://api.github.com/repos/${S.r}/contents/${path}`);
   x.setRequestHeader("Authorization","Bearer "+S.t);x.setRequestHeader("Accept","application/vnd.github+json");x.setRequestHeader("Content-Type","application/json");
   x.upload.onprogress=e=>{if(!e.lengthComputable)return;T.up=e.loaded/e.total;const sz=T.up*f.size,sp=sz/((performance.now()-t0)/1000||1);line("up",`Mengunggah ZIP · ${Math.round(T.up*100)}% · ${(sz/1048576).toFixed(1)}/${(f.size/1048576).toFixed(1)} MB · ${(sp/1048576).toFixed(1)} MB/s`,"on")};
   x.onload=()=>{if(x.status<300){T.up=1;line("up","ZIP terunggah ("+(f.size/1048576).toFixed(1)+" MB)","ok");ok(path)}else no(Error("Unggah ZIP gagal ("+x.status+")."))};
   x.onerror=()=>no(Error("Koneksi terputus saat mengunggah ZIP."));
   x.send('{"message":"Unggah ZIP","content":"'+rd.result.split(",")[1]+'"}');
  };
  rd.readAsDataURL(f);
 });
}
/* ===== alur bertahap, analisis proyek, sinkron template ===== */
let ST=0,URLOK=false,A=null,AUTO={},PF=null,PFN="",PFSZ=0,FZ=null,TPLOK=null;
const PMAP={INTERNET:"internet",CAMERA:"camera",READ_EXTERNAL_STORAGE:"storage",WRITE_EXTERNAL_STORAGE:"storage",ACCESS_FINE_LOCATION:"location",ACCESS_COARSE_LOCATION:"location",POST_NOTIFICATIONS:"notifications"};
const KN={flutter:"Flutter",capacitor:"Capacitor",rn:"React Native / Expo",gradle:"Gradle Android",web:"Web (HTML/JS)",site:"Situs web"};
const fsz=b=>b>1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB";
const pretty=x=>String(x).replace(/[-_.]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const effKind=()=>A&&A.kind&&A.conf>=70?A.kind:($("#kd").value||(A&&A.kind)||"");
const loadJSZip=()=>window.JSZip?Promise.resolve():new Promise((ok,no)=>{const x=document.createElement("script");x.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";x.onload=ok;x.onerror=()=>no(Error("Pembaca ZIP gagal dimuat. Periksa koneksi."));document.head.appendChild(x)});
function idleDraw(){
 if(T.t0)return;
 const sr=$("#sr").value;
 line("idle",!sr?"Pilih sumber proyek untuk memulai":sr==="scratch"?"Siap membuat aplikasi dasar. Menunggu build dimulai":A||URLOK?"Siap dibuild. Menunggu build dimulai":sr==="zip"?"Menunggu file proyek dipilih":"Menunggu URL dibaca","id");
}
function setSrc(v){
 if($("#sr").value!==v){A=null;PF=null;FZ=null;URLOK=false;AUTO={};$("#an").innerHTML="";$("#kdw").hidden=true;$("#ut").hidden=true;dzUI();auUI()}
 $("#sr").value=v;document.querySelectorAll("#srcs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===v));
 $("#szf").hidden=v!=="zip";$("#uf").hidden=v!=="url";$("#sbw").hidden=!v||v==="scratch";$("#rfw").hidden=v!=="url";$("#tplw").hidden=v!=="scratch";$("#ovw").hidden=!v||v==="scratch";
 if(v==="scratch")$("#an").innerHTML=`<div class="card" style="box-shadow:2px 2px 0 #000"><b>Aplikasi dasar tanpa proyek</b><p style="margin:6px 0 0">Dibuat dari konfigurasi saja: halaman teks, atau WebView bila kamu mengisi URL WebView.</p></div>`;
 idleDraw();
}
function dzUI(){$("#dz").classList.toggle("has",!!PF);$("#dzt").textContent=PF?PFN:"Pilih ZIP atau HTML";$("#dzs").textContent=PF?fsz(PFSZ):"Maks 50 MB";$("#dzx").hidden=!PF;$("#dzb").hidden=!!PF}
function auUI(){
 ["name","pkg","vn","vc"].forEach(f=>{const e=document.querySelector(`.au[data-f=${f}]`);if(!e)return;e.innerHTML=AUTO[f]===undefined?"":$("#"+f).value===String(AUTO[f])?"<em>otomatis</em>":`<button type="button" data-r="${f}">Kembalikan</button>`});
}
async function analyze(files,read,o={}){
 const has=f=>files.includes(f),pick=re=>files.find(f=>re.test(f)),R={kind:null,conf:0,meta:{},perms:[],warn:[],rec:[],n:files.length};
 const rd=async p=>{try{return await read(p)}catch{return ""}},kt=(t,re)=>(t.match(re)||[])[1];
 if(!files.length){R.warn.push("Proyek kosong atau subfolder salah.");return R}
 if(o.truncated)R.warn.push("Daftar berkas repo terpotong GitHub. Analisis bisa kurang lengkap.");
 if(o.priv)R.warn.push("Repo privat. Isi secret SRC_TOKEN di repo apk-builder agar build bisa mengambil kodenya.");
 let pk={};if(has("package.json")){try{pk=JSON.parse(await rd("package.json"))}catch{R.warn.push("package.json tidak valid.")}}
 const dp={...pk.dependencies,...pk.devDependencies},cap=pick(/^capacitor\.config\.(ts|json|js)$/),vx=(pk.version||"").match(/^\d+\.\d+\.\d+/);
 if(has("pubspec.yaml")){
  const t=await rd("pubspec.yaml"),v=t.match(/^version:\s*(\d+\.\d+\.\d+)(?:\+(\d+))?/m);
  R.kind="flutter";R.conf=98;R.meta.name=kt(t,/^name:\s*(\S+)/m);if(v){R.meta.vn=v[1];if(v[2])R.meta.vc=+v[2]}
  if(!files.some(f=>/^android\/app\/build\.gradle/.test(f)))R.warn.push("Folder android belum ada. Dibuat otomatis lewat flutter create saat build.");
  R.rec.push("Pakai AAB bila akan diunggah ke Play Store.");
 }else if(cap){
  const t=await rd(cap);R.kind="capacitor";R.conf=95;R.meta.pkg=kt(t,/appId["']?\s*[:=]\s*["']([^"']+)/);R.meta.name=kt(t,/appName["']?\s*[:=]\s*["']([^"']+)/);if(vx)R.meta.vn=vx[0];
  if(!has("package.json"))R.warn.push("package.json tidak ditemukan.");
  if(!files.some(f=>f.startsWith("android/")))R.rec.push("Platform android ditambahkan otomatis lewat npx cap add android.");
 }else if(dp["react-native"]||dp.expo){
  R.kind="rn";R.conf=92;R.meta.name=pk.name;if(vx)R.meta.vn=vx[0];
  try{const j=JSON.parse(await rd("app.json")),x=j.expo||j;R.meta.name=x.name||R.meta.name;R.meta.vn=x.version||R.meta.vn;if(x.android){R.meta.pkg=x.android.package;if(x.android.versionCode)R.meta.vc=x.android.versionCode}}catch{}
  if(!files.some(f=>f.startsWith("android/"))){if(dp.expo)R.rec.push("Folder android dibuat lewat expo prebuild saat build.");else R.warn.push("Proyek React Native tanpa folder android tidak bisa dibuild.")}
 }else if(has("gradlew")||has("settings.gradle")||has("settings.gradle.kts")){
  const ap=pick(/(^|\/)app\/build\.gradle(\.kts)?$/)||pick(/(^|\/)build\.gradle(\.kts)?$/);R.kind="gradle";R.conf=ap?93:75;
  if(ap){const t=await rd(ap),vc=kt(t,/versionCode\s*=?\s*(\d+)/);R.meta.pkg=kt(t,/applicationId\s*=?\s*["']([^"']+)/);R.meta.vn=kt(t,/versionName\s*=?\s*["']([^"']+)/);if(vc)R.meta.vc=+vc;R.meta.min=kt(t,/minSdk(?:Version)?\s*=?\s*(\d+)/);if(!/com\.android\.application/.test(t))R.warn.push("Modul ini tidak memakai plugin com.android.application.")}
  const mf=pick(/(^|\/)src\/main\/AndroidManifest\.xml$/);
  if(mf){const t=await rd(mf);R.perms=[...new Set([...t.matchAll(/uses-permission[^>]*android:name="android\.permission\.(\w+)"/g)].map(x=>PMAP[x[1]]).filter(Boolean))];const o2=kt(t,/screenOrientation="(\w+)"/);if(o2==="portrait"||o2==="landscape")R.meta.orient=o2}
  const gv=kt(await rd("gradle/wrapper/gradle-wrapper.properties"),/gradle-([\d.]+)/);if(gv&&+gv.split(".")[0]<7)R.warn.push(`Gradle ${gv} terlalu lama untuk Java 17. Perbarui wrapper ke 8.x.`);
  if(!has("gradlew"))R.warn.push("Tidak ada gradlew. Build memakai Gradle 8.7 dari runner.");
 }else if(has("package.json")||has("index.html")){
  const bs=pk.scripts&&pk.scripts.build,idx=has("index.html");
  R.kind="web";R.conf=bs?90:idx?96:40;R.meta.name=pk.name;if(vx)R.meta.vn=vx[0];R.perms=["internet"];
  if(!bs&&!idx)R.warn.push("Tidak ada index.html dan tidak ada skrip build. Build web akan gagal.");
  const wm=pick(/(^|\/)(manifest\.json|manifest\.webmanifest|site\.webmanifest)$/);
  if(wm)try{const j=JSON.parse(await rd(wm));if(j.name||j.short_name)R.meta.name=j.short_name||j.name;if(j.theme_color)R.meta.color=j.theme_color;if(/portrait|landscape/.test(j.orientation||""))R.meta.orient=/portrait/.test(j.orientation)?"portrait":"landscape"}catch{}
  if(!R.meta.name&&idx)R.meta.name=kt(await rd("index.html"),/<title>([^<]+)/i);
  R.rec.push("Web dibundel offline ke dalam APK. Izin internet tetap aktif untuk memanggil API.");
 }else R.warn.push("Jenis proyek tidak dikenali. Pilih jenis secara manual atau periksa subfolder.");
 const ic=pick(/(^|\/)(ic_launcher|icon|logo)[^/]*\.png$/i);if(ic)R.icon=ic;
 return R;
}
function anShow(R,nm){
 A=R;const m=R.meta,ok=R.kind&&R.conf>=70;
 $("#kdw").hidden=ok;
 $("#an").innerHTML=`<div class="card"><div class="wh"><h2>Hasil analisis</h2><span class="tag ${ok?"success":""}">${KN[R.kind]||"Tidak dikenali"}${R.kind?" · "+(R.conf>=90?"yakin":R.conf>=70?"cukup yakin":"kurang yakin"):""}</span></div>
 <dl class="kv">${R.n?`<dt>Berkas</dt><dd>${R.n}</dd>`:""}${m.name?`<dt>Nama</dt><dd>${esc(m.name)}</dd>`:""}${m.pkg?`<dt>Package</dt><dd>${esc(m.pkg)}</dd>`:""}${m.vn?`<dt>Versi</dt><dd>${esc(m.vn)}${m.vc?" ("+m.vc+")":""}</dd>`:""}${m.min?`<dt>minSdk</dt><dd>${esc(m.min)}</dd>`:""}${R.icon?`<dt>Ikon</dt><dd>${esc(R.icon)}</dd>`:""}</dl>
 ${R.perms.length?`<div class="chips" style="flex-wrap:wrap;margin:0 0 8px">${R.perms.map(x=>`<span class="tag">${x}</span>`).join("")}</div>`:""}
 ${R.warn.length?`<ul class="wl">${R.warn.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
 ${R.rec.length?`<p style="margin:8px 0 0">${esc(R.rec.join(" "))}</p>`:""}</div>`;
 if(R.kind)prefill(R,nm);
 idleDraw();
}
function prefill(R,nm){
 const m=R.meta,base=m.name||nm||"Aplikasiku",slug=String(base).toLowerCase().replace(/[^a-z0-9]/g,""),okp=x=>x&&/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(x);
 AUTO={name:pretty(base),pkg:okp(m.pkg)?m.pkg:"com.app."+(/^[a-z]/.test(slug)?slug:"a"+slug),vn:m.vn||"1.0.0",vc:m.vc||1};
 for(const k in AUTO)$("#"+k).value=AUTO[k];
 if(R.perms.length)document.querySelectorAll(".pm").forEach(x=>x.checked=R.perms.includes(x.value));
 if(m.orient)$("#ori").value=m.orient;
 if(/^#[0-9a-f]{6}$/i.test(m.color||""))$("#col").value=m.color.toLowerCase();
 if(m.min)$("#min").value=Math.max(26,+m.min);
 $("#url").value=R.url||"";auUI();val();
}
async function onFile(f){
 FZ=f;PFN=f.name;PFSZ=f.size;PF=null;A=null;dzUI();
 if(f.size>50*1048576){FZ=null;$("#an").innerHTML=`<div class="card"><b>File terlalu besar</b><p style="margin:6px 0 0">Maksimal 50 MB. Untuk proyek besar gunakan URL repo GitHub.</p></div>`;idleDraw();return}
 $("#an").innerHTML=`<div class="card"><b>Membaca proyek...</b><div class="bar"><i class="ind"></i></div></div>`;
 try{
  await loadJSZip();let files,read,nm=f.name.replace(/\.(zip|html?)$/i,"");
  if(/\.html?$/i.test(f.name)){
   const txt=await f.text(),z=new JSZip();z.file("index.html",txt);
   PF=new File([await z.generateAsync({type:"blob"})],"project.zip");files=["index.html"];read=async()=>txt;
  }else{
   const z=await JSZip.loadAsync(f);PF=f;
   const names=Object.keys(z.files).filter(n=>!z.files[n].dir&&!n.startsWith("__MACOSX")&&!/(^|\/)\.git\//.test(n)),tops=new Set(names.map(n=>n.split("/")[0]));
   const pre=tops.size===1&&names.every(n=>n.includes("/"))?[...tops][0]+"/":"",sub=$("#sb").value.trim().replace(/^\/|\/$/g,""),pp=pre+(sub?sub+"/":"");
   files=names.filter(n=>n.startsWith(pp)).map(n=>n.slice(pp.length));read=p=>z.file(pp+p).async("string");
  }
  anShow(await analyze(files,read),nm);
 }catch(e){PF=null;$("#an").innerHTML=`<div class="card"><b>Gagal membaca file</b><p style="margin:6px 0 0">${esc(e.message||"ZIP rusak atau tidak didukung.")}</p></div>`}
 dzUI();idleDraw();
}
async function anRepo(){
 if(!S.t){toast("Hubungkan GitHub dulu");drawer(true);return}
 const u=$("#su").value.trim(),m=u.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^/]+)(?:\/(.+?))?)?\/?$/);
 if(!m){$("#an").innerHTML=`<div class="card"><b>URL tidak valid</b><p style="margin:6px 0 0">Gunakan bentuk https://github.com/pemilik/repo</p></div>`;return}
 const [,o,r,br,sp]=m;A=null;$("#anb").disabled=true;
 $("#an").innerHTML=`<div class="card"><b>Membaca repo...</b><div class="bar"><i class="ind"></i></div></div>`;
 try{
  const info=await api(`/repos/${o}/${r}`),ref=$("#rf").value.trim()||br||info.default_branch;
  const tr=await api(`/repos/${o}/${r}/git/trees/${encodeURIComponent(ref)}?recursive=1`),sub=($("#sb").value.trim()||sp||"").replace(/^\/|\/$/g,""),pre=sub?sub+"/":"";
  const files=tr.tree.filter(x=>x.type==="blob"&&x.path.startsWith(pre)).map(x=>x.path.slice(pre.length));
  const read=async p=>{const q=await fetch(`https://api.github.com/repos/${o}/${r}/contents/${pre}${p}?ref=${encodeURIComponent(ref)}`,{headers:{Authorization:"Bearer "+S.t,Accept:"application/vnd.github.raw+json"}});if(!q.ok)throw Error(q.status);return q.text()};
  $("#su").value=`https://github.com/${o}/${r}`;$("#sb").value=sub;if(!$("#rf").value&&br)$("#rf").value=br;
  anShow(await analyze(files,read,{truncated:tr.truncated,priv:info.private}),r);
 }catch(e){$("#an").innerHTML=`<div class="card"><b>Gagal membaca repo</b><p style="margin:6px 0 0">${esc(e.message)}</p></div>`}
 $("#anb").disabled=false;idleDraw();
}
async function checkTpl(){
 if(!S.t)return;
 try{
  const tp=S.tp||"buildernexa/apk-template",ps=["tools/generate.py",".github/workflows/build.yml","tools/requirements.txt"],ok=t=>/NEXA_TPL = 6/.test(t);
  const g=async(r,p)=>{try{return await api(`/repos/${r}/contents/${p}`)}catch{return null}};
  const [t0,t1,t2,b0,b1,b2]=await Promise.all([g(tp,ps[0]),g(tp,ps[1]),g(tp,ps[2]),g(S.r,ps[0]),g(S.r,ps[1]),g(S.r,ps[2])]);
  const dec=x=>x?atob(x.content.replace(/\n/g,"")):"",e=$("#sync");
  if(!t0||!ok(dec(t0))){TPLOK=true;e.hidden=false;e.textContent="Template (apk-template) belum diperbarui ke versi terbaru. Ganti generate.py dan build.yml di sana, lalu buka tab ini lagi.";return}
  const bad=!b0||!ok(dec(b0))||!b1||!b2||!t2||(t1&&b1.sha!==t1.sha)||b0.sha!==t0.sha||b2.sha!==t2.sha;
  TPLOK=!bad;e.hidden=!bad;
  e.innerHTML=bad?`Repo build-mu belum memakai template terbaru, sehingga proyekmu bisa diabaikan dan hasilnya aplikasi teks. <button class="btn" id="syb" style="margin-top:8px">Sinkronkan sekarang</button>`:"";
  if(bad)$("#syb").onclick=syncTpl;
 }catch{}
}
async function syncTpl(){
 const b=$("#syb"),tp=S.tp||"buildernexa/apk-template";b.disabled=true;
 try{
  for(const [i,p] of ["tools/generate.py",".github/workflows/build.yml","tools/requirements.txt"].entries()){
   b.textContent=`Menyinkronkan ${i+1}/3...`;
   const t=await api(`/repos/${tp}/contents/${p}`);let sha;try{sha=(await api(`/repos/${S.r}/contents/${p}`)).sha}catch{}
   await api(`/repos/${S.r}/contents/${p}`,{method:"PUT",body:JSON.stringify({message:"Sinkron template",content:t.content.replace(/\n/g,""),sha})});
  }
  toast("Repo build disinkronkan");TPLOK=null;await checkTpl();
 }catch(e){b.disabled=false;b.textContent="Coba lagi";toast(e.message)}
}
function classify(u){
 let x;try{x=new URL(u)}catch{return null}
 if(!/^https?:$/.test(x.protocol))return null;
 const h=x.hostname.replace(/^www\./,""),p=x.pathname;
 if(/\.zip$/i.test(p)||/\/archive\/|\/zipball\//.test(p)||/^codeload\./.test(h))return{t:"ziplink"};
 if(h==="github.com"&&/^\/[\w.-]+\/[\w.-]+/.test(p))return{t:"repo",gh:true};
 if(/\.git$/.test(p)||(/^(gitlab\.com|bitbucket\.org|codeberg\.org|gitea\.com)$/.test(h)&&p.split("/").filter(Boolean).length>=2))return{t:"repo"};
 return{t:"site"};
}
function srMap(){
 const v=$("#sr").value;
 if(v==="zip")return{sr:"zip"};
 if(v==="scratch")return{sr:"scratch"};
 const u=$("#su").value.trim(),k=classify(u);
 if(!k)throw Error("URL tidak valid. Gunakan alamat http atau https.");
 return k.t==="site"?{sr:"scratch",url:u,site:true,kind:""}:{sr:k.t,src:u};
}
async function readUrl(){
 const u=$("#su").value.trim(),k=classify(u),ut=$("#ut");
 if(!k){ut.hidden=true;$("#an").innerHTML=`<div class="card" style="box-shadow:2px 2px 0 #000"><b>URL tidak valid</b><p style="margin:6px 0 0">Gunakan alamat yang diawali http:// atau https://</p></div>`;return}
 ut.hidden=false;ut.textContent={site:"Situs web",ziplink:"Link ZIP",repo:k.gh?"Repo GitHub":"Repo Git"}[k.t];
 if(k.t==="repo"&&k.gh)return anRepo();
 A=null;const x=new URL(u),nm=k.t==="site"?x.hostname.replace(/^www\./,"").split(".")[0]:decodeURIComponent(x.pathname.split("/").filter(Boolean).pop()||"app").replace(/\.(zip|git)$/i,"");
 if(k.t==="site")anShow({kind:"site",conf:99,meta:{name:nm},perms:["internet"],warn:[],rec:["Situs ini dimuat di WebView. Aktifkan Halaman offline dan Tautan luar di bagian Tampilan dan perilaku."],n:0,url:u},nm);
 else{$("#an").innerHTML=`<div class="card" style="box-shadow:2px 2px 0 #000"><b>${k.t==="ziplink"?"Link ZIP":"Repo Git"} diterima</b><p style="margin:6px 0 0">Isi proyek dibaca saat build karena browser tidak bisa membukanya langsung. Jenisnya dikenali otomatis di server.</p></div>`;prefill({meta:{name:nm},perms:[],kind:"x"},nm)}
 URLOK=true;idleDraw();
}
async function saveKs(){
 const f=$("#ksf").files[0],m=t=>$("#ksm").textContent=t,pw=$("#ksp").value,al=$("#kal").value.trim();
 if(!S.t)return m("Hubungkan GitHub dulu.");if(!f)return m("Pilih file keystore.");if(!pw||!al)return m("Isi password dan alias.");
 $("#ksb").disabled=true;
 try{
  m("1/4 Memuat enkripsi...");const so=(await import("https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.13/+esm")).default;await so.ready;
  m("2/4 Mengambil kunci repo...");const pk=await api(`/repos/${S.r}/actions/secrets/public-key`),key=so.from_base64(pk.key,so.base64_variants.ORIGINAL);
  const enc=v=>so.to_base64(so.crypto_box_seal(so.from_string(v),key),so.base64_variants.ORIGINAL);
  const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(",")[1]);r.onerror=no;r.readAsDataURL(f)});
  m("3/4 Menyimpan secrets...");
  for(const [n,v] of [["KEYSTORE_B64",b64],["KS_PASS",pw],["KEY_ALIAS",al]])await api(`/repos/${S.r}/actions/secrets/${n}`,{method:"PUT",body:JSON.stringify({encrypted_value:enc(v),key_id:pk.key_id})});
  m("4/4 Selesai. Keystore ini dipakai di build berikutnya.");$("#ksp").value="";toast("Keystore tersimpan");
 }catch(e){m(e.message)}
 $("#ksb").disabled=false;
}
let CMP=[];
function cmpT(i){const k=CMP.indexOf(i);k>=0?CMP.splice(k,1):CMP.push(i);if(CMP.length>2)CMP.shift();hist()}
function cmpHtml(){
 if(!CMP.length)return"";if(CMP.length<2)return`<p>Pilih satu build lagi untuk dibandingkan.</p>`;
 const [a,b]=CMP.map(i=>H[i]),sz=h=>((h.sum&&h.sum.files)||[]).reduce((x,f)=>x+f.size,0),sh=h=>(((h.sum&&h.sum.files)||[])[0]||{sha:"-"}).sha.slice(0,12);
 const row=(l,x,y)=>`<tr class="${x===y?"":"df"}"><td>${l}</td><td>${esc(x)}</td><td>${esc(y)}</td></tr>`,cf=h=>h.cfg||{};
 return `<div class="card"><h2>Perbandingan</h2><table class="ct">${row("Versi",a.vn+" ("+a.vc+")",b.vn+" ("+b.vc+")")}${row("Status",lab(a.st),lab(b.st))}${row("Durasi",fmtT(a.dur||0),fmtT(b.dur||0))}${row("Ukuran",fsz(sz(a)),fsz(sz(b)))}${row("Format",cf(a).fmt+" "+cf(a).var,cf(b).fmt+" "+cf(b).var)}${row("R8",cf(a).minify?"ya":"tidak",cf(b).minify?"ya":"tidak")}${row("Izin",(cf(a).perms||[]).join(", "),(cf(b).perms||[]).join(", "))}${row("SHA-256",sh(a),sh(b))}</table></div>`;
}
const lnk=i=>(H[i].assets&&H[i].assets[0]||{}).u||H[i].rel;
function copyLink(i){navigator.clipboard.writeText(lnk(i)).then(()=>toast("Tautan disalin"))}
async function qr(i){
 const b=$("#qrb");if(b.innerHTML){b.innerHTML="";return}
 try{
  if(!window.qrcode)await new Promise((ok,no)=>{const x=document.createElement("script");x.src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";x.onload=ok;x.onerror=()=>no(Error("QR gagal dimuat"));document.head.appendChild(x)});
  const q=qrcode(0,"M");q.addData(lnk(i));q.make();b.innerHTML='<div class="card" style="display:grid;place-items:center;box-shadow:2px 2px 0 #000">'+q.createSvgTag({cellSize:5,margin:2})+"</div>";
 }catch(e){toast(e.message)}
}
async function queue(){
 if(!S.t)return 0;
 try{
  const r=await Promise.all(["in_progress","queued"].map(x=>api(`/repos/${S.r}/actions/runs?status=${x}&per_page=5`)));
  const l=r.flatMap(x=>x.workflow_runs),b=$("#qb");b.hidden=!l.length||busy;
  b.textContent=l.length?"Build lain di repo: "+l.map(x=>"#"+x.run_number+(x.status==="queued"?" (antre)":" (berjalan)")).join(", "):"";
  return busy?0:l.length;
 }catch{return 0}
}
function kv(e){
 const s=e.sum||{},f=s.files||[];
 return `<dl class="kv"><dt>Aplikasi</dt><dd>${esc(s.name||e.name)}</dd><dt>Package</dt><dd>${esc(s.pkg||e.cfg.pkg)}</dd><dt>Versi</dt><dd>${esc(e.vn)} (${e.vc})</dd><dt>Durasi</dt><dd>${fmtT(e.dur||0)}</dd></dl>${f.map(x=>`<div class="fl"><b>${esc(x.n)}</b> &middot; ${(x.size/1048576).toFixed(2)} MB<br><span class="mono">SHA-256 ${x.sha}</span></div>`).join("")}${(s.apk||[]).map(x=>`<div class="fl"><b>Isi APK</b> &middot; ${esc(x.label||"-")} &middot; ${esc(x.pkg)} ${esc(x.vn)} (${esc(x.vc)}) &middot; ${x.assets} berkas aset</div>`).join("")}${(s.gen||[]).length?`<details><summary>${s.gen.length} berkas dibuat</summary><pre>${esc(s.gen.join("\n"))}</pre></details>`:""}`;
}
function summ(e){
 $("#rs").innerHTML=`<div class="card"><div class="wh"><h2>Ringkasan hasil</h2><span class="tag success">Berhasil</span></div>${kv(e)}<div class="stack">${(e.assets||[]).map((a,j)=>`<button class="btn" onclick="dl(0,${j})">Unduh ${esc(a.n)}</button>`).join("")}<button class="btn w" onclick="share(0)">Bagikan</button><button class="btn w" onclick="copyLink(0)">Salin tautan</button><button class="btn w" onclick="qr(0)">Tampilkan QR</button><div id="qrb"></div></div></div>`;
}
function share(i){const e=H[i],d={title:e.name,text:e.name+" v"+e.vn,url:e.rel};navigator.share?navigator.share(d).catch(()=>{}):navigator.clipboard.writeText(e.rel).then(()=>toast("Tautan disalin"))}
async function dl(i,j){
 const a=H[i].assets[j];if(!a.id){window.open(a.u,"_blank");return}
 if(DL)return toast("Unduhan lain masih berjalan");
 const ab=DL=new AbortController(),p=$("#dp");p.hidden=false;
 const draw=(g,t,sp)=>{p.innerHTML=`<div class="wh"><b class="ell">${esc(a.n)}</b><button class="btn w" id="dc" style="width:auto;min-height:36px;padding:0 12px;box-shadow:none">Batal</button></div><div class="bar"><i style="width:${t?g/t*100:8}%"></i></div><p>${t?Math.round(g/t*100)+"% &middot; ":""}${(g/1048576).toFixed(1)}${t?" / "+(t/1048576).toFixed(1):""} MB &middot; ${(sp/1048576).toFixed(1)} MB/s</p>`;$("#dc").onclick=()=>ab.abort()};
 draw(0,a.s||0,0);
 try{
  const r=await fetch(`https://api.github.com/repos/${S.r}/releases/assets/${a.id}`,{headers:{Accept:"application/octet-stream",Authorization:"Bearer "+S.t},signal:ab.signal});
  if(!r.ok)throw Error(r.status);
  const tot=+r.headers.get("content-length")||a.s||0,rd=r.body.getReader(),ch=[],t0=performance.now();let g=0;
  for(;;){const {done,value}=await rd.read();if(done)break;ch.push(value);g+=value.length;draw(g,tot,g/((performance.now()-t0)/1000||1))}
  const u=URL.createObjectURL(new Blob(ch,{type:"application/octet-stream"})),x=document.createElement("a");x.href=u;x.download=a.n;x.click();setTimeout(()=>URL.revokeObjectURL(u),9e3);toast("Unduhan selesai");
 }catch(e){if(e.name==="AbortError")toast("Unduhan dibatalkan");else{toast("Unduhan langsung diblokir. Membuka tautan GitHub.");window.open(a.u,"_blank")}}
 DL=null;p.hidden=true;
}
function notify(t){
 if(!("Notification"in window)||Notification.permission!=="granted")return;
 try{navigator.serviceWorker.ready.then(r=>r.showNotification("NexaBuild",{body:t}))}catch{}
}
async function build(){
 if(busy)return;
 if(!S.t){toast("Hubungkan GitHub dulu");drawer(true);return}
 if(TPLOK===false){toast("Sinkronkan repo build dulu");$("#sync").scrollIntoView({behavior:"smooth"});return}
 if(!val()){toast("Perbaiki isian yang ditandai");return}
 let c;try{c=cfg()}catch(e){$("#bm").textContent=e.message;return}
 if(await queue()){toast("Ada build lain yang sedang berjalan");return}
 if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();
 busy=true;run=null;PL={};T={t0:Date.now(),steps:[],f:"",as:true,lf:0,pct:0,c,zip:c.sr==="zip"};
 const tm=$("#term");tm.hidden=false;
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
  if(!run)throw Error("Run tidak ditemukan. Pastikan build.yml ada di repo.");
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
   const rel=(await api(`/repos/${S.r}/releases?per_page=1`))[0];
   e.rel=rel.html_url;e.relid=rel.id;e.tag=rel.tag_name;e.assets=rel.assets.map(a=>({n:a.name,u:a.browser_download_url,id:a.id,s:a.size}));
   const m=(rel.body||"").match(/<!--nexa:(.*?)-->/s);try{e.sum=m?JSON.parse(m[1]):null}catch{}
   sv("h",H);summ(e);
  }else if(!T.cx){
   const ev=(T.log||"").split("\n").filter(x=>cls(x)==="e").join("\n"),h=HINT.find(x=>x[0].test(ev));
   e.hint=h?h[1]:"Buka run di GitHub untuk detail.";
   $("#hn").innerHTML=`<div class="hint"><b>Penyebab kemungkinan</b><p>${esc(e.hint)}</p></div>`;
  }
 }catch(err){e.st="failure";T.fin=true;T.ok=false;T.dur=Math.round((Date.now()-T.t0)/1000);$("#bm").textContent=err.message;termDraw()}
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
function cu(e,to){
 const from=+e.dataset.v||0;e.dataset.v=to;
 if(from===to||matchMedia("(prefers-reduced-motion:reduce)").matches){e.textContent=to;return}
 const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/600);e.textContent=Math.round(from+(to-from)*k);if(k<1)requestAnimationFrame(f)})(t0);
}
function streak(){const ds=new Set(H.map(h=>new Date(h.t).toDateString()));let n=0,d=new Date();if(!ds.has(d.toDateString()))d.setDate(d.getDate()-1);while(ds.has(d.toDateString())){n++;d.setDate(d.getDate()-1)}return n}
function wNext(){
 const n=H.length,ok=H.filter(h=>h.st==="success").length,sk=streak();let c=0;for(const h of H){if(h.st==="success")c++;else if(h.st!=="running")break}
 const M=[["Build pertama",n>=1],["10 build",n>=10],["5 sukses beruntun",c>=5]];
 const nx=!n?"Mulai dari template di tab Build. Cukup isi nama dan URL situs.":H[0].st==="failure"?"Build terakhir gagal. "+(H[0].hint||"Buka run di GitHub untuk detail."):!ok?"Tunggu build pertama selesai, lalu unduh hasilnya.":S.icon?"Coba format AAB untuk Play Store di Opsi lanjutan.":"Unggah ikon sendiri di Opsi lanjutan.";
 return `<div class="card"><div class="wh"><h2>Pencapaian</h2><span class="tag ${sk?"success":""}">Streak ${sk} hari</span></div><div class="chips" style="margin:0 0 12px;flex-wrap:wrap">${M.map(([t,d])=>`<span class="tag ${d?"success":""}">${d?"Tercapai: ":""}${t}</span>`).join("")}</div><p style="margin:0">${esc(nx)}</p></div>`;
}
function presets(){$("#ps").innerHTML='<option value="">Pilih</option>'+Object.keys(PR).map(k=>`<option>${esc(k)}</option>`).join("")}

/* events */
$("#mn").onclick=()=>drawer(true);$("#dx").onclick=$("#drawerShade").onclick=()=>drawer(false);
$("#te").onclick=()=>{const i=$("#tk");i.type=i.type==="password"?"text":"password"};
$("#lb").onclick=connect;$("#tt").onclick=test;$("#lo").onclick=disc;
$("#go").onclick=build;$("#cn").onclick=cancel;
$("#cp").onclick=()=>navigator.clipboard.writeText(termTxt()).then(()=>toast("Log disalin"));
$("#downloadLog").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([termTxt()],{type:"text/plain"}));a.download="nexabuild-log.txt";a.click()};
$("#as").onclick=e=>{T.as=!T.as;e.currentTarget.setAttribute("aria-pressed",!!T.as)};
document.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{T.f=b.dataset.f;document.querySelectorAll("[data-f]").forEach(x=>x.setAttribute("aria-pressed",x===b));logDraw()});
$("#sq").oninput=logDraw;document.querySelectorAll("#srcs button").forEach(b=>b.onclick=()=>setSrc(b.dataset.v));
$("#zf").onchange=e=>e.target.files[0]&&onFile(e.target.files[0]);
$("#dzx").onclick=e=>{e.preventDefault();PF=null;FZ=null;A=null;AUTO={};$("#zf").value="";$("#an").innerHTML="";$("#kdw").hidden=true;dzUI();auUI();idleDraw()};
$("#anb").onclick=readUrl;$("#su").onchange=()=>{URLOK=false};$("#ksb").onclick=saveKs;
$("#sb").onchange=()=>{if($("#sr").value==="zip"&&FZ)onFile(FZ);else if($("#sr").value==="url"&&$("#su").value.trim())readUrl()};
$("#kd").onchange=()=>{idleDraw()};
$("#name").oninput=$("#vn").oninput=auUI;
document.addEventListener("click",e=>{const r=e.target.closest("[data-r]");if(r){$("#"+r.dataset.r).value=AUTO[r.dataset.r];auUI();val()}});

$("#mm").onclick=e=>{const m=$("#mu");m.hidden=!m.hidden;e.currentTarget.setAttribute("aria-expanded",!m.hidden)};
document.addEventListener("click",e=>{if(!e.target.closest("#mu,#mm"))$("#mu").hidden=true});
$("#exportCfg").onclick=()=>{try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(cfg(true),null,2)],{type:"application/json"}));a.download="nexabuild-config.json";a.click()}catch(e){toast(e.message)}};
$("#im2").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const c=JSON.parse(await f.text());if(!c.name||!c.pkg)throw Error("Format tidak dikenali");fill(c);toast("Konfigurasi diimpor")}catch(x){toast(x.message)}e.target.value=""};
let ipr;addEventListener("beforeinstallprompt",e=>{e.preventDefault();ipr=e;$("#ib").hidden=false});
$("#ib").onclick=async()=>{ipr.prompt();await ipr.userChoice;$("#ib").hidden=true};$("#pkg").oninput=$("#vc").oninput=val;
$("#ic").onchange=e=>e.target.files[0]&&upIcon(e.target.files[0]);
$("#psv").onclick=()=>{const n=prompt("Nama preset");if(!n)return;try{PR[n]=cfg(true);sv("p",PR);presets();$("#ps").value=n;toast("Preset disimpan")}catch(e){toast(e.message)}};
$("#ps").onchange=e=>{const c=PR[e.target.value];if(c){fill(c);toast("Preset dimuat")}};
$("#hq").oninput=$("#hf").onchange=hist;
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>go(+b.dataset.t));
let sx=0;$("#dr").addEventListener("touchstart",e=>sx=e.touches[0].clientX,{passive:true});
$("#dr").addEventListener("touchend",e=>{if(e.changedTouches[0].clientX-sx<-60)drawer(false)},{passive:true});
let py=null;
addEventListener("touchstart",e=>{py=scrollY===0&&!document.body.classList.contains("open")&&tab!==1?e.touches[0].clientY:null},{passive:true});
addEventListener("touchmove",e=>{if(py==null)return;const d=e.touches[0].clientY-py;$("#pullHint").style.transform=`translateY(${Math.max(0,Math.min(d,80))-60}px)`;$("#pullHint").textContent=d>70?"Lepas untuk muat ulang":"Tarik untuk muat ulang"},{passive:true});
addEventListener("touchend",e=>{if(py==null)return;const d=e.changedTouches[0].clientY-py;py=null;$("#pullHint").style.transform="";if(d>70){loadProfile();if(tab===2)hist();toast("Dimuat ulang")}},{passive:true});
addEventListener("online",()=>tab===0&&home());addEventListener("offline",()=>tab===0&&home());
setInterval(stats,3000);setInterval(tick,1000);
presets();ui();go(0);tplInit();val();idleDraw();termDraw();logDraw();if(S.t)loadProfile();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
