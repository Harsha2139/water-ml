// No built-in data. Your dataset is stored on the server (server.py) or, if no server is found, in this browser.
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let seed=42;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}  // model randomness only
// Optional coordinate lookup (Tamil Nadu). Any other state: add latitude/longitude columns to your file.
const KNOWN=[["Chengalpattu",12.69,79.98],["Chennai",13.08,80.27],["Coimbatore",11.0,76.96],["Madurai",9.92,78.12],["Tiruchirappalli",10.8,78.69],["Salem",11.66,78.15],["Tirunelveli",8.73,77.7],["Thanjavur",10.79,79.14],["Kanchipuram",12.83,79.7],["Vellore",12.92,79.13],["Tiruvallur",13.14,79.91],["Erode",11.34,77.72],["Tiruppur",11.11,77.34],["Kanyakumari",8.18,77.43],["Cuddalore",11.75,79.77],["Villupuram",11.94,79.49],["Dindigul",10.37,77.98],["Thoothukudi",8.76,78.13],["Ramanathapuram",9.37,78.83],["Nagapattinam",10.77,79.84],["Namakkal",11.22,78.17],["Karur",10.96,78.08],["Dharmapuri",12.13,78.16],["Krishnagiri",12.52,78.21],["Pudukkottai",10.38,78.82],["Sivaganga",9.85,78.48],["Virudhunagar",9.59,77.96],["Theni",10.01,77.48],["Tiruvannamalai",12.23,79.07],["Ariyalur",11.14,79.08],["Perambalur",11.23,78.88],["Tenkasi",8.96,77.31],["Ranipet",12.93,79.33],["Tirupathur",12.5,78.57],["Kallakurichi",11.74,78.96],["Mayiladuthurai",11.1,79.65],["Nilgiris",11.41,76.7],["Tiruvarur",10.77,79.64]].map(a=>({n:a[0],s:"Tamil Nadu",lat:a[1],lon:a[2]}));
// Typical monthly values, used ONLY to fill a rainfall/temperature column missing from your file
const RAINCLIM=[25,10,12,25,55,45,70,100,120,260,300,130],TEMPCLIM=[26,27.5,29.5,32,33.5,32,31,30.5,30,28.5,27,26];
const DISTRICTS=[],DATA=[];let SRC={name:"No data loaded",rows:0},TH={w:10,c:14},HIST=[],YMIN=0,YMAX=0,YN=0,YRS=[],MODE="browser";
const SID=(()=>{try{let s=localStorage.getItem("gwsid");if(!/^[a-f0-9]{32}$/.test(s||"")){s=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("gwsid",s)}return s}catch(e){return "0".repeat(32)}})();
async function api(method,path,body){const r=await fetch("/api/"+path,{method,headers:{"X-Session":SID,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error("Server error "+r.status);return r.json()}
const LS=()=>{try{return JSON.parse(localStorage.getItem("gwstate")||"{}")}catch(e){return{}}};
async function put(k,v){if(MODE=="server")return api("PUT",k,v);const s=LS();s[k]=v;localStorage.setItem("gwstate",JSON.stringify(s))}
async function del(k){if(MODE=="server")return api("DELETE",k);const s=LS();delete s[k];localStorage.setItem("gwstate",JSON.stringify(s))}
function applyStore(s){s=s||{};DISTRICTS.length=0;DATA.length=0;SRC={name:"No data loaded",rows:0};
 if(s.dataset&&s.dataset.data){s.dataset.districts.forEach(d=>DISTRICTS.push(d));s.dataset.data.forEach(r=>DATA.push(r));SRC=s.dataset.meta}
 TH=s.th||{w:10,c:14};HIST=s.hist||[];
 YMIN=DATA.reduce((a,r)=>Math.min(a,r.y),9999);YMAX=DATA.reduce((a,r)=>Math.max(a,r.y),0);YN=DATA.length?YMAX-YMIN+1:0;YRS=[...Array(YN).keys()].map(i=>YMIN+i)}
async function loadStore(){try{const c=new AbortController();setTimeout(()=>c.abort(),2500);const r=await fetch("/api/ping",{signal:c.signal});if(!r.ok)throw 0;MODE="server";applyStore(await api("GET","state"))}
 catch(e){MODE="browser";applyStore(LS())}}
