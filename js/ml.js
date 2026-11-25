// Tiny ML library: Linear (ridge), Decision Tree, Random Forest, Gradient Boosting (XGBoost-style)
const FEATS=["Rainfall","Temperature","Previous depth","Month (sin)","Month (cos)","District base","Latitude"];
function feat(r){const D=DISTRICTS[r.d];return[r.rain,r.temp,r.prev,Math.sin(6.283*r.m/12),Math.cos(6.283*r.m/12),D.base,D.lat==null?0:D.lat]}
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function metrics(y,p){const m=mean(y);let a=0,s=0,t=0;y.forEach((v,i)=>{a+=Math.abs(v-p[i]);s+=(v-p[i])**2;t+=(v-m)**2});return{mae:a/y.length,rmse:Math.sqrt(s/y.length),r2:1-s/t}}
class Linear{fit(X,y){const n=X[0].length;this.mu=[],this.sd=[];for(let j=0;j<n;j++){const c=X.map(r=>r[j]);this.mu[j]=mean(c);this.sd[j]=Math.sqrt(mean(c.map(v=>(v-this.mu[j])**2)))||1}
 const Z=X.map(r=>[1,...r.map((v,j)=>(v-this.mu[j])/this.sd[j])]),k=n+1,A=Array.from({length:k},(_,i)=>Array(k+1).fill(0));
 Z.forEach((z,r)=>{for(let i=0;i<k;i++){for(let j=0;j<k;j++)A[i][j]+=z[i]*z[j];A[i][k]+=z[i]*y[r]}});for(let i=1;i<k;i++)A[i][i]+=1;
 for(let i=0;i<k;i++){let p=i;for(let r=i+1;r<k;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];for(let r=0;r<k;r++)if(r!=i){const f=A[r][i]/A[i][i];for(let c=i;c<=k;c++)A[r][c]-=f*A[i][c]}}
 this.w=A.map((r,i)=>r[k]/r[i]);return this}
 predict(x){return this.w[0]+x.reduce((s,v,j)=>s+this.w[j+1]*(v-this.mu[j])/this.sd[j],0)}}
function grow(X,y,idx,d,maxD,mtry){const mu=mean(idx.map(i=>y[i]));if(d>=maxD||idx.length<10)return{v:mu};
 let best=null,nf=X[0].length;const fs=[...Array(nf).keys()].sort(()=>rnd()-.5).slice(0,mtry||nf);
 for(const f of fs)for(let q=0;q<10;q++){const t=X[idx[Math.floor(rnd()*idx.length)]][f];let ls=0,ln=0,rs=0,rn=0,l2=0,r2=0;
  for(const i of idx){const v=y[i];if(X[i][f]<=t){ls+=v;ln++;l2+=v*v}else{rs+=v;rn++;r2+=v*v}}
  if(ln<4||rn<4)continue;const sse=l2-ls*ls/ln+r2-rs*rs/rn;if(!best||sse<best.s)best={s:sse,f,t}}
 if(!best)return{v:mu};const L=idx.filter(i=>X[i][best.f]<=best.t),R=idx.filter(i=>X[i][best.f]>best.t);
 return{f:best.f,t:best.t,l:grow(X,y,L,d+1,maxD,mtry),r:grow(X,y,R,d+1,maxD,mtry)}}
const walk=(n,x)=>n.f===undefined?n.v:walk(x[n.f]<=n.t?n.l:n.r,x);
class Tree{constructor(md=7){this.md=md}fit(X,y){this.t=grow(X,y,X.map((_,i)=>i),0,this.md);return this}predict(x){return walk(this.t,x)}}
class Forest{constructor(n=30,md=8){this.n=n;this.md=md}fit(X,y){this.ts=[];for(let k=0;k<this.n;k++){const idx=X.map(()=>Math.floor(rnd()*X.length));this.ts.push(grow(X,y,idx,0,this.md,4))}return this}predict(x){return mean(this.ts.map(t=>walk(t,x)))}}
class Boost{constructor(n=60,lr=.12,md=3){this.n=n;this.lr=lr;this.md=md}fit(X,y){this.b=mean(y);let r=y.map(v=>v-this.b);this.ts=[];
 for(let k=0;k<this.n;k++){const t=grow(X,r,X.map((_,i)=>i),0,this.md);this.ts.push(t);r=r.map((v,i)=>v-this.lr*walk(t,X[i]))}return this}
 predict(x){return this.ts.reduce((s,t)=>s+this.lr*walk(t,x),this.b)}}
function permImportance(model,X,y){const base=metrics(y,X.map(x=>model.predict(x))).rmse;
 return FEATS.map((_,j)=>{let tot=0;for(let rep=0;rep<3;rep++){const col=X.map(x=>x[j]).sort(()=>rnd()-.5);const p=X.map((x,i)=>{const z=x.slice();z[j]=col[i];return model.predict(z)});tot+=metrics(y,p).rmse-base}return Math.max(0,tot/3)})}
