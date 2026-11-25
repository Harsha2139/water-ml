// CSV + PDF upload: parse -> map columns -> preview -> save (server or browser) -> reload & retrain
const MON=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
function parseCSV(t){t=t.replace(/^\uFEFF/,"");const l0=t.split("\n")[0],dl=[",",";","\t"].sort((a,b)=>l0.split(b).length-l0.split(a).length)[0];
 const rows=[];let r=[],c="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch=='"'&&t[i+1]=='"'){c+='"';i++}else if(ch=='"')q=false;else c+=ch}
  else if(ch=='"')q=true;else if(ch==dl){r.push(c);c=""}
  else if(ch=="\n"||ch=="\r"){if(ch=="\r"&&t[i+1]=="\n")i++;r.push(c);c="";if(r.some(x=>x.trim()))rows.push(r);r=[]}else c+=ch}
 r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows.map(x=>x.map(s=>s.trim()))}
function colmap(h){const m={};h.forEach((c,i)=>{c=String(c).toLowerCase();const k=/depth|water ?level|gwl|groundwater/.test(c)?"depth":/rain|precip/.test(c)?"rain":/temp/.test(c)?"temp":/^lat|latitude/.test(c)?"lat":/^lon|^lng|longitude/.test(c)?"lon":/state|province/.test(c)?"s":/district|location|station|place|name/.test(c)?"d":/month|^mon/.test(c)?"m":/year|^yr/.test(c)?"y":/date/.test(c)?"date":null;if(k&&m[k]==null)m[k]=i});return m}
const numv=s=>{const v=parseFloat(String(s==null?"":s).replace(/,/g,"").replace(/[^\d.\-]/g,""));return isFinite(v)?v:null};
function toRecords(table){const warn=[];let m,body;
 const hi=table.findIndex((r,i)=>i<25&&colmap(r).depth!=null&&Object.keys(colmap(r)).length>=3);
 if(hi>=0){m=colmap(table[hi].filter(c=>!/^\(.*\)$/.test(c)));body=table.slice(hi+1)}
 else{const n=table[0]?table[0].length:0;if(n==6)m={d:0,y:1,m:2,rain:3,temp:4,depth:5};else if(n==5)m={y:0,m:1,rain:2,temp:3,depth:4};
  else return{recs:[],warn:["No header row found. Need a 'depth' column plus year and month columns."]};warn.push("No header found, assumed column order.")}
 if(m.depth==null||(m.y==null&&m.date==null)||(m.m==null&&m.date==null))return{recs:[],warn:["Missing required column(s): depth, year, month (or date)."]};
 const map=new Map();let bad=0;
 body.forEach(r=>{let y=null,mo=null;
  if(m.y==null){const s=r[m.date]||"";let x;if(x=s.match(/(\d{4})[-\/](\d{1,2})/)){y=+x[1];mo=+x[2]}else if(x=s.match(/(\d{1,2})[-\/](\d{4})/)){mo=+x[1];y=+x[2]}else if(x=s.match(/([A-Za-z]{3})[a-z]*[\s\-,]*(\d{4})/)){mo=MON.indexOf(x[1].toLowerCase())+1;y=+x[2]}}
  else{y=numv(r[m.y]);const ms=r[m.m]||"";mo=/[a-z]/i.test(ms)?MON.indexOf(ms.slice(0,3).toLowerCase())+1:numv(ms)}
  const depth=numv(r[m.depth]);if(!(y>=1900&&y<=2100&&mo>=1&&mo<=12&&depth>0)){bad++;return}
  const d=m.d!=null&&r[m.d]?r[m.d]:"Uploaded";const st=m.s!=null?(r[m.s]||""):"",la=m.lat!=null?numv(r[m.lat]):null,lo=m.lon!=null?numv(r[m.lon]):null;map.set(st+"|"+d+"|"+y+"|"+mo,{d,s:st,lat:la,lon:lo,y,m:mo,depth,rain:m.rain!=null?numv(r[m.rain]):null,temp:m.temp!=null?numv(r[m.temp]):null})});
 const recs=[...map.values()];if(bad)warn.push(bad+" row(s) skipped (not valid data rows).");
 if(m.rain==null)warn.push("No rainfall column: monthly average rainfall will be filled in.");if(m.temp==null)warn.push("No temperature column: monthly average temperature will be filled in.");
 return{recs,warn}}
function loadPdfjs(){return new Promise((ok,no)=>{if(window.pdfjsLib)return ok();const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
 s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";ok()};s.onerror=()=>no(new Error("Could not load pdf.js. PDF upload needs an internet connection."));document.head.appendChild(s)})}
async function pdfToTable(file){await loadPdfjs();const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,table=[];
 for(let p=1;p<=pdf.numPages;p++){const tc=await(await pdf.getPage(p)).getTextContent(),lines=[];
  tc.items.forEach(it=>{const s=it.str.trim();if(!s)return;const y=it.transform[5],x=it.transform[4];let L=lines.find(l=>Math.abs(l.y-y)<3);if(!L){L={y,c:[]};lines.push(L)}L.c.push({x,s})});
  lines.sort((a,b)=>b.y-a.y).forEach(L=>{L.c.sort((a,b)=>a.x-b.x);let c=L.c.map(q=>q.s);if(c.length==1){const w=c[0].split(/\s{2,}|\t/);c=w.length>1?w:c[0].split(/\s+/)}table.push(c)})}
 return table}
let PENDING=null;
function showSrc(){const g=i=>document.getElementById(i),st=[...new Set(DISTRICTS.map(d=>d.s).filter(Boolean))];
 g("u_src").innerHTML=(DATA.length?`<b>Current data:</b> ${SRC.name} (${DATA.length} rows, ${DISTRICTS.length} district(s)${st.length?", "+st.join(", "):""}, ${YMIN}–${YMAX})`:"<b>No data loaded yet.</b> Upload a file to start.")+`<br><small>${MODE=="server"?"☁️ Saved on the server":"💾 Saved in this browser only (server not detected)"}</small>`;g("u_w").value=TH.w;g("u_c").value=TH.c}
function setFooter(){document.getElementById("foot").innerHTML=MODE=="server"?"☁️ <b>Saved on the server.</b> Your dataset and history are stored on this site's server under a private random session ID linked to this browser. Use “Remove data” on the Upload page to delete them.":"💾 <b>Server not detected.</b> Your data is kept in this browser only. Run <code>server.py</code> or deploy online to store it on a server."}
function showGate(){const g=i=>document.getElementById(i);g("nav").style.display="none";g("upload").classList.add("on");g("u_gate").style.display="block";["u_exp","u_reset","u_th"].forEach(i=>g(i).style.display="none")}
async function commit(){const R=PENDING.recs,key=r=>r.s+"|"+r.d,keys=[...new Set(R.map(key))],yrs=new Set(R.map(r=>r.y)),data=[];
 if(yrs.size<3||R.length<60)return alert("Need at least 3 years and 60 rows of data to train (found "+yrs.size+" years, "+R.length+" rows).");
 const districts=keys.map(k=>{const rs=R.filter(r=>key(r)==k),f=rs[0],K=KNOWN.find(x=>x.n.toLowerCase()==f.d.toLowerCase()&&(!f.s||x.s.toLowerCase()==f.s.toLowerCase())),la=rs.find(r=>r.lat!=null&&r.lon!=null);
  return{n:f.d+(f.s?` (${f.s})`:""),dn:f.d,s:f.s||(K?K.s:""),lat:la?la.lat:K?K.lat:null,lon:la?la.lon:K?K.lon:null,base:+mean(rs.map(r=>r.depth)).toFixed(2),tr:0}});
 keys.forEach((k,i)=>{const rs=R.filter(r=>key(r)==k).sort((a,b)=>a.y-b.y||a.m-b.m);let prev=rs[0].depth;rs.forEach(r=>{data.push({d:i,y:r.y,m:r.m-1,rain:r.rain==null?RAINCLIM[r.m-1]:r.rain,temp:r.temp==null?TEMPCLIM[r.m-1]:r.temp,depth:r.depth,prev});prev=r.depth})});
 const ds=data.map(r=>r.depth).sort((a,b)=>a-b),q=p=>ds[Math.floor(p*(ds.length-1))],th={w:+q(.4).toFixed(1),c:+q(.75).toFixed(1)};if(!(th.c>th.w))th.c=+(th.w+1).toFixed(1);
 try{await put("dataset",{districts,data,meta:{name:"Uploaded: "+PENDING.name,rows:data.length}});await put("th",th)}catch(e){return alert("Could not save data: "+e.message)}
 location.reload()}
function bindUpload(){const $=id=>document.getElementById(id);showSrc();
 $("u_file").onchange=async e=>{const f=e.target.files[0];if(!f)return;$("u_go").style.display="none";$("u_prev").innerHTML="";$("u_msg").textContent="Reading "+f.name+" ...";
  try{const t=/\.pdf$/i.test(f.name)?await pdfToTable(f):parseCSV(await f.text()),{recs,warn}=toRecords(t);
   $("u_msg").innerHTML=(recs.length?`✅ Found <b>${recs.length}</b> valid rows in <b>${new Set(recs.map(r=>r.d)).size}</b> district(s).`:"❌ No usable rows found.")+warn.map(w=>`<div class="alert">⚠ ${w}</div>`).join("");
   if(recs.length){$("u_prev").innerHTML="<table><tr><th>District<th>Year<th>Month<th>Rain<th>Temp<th>Depth</tr>"+recs.slice(0,8).map(r=>`<tr><td>${r.d}<td>${r.y}<td>${r.m}<td>${r.rain==null?"-":r.rain}<td>${r.temp==null?"-":r.temp}<td>${r.depth}`).join("")+"</table>";PENDING={recs,name:f.name};$("u_go").style.display="inline-block"}}
  catch(err){$("u_msg").innerHTML=`<div class="alert">❌ ${err.message}</div>`}};
 $("u_go").onclick=commit;$("u_reset").onclick=async()=>{if(confirm("Remove your data from the server/browser?")){await del("dataset");location.reload()}};

 const dl=(name,csv)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=name;a.click()};
 $("u_dl").onclick=()=>dl("groundwater_template.csv","District,State,Year,Month,Rainfall,Temperature,Depth,Latitude,Longitude\n");
 $("u_exp").onclick=()=>dl("groundwater_data.csv","District,State,Year,Month,Rainfall,Temperature,Depth,Latitude,Longitude\n"+DATA.map(r=>{const D=DISTRICTS[r.d];return[D.dn||D.n,D.s||"",r.y,r.m+1,r.rain,r.temp,r.depth,D.lat==null?"":D.lat,D.lon==null?"":D.lon].join(",")}).join("\n"));
 $("u_ths").onclick=()=>{const w=+$("u_w").value,c=+$("u_c").value;if(!(c>w&&w>0))return alert("Critical must be greater than Warning.");put("th",{w,c}).then(()=>location.reload())}}
if(typeof document!=="undefined"&&document.getElementById&&document.getElementById("u_file"))bindUpload();
