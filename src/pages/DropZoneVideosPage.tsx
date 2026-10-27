// src/pages/DropZoneVideosPage.tsx
import React, { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const DropZoneVideosPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      // ✅ 1. VÉRIFICATION DU STATUT PREMIUM
      let isPremium = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', session.user.id).single();
          if (profile && profile.is_premium === true) {
            isPremium = true;
          }
        }
      } catch (err) {
        console.error("Erreur vérification premium:", err);
      }

      // ✅ 2. SI NON PREMIUM, ON AFFICHE LE MUR
      if (!isPremium) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="min-height: 100vh; background: #050a10; background-image: radial-gradient(circle at 50% 0%, #0a1f33 0%, #050a10 70%); display: flex; align-items: center; justify-content: center; font-family: 'Rajdhani', sans-serif; padding: 20px;">
              <div style="background: rgba(10,18,26,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(0,217,255,0.3); padding: 48px; border-radius: 16px; text-align: center; max-width: 600px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(0,217,255,0.1);">
                <div style="font-size: 60px; margin-bottom: 20px;">🔒</div>
                <h2 style="color: #fff; font-size: 28px; margin-bottom: 16px; font-family: 'Orbitron', sans-serif; font-weight: 800;">Débloquez le pouvoir de <span style="color: #00d9ff;">l'IA</span></h2>
                <p style="color: #8c9f98; font-size: 16px; margin-bottom: 32px; line-height: 1.6;">Transformez vos musiques en clips vidéo époustouflants. Cette fonctionnalité exclusive est réservée aux membres <b style="color: #fff;">DropZone Premium</b>.</p>
                
                <div style="display: flex; flex-direction: column; gap: 16px; text-align: left; margin-bottom: 40px;">
                  <div style="display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 24px;">🎬</div>
                    <div>
                      <strong style="color: #fff; display: block; font-size: 15px; margin-bottom: 4px;">Génération de clips illimitée</strong>
                      <span style="color: #8c9f98; font-size: 13px;">Créez des vidéos à partir de simples descriptions.</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 24px;">🎨</div>
                    <div>
                      <strong style="color: #fff; display: block; font-size: 15px; margin-bottom: 4px;">Utilisez vos propres visages</strong>
                      <span style="color: #8c9f98; font-size: 13px;">Importez des photos de référence pour personnaliser vos clips.</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 24px;">⚡</div>
                    <div>
                      <strong style="color: #fff; display: block; font-size: 15px; margin-bottom: 4px;">Accès prioritaire</strong>
                      <span style="color: #8c9f98; font-size: 13px;">Ne faites plus la queue derrière les utilisateurs gratuits.</span>
                    </div>
                  </div>
                </div>
                
                <a href="/settings" style="display: inline-flex; align-items: center; justify-content: center; gap: 12px; background: linear-gradient(90deg, #0077ff, #00d9ff); color: #000; padding: 18px 40px; border-radius: 8px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; box-shadow: 0 8px 20px rgba(0,217,255,0.3); transition: all 0.2s; border: none; cursor: pointer;">
                  Devenir Premium <span style="font-size: 20px;">→</span>
                </a>
                <p style="color: #8c9f98; font-size: 14px; margin-top: 20px;">À partir de <b style="color: #00d9ff; font-size: 18px;">30 € / an</b> — Moins de 2,50 € par mois.</p>
              </div>
            </div>
          `;
        }
        return;
      }

      // ✅ 3. SI PREMIUM, ON CHARGE L'OUTIL (Code complet de l'IA)
      (window as any).supabaseClient = supabase;

      const style = document.createElement('style');
      style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
        
        .dz-videos-wrapper { background: #050a10; background-image: radial-gradient(circle at 50% 0%, #0a1f33 0%, #050a10 70%); min-height: 100vh; padding-bottom: 70px; position: relative; width: 100%; font-family: 'Rajdhani', system-ui, sans-serif; color: #fff; overflow-x: hidden; }
        .dz-videos-wrapper::before { content: ""; position: fixed; inset: 0; z-index: 0; background-image: linear-gradient(rgba(0, 217, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; }
        .dz-videos-wrapper header { position: relative; z-index: 10; background: rgba(5, 10, 16, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 217, 255, 0.2); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .dz-videos-wrapper .logo { font: 800 22px 'Orbitron'; letter-spacing: .1em; color: #fff; display: flex; align-items: center; gap: 10px; }
        .dz-videos-wrapper .logo b { color: #00d9ff; text-shadow: 0 0 10px rgba(0,217,255,0.5); }
        .dz-videos-wrapper main { position: relative; z-index: 10; max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
        .dz-videos-wrapper .hero { background: rgba(10, 18, 26, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(0, 217, 255, 0.2); padding: 32px; margin-bottom: 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,217,255,0.05); position: relative; overflow: hidden; }
        .dz-videos-wrapper .hero::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #00d9ff, transparent); opacity: 0.5; }
        .dz-videos-wrapper h2 { font: 600 26px 'Orbitron'; letter-spacing: .04em; margin: 8px 0 16px; color: #fff; }
        .dz-videos-wrapper h2 b { color: #00d9ff; }
        .dz-videos-wrapper p.sub { color: #8c9f98; margin-bottom: 20px; max-width: 780px; font-size: 1.1rem; }
        .dz-videos-wrapper .guide { color: #8c9f98; font-size: 1rem; margin-bottom: 20px; }
        .dz-videos-wrapper .lab { font: 11px 'Share Tech Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: #00d9ff; display: block; margin-bottom: 8px; }
        .dz-videos-wrapper textarea { width: 100%; font: 14px 'Share Tech Mono', monospace; padding: 12px; border: 1px solid rgba(0, 217, 255, 0.2); background: rgba(0,0,0,0.3); color: #fff; outline: 0; border-radius: 6px; resize: vertical; min-height: 80px; transition: all 0.3s; }
        .dz-videos-wrapper textarea:focus { border-color: #00d9ff; background: rgba(0, 217, 255, 0.05); box-shadow: 0 0 10px rgba(0,217,255,0.2); }
        .dz-videos-wrapper button, .dz-videos-wrapper .btn { font: 600 12px 'Share Tech Mono', monospace; letter-spacing: .1em; text-transform: uppercase; padding: 12px 20px; border: 1px solid rgba(0, 217, 255, 0.4); background: rgba(0,0,0,0.4); color: #00d9ff; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .dz-videos-wrapper button:hover:not(:disabled), .dz-videos-wrapper .btn:hover { background: rgba(0, 217, 255, 0.1); color: #fff; border-color: #00d9ff; box-shadow: 0 0 15px rgba(0, 217, 255, 0.3); }
        .dz-videos-wrapper button:disabled { opacity: .35; cursor: not-allowed; }
        .dz-videos-wrapper .big { background: linear-gradient(90deg, #0077ff, #00d9ff); border: none; color: #000; padding: 14px 32px; font-size: 14px; font-weight: 800; letter-spacing: .16em; box-shadow: 0 4px 15px rgba(0, 217, 255, 0.3); }
        .dz-videos-wrapper .big:hover:not(:disabled) { background: linear-gradient(90deg, #00d9ff, #0077ff); box-shadow: 0 6px 20px rgba(0, 217, 255, 0.5); color: #000; }
        .dz-videos-wrapper .ft { display: flex; justify-content: space-between; gap: 10px; margin-top: 30px; flex-wrap: wrap; align-items: center; }
        .dz-videos-wrapper .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
        .dz-videos-wrapper .cd { border: 1px solid rgba(255,255,255,0.1); background: rgba(10, 18, 26, 0.6); backdrop-filter: blur(10px); padding: 16px; border-radius: 8px; transition: transform 0.2s; }
        .dz-videos-wrapper .cd:hover { border-color: rgba(0, 217, 255, 0.4); transform: translateY(-2px); }
        .dz-videos-wrapper .cd p { color: #fff; font-size: 1rem; margin-bottom: 8px; line-height: 1.4; }
        .dz-videos-wrapper .cd .lab { color: #8c9f98; margin-bottom: 4px; }
        .dz-videos-wrapper .tl { border: 1px solid rgba(255,255,255,0.1); background: rgba(10, 18, 26, 0.6); border-radius: 8px; overflow: hidden; transition: border-color 0.3s; }
        .dz-videos-wrapper .tl:hover { border-color: #00d9ff; }
        .dz-videos-wrapper .th { position: relative; background: #000; overflow: hidden; aspect-ratio: 16/9; }
        .dz-videos-wrapper .th img, .dz-videos-wrapper .th video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
        .dz-videos-wrapper .tg { position: absolute; top: 8px; left: 8px; z-index: 2; font: 11px 'Share Tech Mono', monospace; background: #00d9ff; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        .dz-videos-wrapper .preview-row { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
        .dz-videos-wrapper .preview-img { width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,217,255,0.3); }
        .dz-videos-wrapper .feed { margin: 10px 0; font-family: 'Share Tech Mono', monospace; max-height: 250px; overflow-y: auto; padding-right: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 12px; }
        .dz-videos-wrapper .feed::-webkit-scrollbar { width: 8px; }
        .dz-videos-wrapper .feed::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .dz-videos-wrapper .fi { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); font-size: 13px; color: #ddd; }
        .dz-videos-wrapper .fi:last-child { border-bottom: none; }
        .dz-videos-wrapper .fi .fi-icon { width: 16px; height: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .dz-videos-wrapper .fi.ok .fi-icon { color: #12b76a; }
        .dz-videos-wrapper .fi.er .fi-icon { color: #ff4444; }
        .dz-videos-wrapper .fi.wr .fi-icon { color: #ffbb00; }
        .dz-videos-wrapper .fi.in .fi-icon { color: #00d9ff; }
        .dz-videos-wrapper .fi .fi-text { flex: 1; line-height: 1.4; }
        .dz-videos-wrapper .fi .fi-time { font-size: 11px; color: #555; margin-left: auto; white-space: nowrap; }
        .dz-videos-wrapper .progress-bar { width: 100%; height: 6px; background: #111; border-radius: 3px; overflow: hidden; margin-top: 16px; border: 1px solid #222; }
        .dz-videos-wrapper .progress-fill { height: 100%; background: linear-gradient(90deg, #0077ff, #00d9ff); transition: width 0.3s ease; }
        .dz-videos-wrapper #pl { position: fixed; inset: 0; background: #000; z-index: 9999; display: none; align-items: center; justify-content: center; }
        .dz-videos-wrapper #pl.on { display: flex; }
        .dz-videos-wrapper #pv { max-width: 100vw; max-height: 100vh; position: absolute; transition: opacity 1s ease-in-out; opacity: 0; }
        .dz-videos-wrapper #pv.on { opacity: 1; }
        .dz-videos-wrapper #sub { position: absolute; left: 5%; right: 5%; bottom: 7%; text-align: center; color: #fff; font: 600 24px/1.3 'Rajdhani'; text-shadow: 0 2px 10px #000; z-index: 2; }
        .dz-videos-wrapper #pl button { position: absolute; top: 20px; right: 20px; z-index: 3; border-color: rgba(255,255,255,0.3); color: #fff; }
        .dz-videos-wrapper #con { position: fixed; bottom: 0; left: 0; right: 0; background: #020202; border-top: 1px solid #00d9ff; color: #00d9ff; z-index: 1000; display: none; font-family: 'Share Tech Mono', monospace; }
        .dz-videos-wrapper #con > div:first-child { display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #1a1a1a; font-size: 12px; background: #0a0a0a; }
        .dz-videos-wrapper #con button { padding: 2px 8px; border: 1px solid #333; color: #fff; background: transparent; cursor: pointer; }
        .dz-videos-wrapper #lb { max-height: 250px; overflow-y: auto; padding: 16px; font-size: 12px; line-height: 1.6; }
        .dz-videos-wrapper #toast { position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; }
      `;
      document.head.appendChild(style);

      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="dz-videos-wrapper">
            <header><div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>DROPZONE <b>IA VIDEOS</b></div><div class="hb"><button data-a="con">Journal</button></div></header>
            <main id="main"></main>
            <div id="con"><div><span>JOURNAL TECHNIQUE</span><button data-a="con">✕</button></div><div id="lb"></div></div>
            <div id="toast"></div>
            <div id="pl"><video id="pv" playsinline></video><audio id="pa" preload="auto"></audio><div id="sub"></div><button data-a="stopplay">✕ Quitter</button></div>
          </div>
        `;
      }

      // ✅ SCRIPT COMPLET DE L'OUTIL IA
      const scriptContent = `
        setTimeout(async () => {
          const API='https://apihub.agnes-ai.com/v1',POLL='https://apihub.agnes-ai.com/agnesapi';
          const TXT=['agnes-3.0-flash','agnes-2.5-flash'],IMG='agnes-image-2.5-flash',VID='agnes-video-2.5-flash';
          const RPM={free:{img:10,vid:1,txt:10},plan:{img:100,vid:5,txt:600}};
          const $=s=>document.querySelector(s);
          const sleep=ms=>new Promise(r=>setTimeout(r,ms));
          const uid=()=>Math.random().toString(36).slice(2,9);
          const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
          const san=t=>String(t==null?'':t).replace(/[‘’]/g,"'").replace(/[“”«»]/g,'"').replace(/[–—]/g,'-').replace(/[…]/g,'...');
          const btn=(a,l,c,x)=>'<button class="'+(c||'')+'" data-a="'+a+'" '+(x||'')+'>'+l+'</button>';
          let db,P=null,page=0,F=1,playing=false,TASK=null;
          const KEYS={list:[],plan:'free'};
          const mkKey=k=>({k,img:0,vid:0,txt:0,cool:0,bad:0,off:false});

          function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('cineclip_v1',1);r.onerror=()=>rej(r.error);r.onsuccess=()=>res(r.result);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('sessions'))d.createObjectStore('sessions',{keyPath:'id'});if(!d.objectStoreNames.contains('config'))d.createObjectStore('config',{keyPath:'key'})}})}
          const tx=(s,m,f)=>new Promise((res,rej)=>{try{const r=f(db.transaction(s,m).objectStore(s));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
          async function dbGet(s,k){if(db){try{return await tx(s,'readonly',o=>o.get(k))}catch(e){}}return mem[s][k]}
          async function dbPut(s,v){const k=v.key||v.id;mem[s][k]=v;if(db){try{return await tx(s,'readwrite',o=>o.put(v))}catch(e){}}}
          const mem={sessions:{},config:{}};
          let svT;
          function save(){if(!P)return;clearTimeout(svT);svT=setTimeout(()=>{P.upd=Date.now();const toSave=JSON.parse(JSON.stringify(P));if(toSave.shots)toSave.shots.forEach(s=>{if(s.img)delete s.img._conv});dbPut('sessions',toSave)},350)}

          function log(l,m){
            const d=document.createElement('div');
            d.className='fi '+l;
            let icon='•';
            if(l==='ok')icon='✓';
            if(l==='er')icon='✕';
            if(l==='wr')icon='⚠';
            if(l==='in')icon='ℹ';
            d.innerHTML='<span class="fi-icon">'+icon+'</span><span class="fi-text">'+esc(m)+'</span><span class="fi-time">'+new Date().toLocaleTimeString('fr-FR')+'</span>';
            const b=$('#lb');
            if(!b)return;
            b.appendChild(d);
            b.scrollTop=b.scrollHeight;
          }
          function toast(m){const d=document.createElement('div');d.textContent=m;d.style.cssText='background:rgba(0,217,255,0.1);color:#00d9ff;border:1px solid #00d9ff;padding:10px 16px;border-radius:6px;font:14px Rajdhani;box-shadow:0 0 10px rgba(0,217,255,0.2);';$('#toast').appendChild(d);setTimeout(()=>d.remove(),4200)}

          async function slot(kind){
            for(;;){
              if(TASK&&TASK.stop)throw new Error('stop');
              const live=KEYS.list.filter(o=>!o.off);
              if(!live.length)throw new Error('Aucune clé active.');
              const iv=60000/RPM[KEYS.plan][kind]*1.15*F,now=Date.now();
              let best=null,bt=1e18;
              for(const o of live){const t=Math.max(o[kind]||0,o.cool||0,now);if(t<bt){bt=t;best=o}}
              if(bt>now){await sleep(Math.min(bt-now,400));continue}
              best[kind]=now+iv;
              return best;
            }
          }
          async function call(kind,url,body,tries){
            let err;
            for(let a=0;a<tries;a++){
              const o=await slot(kind);
              try{
                const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+o.k},body:JSON.stringify(body)});
                if(r.ok){o.bad=0;F=Math.max(1,F*0.97);return r}
                if(r.status==429){o.cool=Date.now()+25000;err=new Error('429');continue}
                throw new Error('HTTP '+r.status);
              }catch(e){err=e;await sleep(1500*(a+1))}
            }
            throw err;
          }

          function J(t){if(!t)return null;let c=String(t).replace(/\`\`\`json|\`\`\`/g,'');const a=c.indexOf('{'),b=c.lastIndexOf('}');if(a<0||b<0)return null;c=c.slice(a,b+1);try{return JSON.parse(c)}catch(e){return null}}
          async function chat(sys,user,max,temp){for(let i=0;i<TXT.length;i++){try{const r=await call('txt',API+'/chat/completions',{model:TXT[i],messages:[{role:'system',content:sys},{role:'user',content:user}],temperature:temp,max_tokens:max},3);const d=await r.json();if(d.choices&&d.choices[0])return d.choices[0].message.content;}catch(e){}}throw new Error('IA texte indisponible');}
          async function llmJSON(sys,user,max,temp){for(let a=0;a<2;a++){const j=J(await chat(sys+' Réponds UNIQUEMENT par un JSON valide.',user,max,temp));if(j)return j;}throw new Error('JSON invalide');}

          function toData(u){
            return new Promise(resolve=>{
              if(!u)return resolve(null);
              if(u.indexOf('data:')===0)return resolve(u);
              const proxyUrl = 'https://wsrv.nl/?url=' + encodeURIComponent(u);
              fetch(proxyUrl).then(r => r.blob()).then(b => {
                  const o = URL.createObjectURL(b), im = new Image();
                  im.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = im.width; c.height = im.height;
                    c.getContext('2d').drawImage(im, 0, 0);
                    URL.revokeObjectURL(o);
                    resolve(c.toDataURL('image/jpeg', 0.86));
                  };
                  im.onerror = () => { URL.revokeObjectURL(o); resolve(null); };
                  im.src = o;
                }).catch(() => resolve(null));
            });
          }

          function mkImg(prompt){return call('img',API+'/images/generations',{model:IMG,prompt:san(prompt),n:1,size:'1K',ratio:'16:9'},3).then(r=>r.json()).then(d=>{const u=d.data[0].url;const img={u,d:null};img._conv=toData(u).then(dd=>{img.d=dd;return dd});return img})}
          
          async function uploadToSupabase(file) {
            try {
              const client = window.supabaseClient;
              if (!client) throw new Error("Client Supabase non trouvé sur window");
              const fileName = 'ref-' + Date.now() + '-' + Math.random().toString(36).slice(2,6) + '.jpg';
              const { data, error } = await client.storage.from('media').upload(fileName, file);
              if (error) throw error;
              const { data: urlData } = client.storage.from('media').getPublicUrl(fileName);
              return urlData.publicUrl;
            } catch (e) {
              log('er', 'Erreur upload Supabase : ' + e.message);
              throw e;
            }
          }

          function readFile(f){return new Promise(res=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);res({u:c.toDataURL('image/jpeg',0.88), file: f})};im.src=fr.result};fr.readAsDataURL(f)})}

          const newP=()=>({id:uid(),created:Date.now(),upd:Date.now(),page:0,title:'Nouveau clip',audioUrl:null,refImages:[],prompt:'',shots:[]});
          function setP(p){P=p;P.shots=P.shots||[];P.refImages=P.refImages||[];}

          async function generateShotPrompts(){
            const sys="Tu es un réalisateur de clips musicaux.";
            const user='Description: "'+P.prompt+'". Génère 4 plans de 10s. JSON: {"shots":[{"action":"...","camera":"..."}]}';
            const res=await llmJSON(sys,user,1500,0.7);
            P.shots=(res.shots||[]).map(s=>({id:uid(),action:s.action,camera:s.camera,img:null,vst:'wait'}));
          }

          async function launchVideo(shot){
            const o = await slot('vid');
            let body;
            const hasRefs = P.refImages && P.refImages.length > 0;

            if (hasRefs) {
              const imageUrls = P.refImages.map(img => img.publicUrl).filter(Boolean).slice(0, 5);
              if (imageUrls.length === 0) throw new Error("Aucune image de référence n'a pu être uploadée.");
              const promptText = 'Cinematic clip. ' + shot.action + '. Camera: ' + shot.camera + '. The character from <Picture 1> is the main subject.';
              body = { model: 'agnes-video-2.5-flash', prompt: promptText, mode: 'reference', size: '720P', aspect_ratio: '16:9', seconds: '5', images: imageUrls };
            } else {
              const fr = shot.img.d || await toData(shot.img.u); 
              body = { model: 'agnes-video-2.5-flash', prompt: 'Cinematic clip. ' + shot.action + '. Camera: ' + shot.camera, mode: 'keyframe', size: '720P', aspect_ratio: '16:9', seconds: '5', first_frame: fr };
            }

            let retries = 0;
            const maxRetries = 10;
            let waitTime = 15000;

            while (retries < maxRetries) {
              try {
                log('in', 'Envoi de la requête vidéo à Agnes (essai ' + (retries+1) + '/' + maxRetries + ')...');
                const r = await fetch(API+'/videos', {
                  method:'POST',
                  headers:{'Content-Type':'application/json', Authorization:'Bearer '+o.k},
                  body:JSON.stringify(body)
                });

                if (r.status === 503) {
                  log('wr', 'File d attente pleine (503). Nouvel essai dans ' + (waitTime/1000) + 's...');
                  await sleep(waitTime);
                  waitTime = Math.min(waitTime * 1.5, 120000);
                  retries++;
                  continue;
                }

                if (!r.ok) { const errTxt = await r.text(); log('er', 'Erreur API : ' + errTxt); throw new Error('HTTP ' + r.status); }

                const d = await r.json();
                const id = d.video_id || d.id;
                if (!id) throw new Error('Pas de video_id');
                log('ok', 'Vidéo lancée (ID: ' + id + '). Attente de la génération...');

                const end = Date.now() + 30 * 60000;
                await sleep(5000);

                while(Date.now() < end) {
                  const pr = await fetch(POLL+'?video_id='+id+'&model_name=agnes-video-2.5-flash',{headers:{Authorization:'Bearer '+o.k}});
                  const pd = await pr.json();
                  if (['completed','succeeded'].includes(pd.status)) { 
                    shot.video = pd.url || (pd.metadata && pd.metadata.url); 
                    log('ok', 'Vidéo générée avec succès !');
                    return;
                  }
                  if (pd.status == 'failed') throw new Error('Échec génération');
                  log('in', 'Statut : ' + pd.status + '...');
                  await sleep(3000); 
                }
                throw new Error('Timeout');

              } catch(e) {
                if (e.message.includes('503')) {
                  log('wr', 'Erreur 503 interceptée. Nouvel essai...');
                  await sleep(waitTime);
                  retries++;
                  continue;
                }
                log('er', 'Vidéo: ' + e.message);
                shot.vst = 'er';
                throw e;
              }
            }
            throw new Error('File d attente saturée.');
          }

          const hd=(n,t)=>'<div class="lab">ÉTAPE '+n+' / 3</div><h2>'+t+'</h2>';
          const guide=(h,c)=>'<div class="guide '+(c||'')+'"><div>'+h+'</div></div>';
          const foot=(prev,next)=>'<div class="ft">'+(prev||'<span></span>')+(next||'')+'</div>';
          const nextBtn=(a,l,x)=>'<button class="big" data-a="'+a+'" '+(x||'')+'>'+l+' →</button>';
          const V={
            0:{cfg:()=>'<div class="hero">'+hd(1,'Votre <b>Clip</b>')+guide('👉 Importez la musique et décrivez l ambiance.')+
              '<div style="margin-bottom:24px;"><span class="lab">1. Musique (MP3)</span><input type="file" id="audio-file" accept="audio/*" style="display:none"><button class="btn" onclick="document.getElementById(\\'audio-file\\').click()">Choisir un MP3</button></div>'+
              '<p class="sub" id="audio-status">Aucun fichier.</p>'+
              '<div style="margin-bottom:24px;"><span class="lab">2. Images (Optionnel)</span><input type="file" id="ref-images" accept="image/*" multiple style="display:none"><button class="btn" onclick="document.getElementById(\\'ref-images\\').click()">Ajouter</button><div id="ref-previews" class="preview-row"></div></div>'+
              '<div><span class="lab">3. Ambiance</span><textarea id="prompt" rows="4" placeholder="Ex: Cyberpunk sous la pluie...">'+esc(P.prompt)+'</textarea></div>'+
              foot('',nextBtn('gen-shots','Créer les plans'))+'</div>'},
            1:{cfg:()=>'<div class="hero">'+hd(2,'Vos <b>Plans</b>')+guide('👉 Validez pour générer les images.')+
              '<div id="shots-list">'+P.shots.map((s,i)=>'<div class="cd"><div class="lab">Plan '+(i+1)+'</div><p>'+esc(s.action)+'</p><p class="lab">Cam: '+esc(s.camera)+'</p></div>').join('')+'</div>'+
              foot(btn('back-to-0','← Modifier'),nextBtn('gen-images','Générer les images'))+'</div>',
              work:()=>'<div class="hero">'+hd(2,'Génération des Images')+workView()+'</div>'},
            2:{cfg:()=>'<div class="hero">'+hd(3,'Vos <b>Vidéos</b>')+guide('👉 Lancez la génération.')+
              '<div style="margin:10px 0">'+btn('start-video','Lancer les vidéos')+' '+btn('play-clip','Voir le clip')+'</div>'+
              '<div class="grid" id="tiles">'+P.shots.map((s,i)=>tile(s,i+1)).join('')+'</div>'+
              foot(btn('back-to-1','← Modifier'))+'</div>',
              work:()=>'<div class="hero">'+hd(3,'Génération des Vidéos')+workView()+'</div>'}
          };
          const view=()=>TASK?(V[page].work?V[page].work():workView()):V[page].cfg();
          const tile=(s,i)=>'<div class="tl"><div class="th">'+(s.video?'<video src="'+esc(s.video)+'" controls></video>':s.img?'<img src="'+esc(s.img.u)+'">':'')+'<b class="tg">'+i+'</b></div><div style="padding:12px;font-size:13px;color:#fff;">'+esc(s.action)+'</div></div>';

          function render(keep){
            $('#main').innerHTML=view();
            if(!TASK&&page==0){
              if($('#prompt'))$('#prompt').value=P.prompt;
              if($('#audio-status'))$('#audio-status').innerText=P.audioUrl?"Fichier importé.":"Aucun fichier.";
              if($('#ref-previews'))$('#ref-previews').innerHTML=P.refImages.map(img=>'<img src="'+img.u+'" class="preview-img">').join('');
            }
            save();
          }

          function getSavedKey() { try { return localStorage.getItem('dz_agnes_key'); } catch(e) { return null; } }
          function saveKey(k) { try { localStorage.setItem('dz_agnes_key', k); } catch(e) {} }
          function fd(t){const it={t:t,s:'run',at:Date.now()};TASK.items.push(it);paintFeed();return it}
          function fdDone(it,t){it.s='ok';it.t=t;paintFeed()}
          function paintFeed(){const e=$('#feed');if(!e||!TASK)return;const n=Date.now();e.innerHTML=TASK.items.map(i=>'<div class="fi '+i.s+'"><span>'+(i.s=='ok'?'✓':i.s=='er'?'✕':'...')+'</span><span>'+esc(i.t)+'</span><em>'+Math.round((n-i.at)/1000)+'s</em></div>').join('')}
          
          function workView(){
            return '<div class="hero">' +
              '<div class="lab">ÉTAPE ' + (TASK.step + 1) + ' / 3 · EN COURS</div>' +
              '<h2>' + esc(TASK.title) + '</h2>' +
              '<div class="progress-bar"><div class="progress-fill" id="pfill" style="width: 0%"></div></div>' +
              '<div id="feed" class="feed" style="margin-top:20px;"></div>' +
              '</div>';
          }

          async function task(step,title,fn,after){TASK={step:step,title:title,items:[],stop:false,err:null};page=step;render();try{await fn();}catch(e){if(e.message=='stop'){TASK=null;render();return}TASK.err=e.message;render();return}TASK=null;if(after)after();else{page++;render();}}
          function play(){const a=P.shots.filter(x=>x.video);if(!a.length)return toast('Générez d abord les vidéos.');const pl=$('#pl'),v=$('#pv'),pa=$('#pa'),sub=$('#sub');pl.classList.add('on');v.classList.remove('on');if(P.audioUrl){pa.src=P.audioUrl;pa.play().catch(()=>{})}playing=true;(async()=>{for(let i=0;i<a.length;i++){if(!playing)break;v.classList.remove('on');await sleep(500);v.src=a[i].video;sub.textContent=a[i].action;v.classList.add('on');await new Promise(r=>{v.onended=r;v.onerror=r;v.play().catch(r)});}stopPlay();})();}
          function stopPlay(){playing=false;const v=$('#pv'),pa=$('#pa');v.pause();pa.pause();$('#pl').classList.remove('on');if(page==2&&!TASK)render(true);}

          document.addEventListener('click',async e=>{
            const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
            
            if(a=='gen-shots'){
              const promptEl = $('#prompt');
              if (!promptEl) return toast('Erreur : champ texte introuvable.');
              P.prompt = promptEl.value;
              if(!P.prompt)return toast('Décrivez l ambiance.');
              if(!P.audioUrl)return toast('Importez un audio.');
              task(1,'Création des plans',generateShotPrompts,()=>{page=1;render()});
            }
            else if(a=='gen-images'){
              task(1,'Génération des images',async()=>{
                const it=fd('Images...');
                for(const s of P.shots){
                  s.img=await mkImg(P.prompt+' '+s.action);
                  render();
                }
                fdDone(it,'OK');
              },()=>{page=2;render()});
            }
            else if(a=='start-video'){
              task(2,'Génération des vidéos',async()=>{
                const it=fd('Initialisation...');
                const pfill = $('#pfill');
                
                if (P.refImages.length > 0) {
                  log('in', 'Préparation des images de référence...');
                  for (let i=0; i<P.refImages.length; i++) {
                    const img = P.refImages[i];
                    if (!img.publicUrl && img.file) {
                      try {
                        log('in', 'Upload de l image ' + (i+1) + '/' + P.refImages.length + '...');
                        img.publicUrl = await uploadToSupabase(img.file);
                        log('ok', 'Image uploadée : ' + img.publicUrl.substring(0, 40) + '...');
                      } catch(e) { 
                        log('er', 'Upload échoué : ' + e.message); 
                      }
                    }
                    if (pfill) pfill.style.width = ((i+1)/P.refImages.length * 20) + '%';
                  }
                }

                const total = P.shots.length;
                for (let i=0; i<total; i++) {
                  const shot = P.shots[i];
                  if(!shot.img && !P.refImages.length) continue;
                  shot.vst = 'run'; render();
                  try { 
                    await launchVideo(shot); 
                    shot.vst = 'ok'; 
                  } catch(err) { 
                    toast("Erreur : " + err.message); 
                  }
                  render();
                  if (pfill) pfill.style.width = (20 + ((i+1)/total * 80)) + '%';
                }
                fdDone(it,'Terminé');
              },()=>{ 
                const pfill = $('#pfill');
                if (pfill) pfill.style.width = '100%';
                render(); 
                toast('Génération terminée !'); 
              });
            }
            else if(a=='play-clip')play();
            else if(a=='stopplay')stopPlay();
            else if(a=='back-to-0'){page=0;render()}
            else if(a=='back-to-1'){page=1;render()}
            else if(a=='con')$('#con').style.display=$('#con').style.display=='none'?'block':'none';
          });

          document.addEventListener('change',async e=>{
            if(e.target.id=='audio-file'){P.audioUrl=URL.createObjectURL(e.target.files[0]);toast('Audio importé');render()}
            if(e.target.id=='ref-images'){for(const file of e.target.files){const img=await readFile(file);if(img){img.file=file; P.refImages.push(img)}}render()}
          });

          (async()=>{
            try{db=await openDB()}catch(e){}
            const savedKey = getSavedKey();
            if (savedKey) { KEYS.list = [mkKey(savedKey)]; log('in', 'Clé API chargée depuis la mémoire.'); }
            setP(newP()); page=0;render(); log('in','DropZone IA Videos prêt');
            if(!KEYS.list.length){ setTimeout(() => { const k=prompt("Entrez votre clé API Agnès (une seule fois) :"); if(k&&k.length>8) { KEYS.list=[mkKey(k.trim())]; saveKey(k.trim()); toast('Clé API enregistrée !'); } }, 1000); }
          })();
        }, 100);
      `;
      const script = document.createElement('script');
      script.innerHTML = scriptContent;
      document.body.appendChild(script);
      
      return () => { document.head.removeChild(style); if (script.parentNode) script.parentNode.removeChild(script); };
    };

    init();
  }, []);

  return <div ref={containerRef} />;
};