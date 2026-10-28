// ======================= CONFIG: the only place to edit client details =======================
// Leave a value as '' and the related text, button or section stays hidden on the page.
var CONFIG={
  brand:{          // Brand shown in the header, footer, WhatsApp messages, saved contact and form consent line.
    name:'Defender Villas',              //   Brand name.
    project:'',                          //   Optional project name, if the project keeps its own name (see BRAND_REVIEW.md).
    domain:'https://defendervillas.com', //   Live domain (canonical URL). HTTPS must be enabled on the host.
    tagline:''                           //   Optional short tagline.
  },
  phone:'',        // Main sales phone: country code + digits, no spaces, e.g. '91XXXXXXXXXX'. Needed for the Call buttons, header number and footer.
  whatsapp:'',     // WhatsApp number, same format. If empty, the main phone is used for WhatsApp.
  email:'',        // Sales email address (footer and project card in Our Group).
  mapLink:'https://www.google.com/maps?q=10.298030853271484,76.1274185180664&z=17&hl=en', // Google Maps link for the project location (map button and iframe use it).
  website:'https://defendervillas.com', // Project website (project card in Our Group).
  office:'',       // Defender Real Estates & Builders Limited registered office address (footer).
  cin:'',          // Defender company CIN (footer).
  reraNo:'',       // K-RERA registration number. Shows the compliance bar under the hero, the Approvals list and the footer.
  reraQr:'',       // Path to the official K-RERA QR image, e.g. 'images/rera-qr.png' (Approvals section).
  crz:'',          // CRZ clearance wording exactly as per the order: authority, reference no. and date.
  permit:'',       // Panchayat building permit number and date.
  progressUrl:'',  // Link or file path (images/ or docs/) to the latest quarterly K-RERA progress report.
  stage:'',        // Current build stage, exactly one of: 'Land & soil test','Design & approvals','Foundation','Structure','Finishing','Handover'.
  stageDate:'',    // Date of the latest progress update, e.g. '15 Nov 2026'.
  handover:'',     // Handover timeline, e.g. 'December 2027'.
  callHours:'',    // Gulf-friendly call hours in UAE time, e.g. '6 pm to 10 pm'.
  video:'',        // Optional. Walkthrough video path if different from the default images/walkthrough.mp4.
  tour360:'',      // Real 360 photo (equirectangular JPG), e.g. 'images/tour-360.jpg'. Replaces the 360 preview demo with Pannellum.
  yt:'',           // OR a YouTube video ID. If filled, it is used instead of the MP4 (loads only when Play is tapped).
  HERO_FORM_MODE:'panel',          // 'panel': the hero form opens in a slide-in panel from every Enquire button. 'inline': the form sits in the hero as before.
  heroLoop:'images/hero-loop.mp4', // Optional looping hero video (6-10 s, muted). Plays on desktop only if the file exists; set '' to switch off.
  minu:{           // Minu John (sister concern digital card)
    phone:'',      //   Phone, country code + digits. Shows the Call icon.
    whatsapp:'',   //   WhatsApp number. If empty the phone is used. Shows the WhatsApp icon.
    email:'',      //   Email. Added to the saved contact.
    address:'',    //   Office address (tap-to-map row on the card).
    website:'',    //   Website (row on the card).
    company:'',    //   Business name for the saved contact (default: CONFIG.brand.name) and footer.
    licence:''     //   Contractor licence / realtor registration number (footer).
  },
  mercea:{         // Mercea Technical Services LLC, Dubai
    services:'',   //   One-line description of services (replaces the default line on its card).
    website:'',    //   Website starting with https:// (turns the card button into Visit website).
    phone:'',      //   Phone, country code + digits (footer).
    email:'',      //   Email (footer).
    address:'',    //   Dubai address (footer).
    licence:''     //   Trade licence number (footer).
  }
};
// REQUIRED before launch: [formServiceURL, googleAppsScriptURL]. Enquiries are delivered if ANY endpoint succeeds. While empty, nothing is sent.
var ENDPOINTS=[];
// ==============================================================================================
(function(){
  var C=CONFIG,M=C.minu||{},D=C.mercea||{},B=(C.brand&&C.brand.name)||'Defender Villas';
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};
  var WA=C.whatsapp||C.phone,MWA=M.whatsapp||M.phone;
  // brand text from CONFIG.brand.name
  $$('[data-brand]').forEach(function(el){el.textContent=el.getAttribute('data-brand')==='upper'?B.toUpperCase():B;});
  $$('[data-wt]').forEach(function(a){a.setAttribute('data-wt',a.getAttribute('data-wt').replace(/\{brand\}/g,B));});
  $$('img[alt="Defender Villas"]').forEach(function(i){i.alt=B;});
  var vl=$('#vid');if(vl)vl.setAttribute('aria-label',B+' walkthrough video');
  var HAS={call:!!C.phone,wa:!!WA,mail:!!C.email,minucall:!!M.phone,minuwa:!!MWA,minusave:!!(M.phone||M.email)};
  function fmt(n){return /^91\d{10}$/.test(n)?'+91 '+n.slice(2,7)+' '+n.slice(7):(/^\d+$/.test(n)?'+'+n:n)}
  function safe(u){return /^(https?:\/\/|images\/|docs\/|\/)/i.test(u||'')?u:''}
  function li(ul,t,ref){var e=document.createElement('li');e.textContent=t;ul.insertBefore(e,ref||null);return e}
  // show things only when their value is filled
  $$('[data-needs]').forEach(function(el){if(HAS[el.getAttribute('data-needs')])el.hidden=false;});
  var NUM={main:C.phone,minu:M.phone},WAN={main:WA,minu:MWA};
  $$('[data-call]').forEach(function(a){var n=NUM[a.getAttribute('data-call')];if(n)a.href='tel:+'+n;});
  $$('[data-wa]').forEach(function(a){var n=WAN[a.getAttribute('data-wa')];if(n){a.href='https://wa.me/'+n+'?text='+encodeURIComponent(a.getAttribute('data-wt')||'');a.target='_blank';a.rel='noopener';}});
  $$('[data-ptext]').forEach(function(s){if(C.phone)s.textContent=fmt(C.phone);});
  if(!HAS.call&&!HAS.wa)$('#sEnq').hidden=false;
  if(C.email){var fm=$('#fMail');fm.textContent=C.email;fm.href='mailto:'+C.email;}
  // approvals and progress
  var tl=$('#tl'),first=tl.firstElementChild;
  if(C.reraNo){$('#rn').textContent=C.reraNo;$('#reraBar').hidden=false;$('#fRera').textContent=C.reraNo;$('#fReraWrap').hidden=false;li(tl,'K-RERA registration: '+C.reraNo,first);}
  if(C.crz)li(tl,'CRZ clearance: '+C.crz,first);
  if(C.permit)li(tl,'Panchayat building permit: '+C.permit,first);
  var q=safe(C.reraQr);if(q){$('#qrimg').src=q;$('#qrbox').hidden=false;}
  var names=['Land & soil test','Design & approvals','Foundation','Structure','Finishing','Handover'],k=names.indexOf(C.stage);
  if(k>-1){$$('#steps div').forEach(function(d,i){if(i<=k)d.className='on';});}
  if(k>-1||C.stageDate){var sn=$('#stageNote');sn.textContent=(k>-1?'Current stage: '+names[k]:'')+(k>-1&&C.stageDate?' \u00b7 ':'')+(C.stageDate?'Updated '+C.stageDate:'');sn.hidden=false;}
  var pl=$('#pl');
  if(safe(C.progressUrl)){var pe=li(pl,''),pa=document.createElement('a');pa.href=C.progressUrl;pa.target='_blank';pa.rel='noopener';pa.textContent='Latest quarterly K-RERA progress report';pa.style.cssText='color:var(--teal);font-weight:600';pe.appendChild(pa);}
  if(C.handover)li(pl,'Handover timeline: '+C.handover);
  if(pl.children.length)pl.hidden=false;
  if(C.callHours){var cs=$('#callslots');cs.textContent='Call slots (UAE time): '+C.callHours;cs.hidden=false;}
  // group cards
  if(D.services)$('#mcDesc').textContent=D.services;
  if(/^https?:\/\//i.test(D.website||'')){var mb=$('#mcBtn');mb.href=D.website;mb.textContent='Visit website';mb.target='_blank';mb.rel='noopener noreferrer';}
  // footer group lines (only filled values)
  var fl=$('#flines');
  function fline(a){a=a.filter(Boolean);if(a.length>1){var p=document.createElement('p');p.textContent=a.join(' \u00b7 ');fl.appendChild(p);}}
  fline(['Defender Real Estates & Builders Limited',C.cin&&'CIN: '+C.cin,C.office&&'Registered office: '+C.office]);
  fline(['Minu John, Realtor & Licensed General Contractor',M.company,M.licence&&'Licence no.: '+M.licence]);
  fline(['Mercea Technical Services LLC, Dubai',D.address,D.phone&&fmt(D.phone),D.email,D.licence&&'Trade licence no.: '+D.licence]);
  // contact rows on the group cards: a row appears only when its value exists
  function rows(id,o){
    var ul=$(id),n=0,ph=String(o.phone||'').replace(/\D/g,''),wb=String(o.website||'').trim();
    function add(icon,text,href,ext){var l=document.createElement('li'),a=document.createElement('a'),sp=document.createElement('span');a.href=href;a.title=text;if(ext){a.target='_blank';a.rel='noopener noreferrer';}
      a.innerHTML='<svg><use href="#'+icon+'"/></svg>';sp.textContent=text;a.appendChild(sp);l.appendChild(a);ul.appendChild(l);n++;}
    if(o.address)add('i-pin',o.address,'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.address),true);
    if(ph)add('i-phone',fmt(ph),'tel:+'+ph);
    if(o.email)add('i-mail',o.email,'mailto:'+o.email);
    if(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(wb))add('i-web',wb.replace(/^https?:\/\//i,'').replace(/\/$/,''),/^https?:\/\//i.test(wb)?wb:'https://'+wb,true);
    if(n)ul.hidden=false;
  }
  rows('#ci-hh',{address:C.office,phone:C.phone,email:C.email,website:C.website});
  rows('#ci-minu',{address:M.address,phone:M.phone,email:M.email,website:M.website});
  rows('#ci-mc',D);
  // header
  var hdr=$('#hdr');function sc(){hdr.classList.toggle('solid',window.scrollY>40||hdr.classList.contains('open'));}sc();addEventListener('scroll',sc,{passive:true});
  var mb=$('#menuBtn'),mn=$('#mnav');
  function menu(o){mn.hidden=!o;mb.setAttribute('aria-expanded',o);mb.setAttribute('aria-label',o?'Close menu':'Open menu');hdr.classList.toggle('open',o);sc();}
  mb.addEventListener('click',function(e){e.stopPropagation();menu(mn.hidden);});
  mn.addEventListener('click',function(e){if(e.target.closest('a'))menu(false);});
  document.addEventListener('click',function(e){if(!mn.hidden&&!hdr.contains(e.target))menu(false);});
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!mn.hidden)menu(false);});
  addEventListener('resize',function(){if(innerWidth>=1040&&!mn.hidden)menu(false);});
  // Minu John vCard
  $('#vcfbtn').addEventListener('click',function(){
    var L=['BEGIN:VCARD','VERSION:3.0','N:John;Minu;;;','FN:Minu John','ORG:'+(M.company||B),'TITLE:Realtor & Licensed General Contractor'];
    if(M.phone)L.push('TEL;TYPE=CELL:+'+M.phone);
    if(M.email)L.push('EMAIL:'+M.email);
    L.push('NOTE:'+B+'\\, Perinjanam Moonupedika\\, Kodungallur\\, Thrissur\\, Kerala','END:VCARD');
    var b=new Blob([L.join('\r\n')],{type:'text/vcard'}),u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download='Minu-John.vcf';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},2000);
  });
  // page scroll lock (lightbox, enquiry panel): js/motion.js listens for 'site:lock' to stop/start Lenis
  var locks=0;
  function lock(on){locks=Math.max(0,locks+(on?1:-1));document.documentElement.classList.toggle('locked',locks>0);document.dispatchEvent(new CustomEvent('site:lock',{detail:locks>0}));}
  // lightbox
  var lb=$('#lb'),lbi=$('img',lb);
  function lbClose(){if(lb.classList.contains('on')){lb.classList.remove('on');lock(false);}}
  $$('[data-lb]').forEach(function(b){b.addEventListener('click',function(){var i=$('img',b);lbi.src=i.src;lbi.alt=i.alt;if(!lb.classList.contains('on')){lb.classList.add('on');lock(true);}});});
  lb.addEventListener('click',lbClose);
  addEventListener('keydown',function(e){if(e.key==='Escape')lbClose();});
  // enquiry panel: CONFIG.HERO_FORM_MODE 'panel' moves the hero form into a slide-in panel opened by [data-panel] buttons.
  // 'inline' (or no JS) keeps the form in the hero and those buttons simply link to #enquire.
  var pnl=$('#enqPanel'),hf=$('#heroForm'),opener=null;
  if(C.HERO_FORM_MODE!=='inline'&&pnl&&hf){
    $('#panelBody').appendChild(hf);document.documentElement.classList.add('hero-panel'); // re-add if the head failsafe removed it on a slow load
    var sheet=$('.panel-sheet',pnl),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var focusables=function(){return $$('a[href],button:not([disabled]),input:not([type=hidden]):not([tabindex="-1"]),select,textarea',sheet).filter(function(e){return e.offsetParent!==null;});};
    var pOpen=function(from){
      if(!pnl.hidden)return;opener=from||document.activeElement;pnl.hidden=false;lock(true);
      void sheet.offsetWidth;pnl.classList.add('open');
      setTimeout(function(){$('#q-name').focus({preventScroll:true});},reduce?0:350);
    };
    var pClose=function(){
      if(pnl.hidden)return;pnl.classList.remove('open');lock(false);
      var done=function(){pnl.hidden=true;};if(reduce)done();else setTimeout(done,560);
      if(opener&&opener.focus)opener.focus({preventScroll:true});
    };
    $$('[data-panel]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();pOpen(a);});});
    $$('[data-close]',pnl).forEach(function(b){b.addEventListener('click',pClose);});
    pnl.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.stopPropagation();pClose();return;}
      if(e.key!=='Tab')return;var f=focusables(),a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
    });
    window.enquiryPanel={open:pOpen,close:pClose};
  }else{document.documentElement.classList.remove('hero-panel');}
  // carousels: CSS scroll-snap + arrows + dots (hidden slides are skipped)
  $$('.car').forEach(function(el){
    var tr=$('.car-track',el),dots=$('.dots',el),pv=$('.prev',el),nx=$('.next',el),ctl=$('.car-ctl',el),raf=0,sl=[],ds=[];
    function vis(){return [].slice.call(tr.children).filter(function(s){return !s.hidden;});}
    function base(){return sl[0].offsetLeft}
    function step(){return (sl.length>1?sl[1].offsetLeft-sl[0].offsetLeft:tr.clientWidth)||1}
    function go(i){tr.scrollTo({left:sl[i].offsetLeft-base(),behavior:'smooth'});}
    function upd(){
      raf=0;var max=tr.scrollWidth-tr.clientWidth,fits=max<=4;ctl.hidden=fits;
      var i=Math.max(0,Math.min(sl.length-1,Math.round(tr.scrollLeft/step())));if(!fits&&tr.scrollLeft>=max-4)i=sl.length-1;
      for(var j=0;j<ds.length;j++){ds[j].classList.toggle('on',j===i);}
      pv.disabled=tr.scrollLeft<4;nx.disabled=tr.scrollLeft>=max-4;
    }
    function build(){sl=vis();dots.textContent='';sl.forEach(function(s,i){var d=document.createElement('button');d.type='button';d.setAttribute('aria-label','Go to slide '+(i+1));d.addEventListener('click',function(){go(i);});dots.appendChild(d);});ds=dots.children;upd();}
    pv.addEventListener('click',function(){tr.scrollBy({left:-step(),behavior:'smooth'});});
    nx.addEventListener('click',function(){tr.scrollBy({left:step(),behavior:'smooth'});});
    tr.addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(upd);},{passive:true});
    addEventListener('resize',upd);el.refresh=build;build();
  });
  // optional gallery photos: a slide appears only if its image file exists in images/
  addEventListener('load',function(){setTimeout(function(){
    $$('.car-slide[data-opt]').forEach(function(s){
      var im=$('img',s),t=new Image();
      t.onload=function(){im.src=t.src;s.hidden=false;var c=s.closest('.car');if(c&&c.refresh)c.refresh();document.dispatchEvent(new Event('site:layout'));};
      t.src=im.getAttribute('data-src');
    });
    if(C.stageDate){var pc=$('#progCap');if(pc)pc.textContent='Latest site progress \u00b7 '+C.stageDate;}
  },600);});
  // walkthrough video: nothing loads until Play. YouTube (CONFIG.yt) wins over the MP4.
  var vb=$('#vbox'),vid=$('#vid'),vp=$('#vplay'),vf=$('#vfall');
  if(C.video&&!C.yt&&safe(C.video))$('source',vid).src=C.video;
  function vfail(){vp.style.display='none';vf.classList.add('on');}
  vp.addEventListener('click',function(){
    if(C.yt){vid.remove();vp.remove();var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(C.yt)+'?autoplay=1&rel=0&playsinline=1';f.title=B+' walkthrough';f.allow='autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;vb.appendChild(f);return;}
    $('source',vid).addEventListener('error',vfail);vid.addEventListener('error',vfail);
    vid.preload='auto';var p=vid.play();
    if(p&&p.then){p.then(function(){vp.style.display='none';vid.controls=true;}).catch(vfail);}
  });
  // click-to-load map
  $('#mapbtn').addEventListener('click',function(){var b=$('#mapbox');$('svg',b).remove();this.remove();var f=document.createElement('iframe');f.title='Map: '+B+' location, Perinjanam Moonupedika';f.loading='lazy';f.referrerPolicy='no-referrer-when-downgrade';f.src=C.mapLink+(C.mapLink.indexOf('?')>-1?'&':'?')+'output=embed';b.appendChild(f);});
  $('#mapLink').href=C.mapLink;
  // 360 preview: light drag/swipe panorama (no library). CONFIG.tour360 swaps in Pannellum with a real equirectangular photo.
  var pano=$('#pano'),pin=$('#panoIn');
  if(C.tour360&&safe(C.tour360)){
    pano.textContent='';pano.className='';pano.removeAttribute('tabindex');
    var io2=new IntersectionObserver(function(es){if(es[0].isIntersecting){io2.disconnect();
      var lk=document.createElement('link');lk.rel='stylesheet';lk.href='https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';document.head.appendChild(lk);
      var sp=document.createElement('script');sp.src='https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
      sp.onload=function(){window.pannellum.viewer('pano',{type:'equirectangular',panorama:C.tour360,autoLoad:true,compass:false,showFullscreenCtrl:true,hfov:100});};
      document.head.appendChild(sp);}},{rootMargin:'300px'});io2.observe(pano);
  }else{
    var off=0,inter=false,moved=false,drag=false,sx=0,so=0,hint=$('#phint'),cap=$('#pcap');
    var rng=function(){return Math.max(0,pin.offsetWidth-pano.clientWidth)};
    var set=function(v,ms){off=Math.max(-rng(),Math.min(0,v));pin.style.transition=ms?'transform '+ms+'ms ease':'none';pin.style.transform='translate3d('+off+'px,0,0)';};
    var calm=function(){inter=true;hint.style.opacity=0;};
    pano.addEventListener('pointerdown',function(e){if(e.button>0)return;drag=true;moved=false;sx=e.clientX;so=off;pano.classList.add('drag');calm();});
    addEventListener('pointermove',function(e){if(!drag)return;var d=e.clientX-sx;if(Math.abs(d)>5)moved=true;set(so+d,0);});
    var end=function(){if(!drag)return;drag=false;pano.classList.remove('drag');};
    addEventListener('pointerup',end);addEventListener('pointercancel',end);
    pano.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
    pano.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){set(off+80,300);calm();e.preventDefault();}if(e.key==='ArrowRight'){set(off-80,300);calm();e.preventDefault();}});
    $$('.hs',pano).forEach(function(h){h.addEventListener('click',function(){
      set(-(parseFloat(h.style.left)/100*pin.offsetWidth-pano.clientWidth/2),550);calm();
      cap.textContent='';var b=document.createElement('b');b.textContent=h.getAttribute('data-n');cap.appendChild(b);cap.appendChild(document.createTextNode(' \u00b7 '+h.getAttribute('data-d')));cap.hidden=false;
    });});
    addEventListener('resize',function(){set(off,0);});
    if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
      var io3=new IntersectionObserver(function(es){if(es[0].isIntersecting){io3.disconnect();setTimeout(function(){if(!inter)set(-rng()*.5,1500);},500);setTimeout(function(){if(!inter)set(0,1500);},2600);}},{threshold:.6});io3.observe(pano);
    }
  }
  // villa buttons pre-select the form
  $$('[data-villa]').forEach(function(a){a.addEventListener('click',function(){var v=a.getAttribute('data-villa');$('#villa').value=v;$('#q-villa').value=v;});});
  // forms
  $$('form.enq').forEach(function(f){
    var ok=$('.ok',f),err=$('.err',f);
    function show(m){err.textContent=m;err.style.display='block';}
    f.addEventListener('submit',function(e){
      e.preventDefault();ok.style.display='none';err.style.display='none';
      var d=Object.fromEntries(new FormData(f).entries());
      if(d.website){return;}
      var phone=(d.phone||'').replace(/[\s\-()]/g,'');
      if(!d.name||d.name.trim().length<2){return show('Please enter your name.');}
      if(!/^(\+?91)?[6-9]\d{9}$|^\+\d{8,15}$/.test(phone)){return show('Please enter a valid phone number (Indian mobile or +country code).');}
      if(d.email&&!/^\S+@\S+\.\S+$/.test(d.email)){return show('Please check the email address.');}
      d.page=location.href;d.time=new Date().toISOString();
      var jobs=ENDPOINTS.map(function(u){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){if(!r.ok)throw 0;});});
      var done=function(){ok.textContent='Thank you! Our team will call or WhatsApp you shortly.';ok.style.display='block';f.reset();};
      if(!jobs.length){if(window.console)console.warn('ENDPOINTS is empty: this enquiry was not sent anywhere.');setTimeout(done,400);return;}
      Promise.allSettled(jobs).then(function(r){
        if(r.some(function(x){return x.status==='fulfilled';})){done();}
        else{try{localStorage.setItem('hh_pending',JSON.stringify(d));}catch(_){}show((HAS.call||HAS.wa)?'We could not send this right now. Please call or WhatsApp us using the buttons on this page.':'We could not send this right now. Please try again in a few minutes.');}
      });
    });
  });
  window.__mainReady=true;
})();
