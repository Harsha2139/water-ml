const $=id=>document.getElementById(id),cls=d=>d<TH.w?"Normal":d<=TH.c?"Warning":"Critical",tag=c=>`<span class="tag ${c}">${c}</span>`;
const fill=(id,arr,sel)=>{$(id).innerHTML=arr.map((v,i)=>`<option value="${i}">${v}</option>`).join("");if(sel!=null)$(id).value=sel};
const rows=DATA,CUT=YMIN+Math.max(1,Math.floor(.73*YN)),train=rows.filter(r=>r.y<CUT),test=rows.filter(r=>r.y>=CUT);
const Xtr=train.map(feat),ytr=train.map(r=>r.depth),Xte=test.map(feat),yte=test.map(r=>r.depth);
const MODELS={"Linear Regression":new Linear(),"Decision Tree":new Tree(),"Random Forest":new Forest(),"XGBoost (Gradient Boosting)":new Boost()};
const RES={};let best;
for(const k in MODELS){MODELS[k].fit(Xtr,ytr);RES[k]=metrics(yte,Xte.map(x=>MODELS[k].predict(x)))}
best=Object.keys(RES).sort((a,b)=>RES[a].rmse-RES[b].rmse)[0];
const IMP=permImportance(MODELS[best],Xte,yte);
const avg=a=>a.reduce((s,v)=>s+v,0)/a.length,rd=(d,f=r=>true)=>rows.filter(r=>r.d==d&&f(r));
const CR=MONTHS.map((_,m)=>avg(rows.filter(r=>r.m==m).map(r=>r.rain))||0),CT=MONTHS.map((_,m)=>avg(rows.filter(r=>r.m==m).map(r=>r.temp))||0);
const slope=d=>{const p=YRS.map((y,i)=>[i,rd(d,r=>r.y==y).map(r=>r.depth)]).filter(x=>x[1].length).map(x=>[x[0],avg(x[1])]);if(p.length<2)return 0;const mx=avg(p.map(q=>q[0])),my=avg(p.map(q=>q[1]));return p.reduce((s,q)=>s+(q[0]-mx)*(q[1]-my),0)/p.reduce((s,q)=>s+(q[0]-mx)**2,0)};
const latest=d=>avg(rd(d).slice(-3).map(r=>r.depth));

// ---------- charts ----------
function setup(id){const c=$(id),r=c.getBoundingClientRect(),dp=devicePixelRatio||1;c.width=r.width*dp;c.height=r.height*dp;const g=c.getContext("2d");g.scale(dp,dp);g.clearRect(0,0,r.width,r.height);g.font="11px sans-serif";return[g,r.width,r.height]}
function frame(g,W,H,lo,hi,labels,step=1){const L=40,B=24,T=10;g.strokeStyle=cv("--grid");g.fillStyle=cv("--muted");for(let i=0;i<=4;i++){const y=T+(H-B-T)*i/4;g.beginPath();g.moveTo(L,y);g.lineTo(W-8,y);g.stroke();g.fillText((hi-(hi-lo)*i/4).toFixed(1),2,y+4)}
 labels.forEach((l,i)=>{if(i%step==0)g.fillText(l,L+(W-L-10)*(i+.5)/labels.length-8,H-6)});return{L,B,T}}
const cv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();const COL=["#4f46e5","#f59e0b","#06b6d4","#ec4899"];
function line(id,labels,series,step=1){const[g,W,H]=setup(id);series.forEach(s=>s.v=s.v.map(v=>Number.isFinite(v)?v:null));const all=series.flatMap(s=>s.v.filter(v=>v!=null));if(!all.length)return;let lo=Math.min(...all),hi=Math.max(...all);const p=(hi-lo)*.1||1;lo-=p;hi+=p;const f=frame(g,W,H,lo,hi,labels,step);
 series.forEach((s,k)=>{const c=s.c||COL[k],X=i=>f.L+(W-f.L-10)*(i+.5)/labels.length,Y=v=>f.T+(H-f.B-f.T)*(1-(v-lo)/(hi-lo));g.strokeStyle=c;g.lineWidth=2.5;g.lineJoin="round";g.setLineDash(s.dash?[6,5]:[]);g.beginPath();let st=false,fx=0,lx=0;
  s.v.forEach((v,i)=>{if(v==null)return;st?g.lineTo(X(i),Y(v)):(g.moveTo(X(i),Y(v)),fx=X(i));lx=X(i);st=true});g.stroke();g.setLineDash([]);
  if(!s.dash&&st){g.lineTo(lx,H-f.B);g.lineTo(fx,H-f.B);g.closePath();const gr=g.createLinearGradient(0,f.T,0,H-f.B);gr.addColorStop(0,c+"44");gr.addColorStop(1,c+"00");g.fillStyle=gr;g.fill()}
  g.fillStyle=c;g.beginPath();g.arc(50+k*130,16,4,0,6.3);g.fill();g.fillStyle=cv("--text");g.fillText(s.n,58+k*130,20)})}
function bar(id,labels,vals,colors){const[g,W,H]=setup(id);const hi=Math.max(...vals)*1.15||1,f=frame(g,W,H,0,hi,labels),w=(W-f.L-10)/labels.length;
 vals.forEach((v,i)=>{const h=(H-f.B-f.T)*v/hi,x=f.L+i*w+w*.18,y=H-f.B-h;g.fillStyle=colors?colors[i]:COL[0];g.beginPath();g.roundRect?g.roundRect(x,y,w*.64,h,[6,6,0,0]):g.rect(x,y,w*.64,h);g.fill();g.fillStyle=cv("--text");g.textAlign="center";g.fillText(v>=100?v.toFixed(0):v.toFixed(1),x+w*.32,y-4);g.textAlign="left"})}

// ---------- prediction ----------
function predictOne(d,m,rain,temp,prev,model){return MODELS[model].predict(feat({d,m,rain,temp,prev}))}
function doPredict(){const d=+$("p_d").value,m=+$("p_m").value,r=+$("p_r").value,t=+$("p_t").value,p=+$("p_p").value,mod=$("p_model").value;
 const v=predictOne(d,m,r,t,p,mod),c=cls(v);$("p_out").innerHTML=`<div>Predicted depth to water</div><div class="big">${v.toFixed(2)} m</div>${tag(c)} <small>(${mod})</small>`;
 whatif(d,m,t,p,r,mod);return{d,m,r,t,p,v,c,mod}}
const RMAX=Math.max(100,Math.ceil(rows.reduce((a,r)=>Math.max(a,r.rain),0)/50)*50);
function whatif(d,m,t,p,r0,mod){const xs=[...Array(26).keys()].map(i=>i*RMAX/25),names=Object.keys(MODELS),cols=["#4f46e5","#f59e0b","#06b6d4","#ec4899"],W=640,Hh=300,L=48,R=14,T=14,B=32;
 const ys=names.map(n=>xs.map(x=>predictOne(d,m,x,t,p,n))),flat=ys.flat();let lo=Math.min(...flat),hi=Math.max(...flat);const pd=Math.max((hi-lo)*.15,.3);lo-=pd;hi+=pd;
 const X=x=>L+(W-L-R)*x/RMAX,Y=v=>T+(Hh-T-B)*(1-(v-lo)/(hi-lo)),band=(a,b,c)=>{const y1=Y(Math.min(hi,b)),y2=Y(Math.max(lo,a));return y2>y1?`<rect x="${L}" y="${y1}" width="${W-L-R}" height="${y2-y1}" fill="${c}" opacity=".13"/>`:""};
 let s=`<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto;display:block;font-size:11px">`+band(-1e9,TH.w,"#16a34a")+band(TH.w,TH.c,"#f97316")+band(TH.c,1e9,"#e11d48");
 for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4,y=Y(v);s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" style="stroke:var(--grid)"/><text x="${L-6}" y="${y+4}" text-anchor="end" style="fill:var(--muted)">${v.toFixed(1)}</text>`}
 for(let x=0;x<=RMAX;x+=RMAX/5)s+=`<text x="${X(x)}" y="${Hh-14}" text-anchor="middle" style="fill:var(--muted)">${Math.round(x)}</text>`;
 s+=`<text x="${(L+W-R)/2}" y="${Hh-1}" text-anchor="middle" style="fill:var(--muted)">Rainfall (mm)</text><text x="12" y="${Hh/2}" transform="rotate(-90 12 ${Hh/2})" text-anchor="middle" style="fill:var(--muted)">Depth (m)</text>`;
 names.forEach((n,k)=>{s+=`<polyline fill="none" stroke="${cols[k]}" stroke-width="${n==mod?3.5:1.8}" opacity="${n==mod?1:.65}" stroke-linejoin="round" points="${xs.map((x,i)=>X(x)+","+Y(ys[k][i])).join(" ")}"/>`});
 const sel=names.indexOf(mod),vy=predictOne(d,m,r0,t,p,mod);s+=`<line x1="${X(r0)}" x2="${X(r0)}" y1="${T}" y2="${Hh-B}" stroke-dasharray="4 4" style="stroke:var(--muted)"/><circle cx="${X(r0)}" cy="${Y(vy)}" r="6" fill="${cols[sel]}" stroke="#fff" stroke-width="2"/></svg>`;
 const rng=Math.max(...ys[sel])-Math.min(...ys[sel]);
 $("c_what").innerHTML=s+`<div class="legend">${names.map((n,k)=>`<span class="dot" style="background:${cols[k]}"></span>${n}${n==mod?" (selected)":""}`).join(" ")}<br><span class="dot n"></span>Normal zone <span class="dot w"></span>Warning zone <span class="dot c"></span>Critical zone &nbsp;|&nbsp; Dashed line = current rainfall (${r0} mm)</div>`+(rng<.05?`<div class="alert">Rainfall has almost no effect on this model's prediction. Make sure your file has a real <b>rainfall</b> column, or try Linear Regression.</div>`:`<p class="sub">Selected model: rainfall 0→${RMAX} mm changes predicted depth by <b>${rng.toFixed(2)} m</b>.</p>`)}
function resetPrev(){$("p_p").value=latest(+$("p_d").value).toFixed(1)}
$("p_r").oninput=()=>{$("p_rv").textContent=$("p_r").value;doPredict()};
["p_d","p_m","p_model","p_t","p_p"].forEach(i=>$(i).onchange=()=>{if(i=="p_d")resetPrev();if(i=="p_m"){$("p_r").value=Math.round(CR[$("p_m").value]);$("p_t").value=(+CT[$("p_m").value]).toFixed(1);$("p_rv").textContent=$("p_r").value}doPredict()});
const H=()=>HIST,saveHist=()=>put("hist",HIST).catch(()=>alert("Could not save history"));
$("p_go").onclick=()=>{const o=doPredict();HIST.push({time:new Date().toLocaleString(),district:DISTRICTS[o.d].n,month:MONTHS[o.m],rain:o.r,temp:o.t,prev:o.p,model:o.mod,pred:o.v.toFixed(2),status:o.c});saveHist();renderHist();$("p_out").innerHTML+=`<div class="alert ok">\u2714 Saved to history (${HIST.length} saved)</div>`};
function renderHist(){const h=H();$("htab").innerHTML="<tr><th>Time<th>District<th>Month<th>Rain<th>Temp<th>Prev<th>Model<th>Predicted<th>Status</tr>"+h.map(r=>`<tr><td>${r.time}<td>${r.district}<td>${r.month}<td>${r.rain}<td>${r.temp}<td>${r.prev}<td>${r.model}<td>${r.pred}<td>${tag(r.status)}`).join("")+(h.length?"":"<tr><td colspan=9>No predictions yet. Open Predict and click \u201cPredict & save to history\u201d.")}
$("h_clear").onclick=()=>{HIST.length=0;saveHist();renderHist()};
$("h_dl").onclick=()=>{const h=H();if(!h.length)return alert("Save a prediction first");const csv=Object.keys(h[0]).join(",")+"\n"+h.map(r=>Object.values(r).join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="groundwater_prediction_report.csv";a.click()};

// ---------- pages ----------
function dash(){const ds=DISTRICTS.map((_,i)=>i),cr=ds.filter(i=>cls(latest(i))=="Critical").length,fall=ds.filter(i=>slope(i)>.2).length;
 $("cards").innerHTML=[["Districts",DISTRICTS.length],["Records",rows.length],["Avg depth now",avg(ds.map(latest)).toFixed(1)+" m"],["Critical districts",cr],["Falling-trend districts",fall],["Best model",best.split(" (")[0]+" (R² "+RES[best].r2.toFixed(2)+")"]].map(([a,b],i)=>`<div class="card"><span class="ic">${["🗺️","📑","💧","🚨","📉","🏆"][i]}</span>${a}<b>${b}</b></div>`).join("");
 const yrs=YRS;line("c_dash",yrs.map(String),[{n:"Avg depth",v:yrs.map(y=>avg(rows.filter(r=>r.y==y).map(r=>r.depth)))}]);
 $("alerts").innerHTML=ds.map(i=>({i,s:slope(i)})).sort((a,b)=>b.s-a.s).map(({i,s})=>s>.2?`<div class="alert">⚠ <b>${DISTRICTS[i].n}</b>: water table falling ${s.toFixed(2)} m/year (now ${latest(i).toFixed(1)} m)</div>`:`<div class="alert ok">✔ <b>${DISTRICTS[i].n}</b>: stable (${s.toFixed(2)} m/year)</div>`).join("")}
function trends(){const d=+$("t_d").value,yrs=YRS,s=slope(d);
 line("c_year",yrs.map(String),[{n:DISTRICTS[d].n,v:yrs.map(y=>avg(rd(d,r=>r.y==y).map(r=>r.depth)))}]);
 const rr=rd(d);line("c_month",rr.map(r=>r.m==0?r.y:""),[{n:"Depth (m)",v:rr.map(r=>r.depth)}],1)}
function hist(){const d=+$("t_d").value,a=+$("h_a").value,b=+$("h_b").value;line("c_hist",MONTHS,[a,b].map((y,k)=>({n:String(y),v:MONTHS.map((_,m)=>{const q=rd(d,r=>r.y==y&&r.m==m)[0];return q?q.depth:null})})))}
function rain(){const d=+$("r_d").value;const mr=MONTHS.map((_,m)=>avg(rd(d,r=>r.m==m).map(r=>r.rain))),md=MONTHS.map((_,m)=>avg(rd(d,r=>r.m==m).map(r=>r.depth)));
 bar("c_rain",MONTHS,mr);line("c_rdepth",MONTHS,[{n:"Depth",v:md}]);
 const R=rd(d),mx=avg(R.map(r=>r.rain)),my=avg(R.map(r=>r.depth));let cv=0,vx=0,vy=0;R.forEach(r=>{cv+=(r.rain-mx)*(r.depth-my);vx+=(r.rain-mx)**2;vy+=(r.depth-my)**2});const cr=cv/Math.sqrt(vx*vy);
 const wet=[9,10,11],dry=[1,2,3];const seas=(a)=>avg(rd(d,r=>a.includes(r.m)).map(r=>r.depth));
 $("r_txt").innerHTML=`Correlation (rainfall vs depth): <b>${cr.toFixed(2)}</b>. Negative = more rain, shallower water table. NE-monsoon (Oct–Dec) avg depth <b>${seas(wet).toFixed(1)} m</b> vs dry season (Feb–Apr) <b>${seas(dry).toFixed(1)} m</b>.`}
function dsel(){const v=$("d_state").value;return DISTRICTS.map((_,i)=>i).filter(i=>v==""||DISTRICTS[i].s==v)}
function dists(){const ix=dsel(),states=[...new Set(ix.map(i=>DISTRICTS[i].s).filter(Boolean))],C={Normal:"#16a34a",Warning:"#f97316",Critical:"#e11d48"},nm=i=>DISTRICTS[i].dn||DISTRICTS[i].n;
 $("map_t").textContent="Groundwater risk map — "+(states.join(", ")||"your districts");
 bar("c_dist",ix.map(i=>nm(i).slice(0,8)),ix.map(latest),ix.map(i=>C[cls(latest(i))]));
 const geo=ix.length>0&&ix.every(i=>DISTRICTS[i].lat!=null&&DISTRICTS[i].lon!=null);let pos;
 if(geo){const la=ix.map(i=>DISTRICTS[i].lat),lo=ix.map(i=>DISTRICTS[i].lon),a=Math.min(...la),b=Math.max(...la),c=Math.min(...lo),e=Math.max(...lo),cl=Math.cos((a+b)/2*Math.PI/180),k=230/Math.max(b-a,(e-c)*cl,.3),ox=150-(e-c)*cl*k/2,oy=165-(b-a)*k/2;pos=ix.map(i=>[ox+(DISTRICTS[i].lon-c)*cl*k,oy+(b-DISTRICTS[i].lat)*k])}
 else{const n=Math.ceil(Math.sqrt(ix.length||1)),cw=260/n;pos=ix.map((_,j)=>[20+cw*(j%n)+cw/2,30+cw*Math.floor(j/n)+cw/2])}
 $("map").innerHTML='<rect width="300" height="330" rx="12" style="fill:var(--mapbg)"/>'+ix.map((i,j)=>{const[x,y]=pos[j],r=geo?7+Math.min(latest(i),10):Math.min(20,8+latest(i)*.8);return`<circle cx="${x}" cy="${y}" r="${r}" fill="${C[cls(latest(i))]}" opacity=".65"/><text x="${x}" y="${y+r+10}" font-size="9" text-anchor="middle" style="fill:var(--text)">${nm(i)}</text>`}).join("");
 $("map_n").textContent=geo?"Positions come from the latitude/longitude in your file (or known district coordinates).":"Your file has no coordinates for these districts, so they are shown as tiles. Add latitude and longitude columns for a geographic map.";
 $("dtab").innerHTML="<tr><th>District<th>State<th>Depth now (m)<th>Trend (m/yr)<th>Status</tr>"+ix.map(i=>`<tr><td>${nm(i)}<td>${DISTRICTS[i].s||"—"}<td>${latest(i).toFixed(2)}<td>${slope(i).toFixed(2)}<td>${tag(cls(latest(i)))}`).join("")}
function modelsPage(){const k=Object.keys(RES);$("mtab").innerHTML="<tr><th>Model<th>MAE<th>RMSE<th>R²</tr>"+k.map(n=>`<tr><td>${n}${n==best?" 🏆":""}<td>${RES[n].mae.toFixed(3)}<td>${RES[n].rmse.toFixed(3)}<td>${RES[n].r2.toFixed(3)}`).join("");
 bar("c_r2",k.map(n=>n.split(" ")[0]),k.map(n=>Math.max(0,RES[n].r2)));bar("c_imp",FEATS.map(f=>f.slice(0,9)),IMP)}
function forecast(){const d=+$("f_d").value,n=+$("f_n").value;let prev=rd(d).slice(-1)[0].depth,out=[];const last=rd(d).slice(-1)[0],drift=slope(d)/12*0;
 for(let i=1;i<=n;i++){const m=(last.m+i)%12;prev=MODELS[best].predict(feat({d,m,rain:CR[m],temp:CT[m],prev}));out.push(prev)}
 const hist=rd(d).slice(-24).map(r=>r.depth),lab=[...hist.map((_,i)=>"")].concat(out.map((_,i)=>MONTHS[(last.m+i+1)%12]));
 line("c_fc",lab,[{n:"History",v:hist.concat(out.map(()=>null))},{n:"Forecast",v:hist.map((_,i)=>i==hist.length-1?hist[i]:null).concat(out),c:"#d63c3c",dash:1}]);
 $("f_txt").innerHTML=`In ${n} months ${DISTRICTS[d].n} is forecast at <b>${out[n-1].toFixed(2)} m</b> ${tag(cls(out[n-1]))}. Max over period: ${Math.max(...out).toFixed(2)} m. (Uses ${best} with climatological rainfall/temperature.)`}
function recs(){$("recs").innerHTML=DISTRICTS.map((D,i)=>{const c=cls(latest(i)),s=slope(i),t=[];
 if(c=="Critical")t.push("Restrict new borewells and cap agricultural extraction","Mandatory rooftop rainwater harvesting");else if(c=="Warning")t.push("Promote drip/sprinkler irrigation","Desilt tanks and ponds before the NE monsoon");else t.push("Maintain current recharge structures");
 if(s>.2)t.push("Falling trend: build check dams, percolation ponds and recharge wells");if(s<=.2)t.push("Trend stable: continue monitoring monthly");
 return`<div class="box"><b>${D.n}</b> ${tag(c)} <small>(${s.toFixed(2)} m/yr)</small><ul>${t.map(x=>`<li>${x}`).join("")}</ul></div>`}).join("")}

// ---------- init ----------
const PAGES={dash:["📊 Dashboard",dash],pred:["🔮 Predict",doPredict],trend:["📈 Trends",()=>{trends();hist()}],rain:["🌧️ Rainfall",rain],dist:["🗺️ Districts & Map",dists],models:["🤖 Models",modelsPage],fc:["⏳ Forecast",forecast],upload:["⬆️ Upload Data",()=>showSrc()],rec:["💡 Advice",recs],hist:["🕘 History",renderHist]};
$("nav").innerHTML=Object.keys(PAGES).map(k=>`<button data-k="${k}">${PAGES[k][0]}</button>`).join("");
function show(k){document.querySelectorAll("section").forEach(s=>s.classList.toggle("on",s.id==k));document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.k==k));PAGES[k][1]()}
$("nav").onclick=e=>e.target.dataset.k&&show(e.target.dataset.k);
const dn=DISTRICTS.map(d=>d.n),yrs=YRS;
["p_d","t_d","r_d","f_d"].forEach(i=>fill(i,dn,0));fill("p_m",MONTHS,new Date().getMonth());$("p_model").innerHTML=Object.keys(MODELS).map(n=>`<option value="${n}">${n}</option>`).join("");$("p_model").value=best;
["h_a","h_b"].forEach(i=>$(i).innerHTML=YRS.map(y=>`<option value="${y}">${y}</option>`).join(""));$("h_a").value=YMIN;$("h_b").value=YMAX;
$("p_r").value=Math.round(CR[$("p_m").value]);$("p_t").value=(+CT[$("p_m").value]).toFixed(1);$("p_rv").textContent=$("p_r").value;resetPrev();
$("t_d").onchange=()=>{trends();hist()};["h_a","h_b"].forEach(i=>$(i).onchange=hist);$("r_d").onchange=rain;$("f_d").onchange=forecast;$("f_n").onchange=forecast;
const sts=[...new Set(DISTRICTS.map(d=>d.s).filter(Boolean))];$("d_state").innerHTML='<option value="">All states</option>'+sts.map(x=>`<option>${x}</option>`).join("");$("d_state").parentNode.style.display=sts.length?"":"none";$("d_state").onchange=dists;
addEventListener("resize",()=>show(document.querySelector("section.on").id));show("dash");
