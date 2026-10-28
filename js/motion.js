// ======================= MOTION: GSAP + ScrollTrigger + SplitText + Lenis =======================
// Reveal system driven by data attributes:
//   data-anim="fade-up"      element fades and rises into place
//   data-anim="stagger"      direct children (without their own data-anim) fade up one after another
//   data-anim="line-reveal"  heading lines slide up from behind a mask (SplitText)
//   data-anim="clip-reveal"  image frame wipes open from the bottom while the image settles from a slight zoom
//   data-anim="parallax"     image drifts against the scroll (desktop/tablet), add data-speed="8" to tune
//   data-anim="count"        the first number in the text counts up; the rest of the text stays as written
// Only transform, opacity and clip-path are animated. With reduced motion everything shows in its final state.
// If this file fails to run, the head failsafe removes .motion from <html> and all content is visible.
(function(){
  var root=document.documentElement;
  if(!window.gsap||!window.ScrollTrigger||!window.SplitText){root.classList.remove('motion');return;}
  gsap.registerPlugin(ScrollTrigger,SplitText);
  window.__motionReady=true;

  // motion tokens: defined once, used everywhere
  var T={ease:'expo.out',easeInOut:'expo.inOut',dur:1.1,durLong:1.4,y:28,stagger:.09,start:'top 86%'};
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};
  var C=window.CONFIG||{},hdr=$('#hdr'),hero=$('#hero');
  var REDUCE='(prefers-reduced-motion: reduce)',OK='(prefers-reduced-motion: no-preference)',DESK='(min-width: 1024px)';
  var reduce=matchMedia(REDUCE).matches;
  // the head failsafe already revealed the page (very slow load): keep smooth scroll, skip entrance animations
  var late=!reduce&&!root.classList.contains('motion');

  // ---------- Lenis smooth scroll (wheel only; touch devices keep native scrolling) ----------
  var lenis=null;
  if(!reduce&&window.Lenis){
    lenis=new Lenis({lerp:.1,smoothWheel:true,syncTouch:false,anchors:false,autoRaf:false});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(function(t){lenis.raf(t*1000);});
    gsap.ticker.lagSmoothing(0);
    window.lenis=lenis;
  }
  // in-page anchors: smooth scroll; Lenis applies the CSS scroll-padding-top (76px) for the sticky header. Links handled elsewhere (enquiry panel) call preventDefault first and are skipped.
  document.addEventListener('click',function(e){
    if(!lenis||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
    var id=a.getAttribute('href');if(id.length<2)return;
    var t=document.getElementById(id.slice(1));if(!t)return;
    e.preventDefault();
    lenis.scrollTo(t,{duration:1.3,onComplete:function(){
      if(!t.hasAttribute('tabindex'))t.setAttribute('tabindex','-1');t.focus({preventScroll:true});
    }});
    history.replaceState(null,'',id);
  });
  // scroll lock from the lightbox and enquiry panel (js/main.js)
  document.addEventListener('site:lock',function(e){if(lenis){if(e.detail)lenis.stop();else lenis.start();}if(e.detail&&hdr)hdr.classList.remove('hide');});

  // ---------- reveal primitives ----------
  var trig=function(el){return {trigger:el,start:T.start,once:true};};
  var show=function(el){gsap.set(el,{visibility:'visible'});};
  var A={
    'fade-up':function(el){
      gsap.fromTo(el,{autoAlpha:0,y:T.y},{autoAlpha:1,y:0,duration:T.dur,ease:T.ease,scrollTrigger:trig(el)});
    },
    'stagger':function(el){
      var kids=[].slice.call(el.children).filter(function(k){return !k.hasAttribute('data-anim');});
      show(el);
      gsap.fromTo(kids,{autoAlpha:0,y:T.y},{autoAlpha:1,y:0,duration:T.dur,ease:T.ease,stagger:T.stagger,scrollTrigger:trig(el),clearProps:'transform'});
    },
    'line-reveal':function(el){
      show(el);
      SplitText.create(el,{type:'lines',mask:'lines',linesClass:'ln',autoSplit:true,onSplit:function(self){
        return gsap.from(self.lines,{yPercent:115,duration:T.durLong,ease:T.ease,stagger:.1,scrollTrigger:trig(el)});
      }});
    },
    'clip-reveal':function(el){
      var img=$('img',el);show(el);
      var tl=gsap.timeline({scrollTrigger:trig(el)});
      tl.fromTo(el,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:T.durLong,ease:T.easeInOut,clearProps:'clipPath'});
      if(img&&!img.hasAttribute('data-parallax'))tl.fromTo(img,{scale:1.18},{scale:1,duration:1.8,ease:T.ease,clearProps:'transform'},0);
    },
    'count':function(el){
      var txt=el.textContent,m=txt.match(/^(\D*?)(\d+(?:\.\d+)?)([\s\S]*)$/);if(!m)return;
      var end=parseFloat(m[2]),dec=(m[2].split('.')[1]||'').length,o={v:0};
      el.setAttribute('aria-label',txt);
      var paint=function(){el.textContent=m[1]+o.v.toFixed(dec)+m[3];};paint();
      gsap.to(o,{v:end,duration:1.6,ease:'power2.out',onUpdate:paint,onComplete:function(){el.textContent=txt;},scrollTrigger:trig(el)});
    }
  };

  var mm=gsap.matchMedia();

  // ---------- reveals (any width, motion allowed) ----------
  if(!late)mm.add(OK,function(){
    $$('[data-anim]').forEach(function(el){
      var k=el.getAttribute('data-anim');if(k==='parallax')return;
      if(el.closest('.hero'))return;
      if(A[k])A[k](el);else show(el);
    });
  });
  // parallax: tablet and up
  mm.add('(min-width: 768px) and '+OK,function(){
    $$('[data-anim="parallax"]').forEach(function(el){
      var s=parseFloat(el.getAttribute('data-speed'))||8,box=el.closest('section')||el.parentElement;
      gsap.fromTo(el,{yPercent:-s,scale:1.18},{yPercent:s,scale:1.18,ease:'none',scrollTrigger:{trigger:box,start:'top bottom',end:'bottom top',scrub:true}});
    });
    // layered parallax inside a section: data-parallax="speed" (negative moves against the others).
    // An image inside a clipping .frame is scaled up a little so its edges never show.
    $$('[data-parallax]').forEach(function(el){
      var s=parseFloat(el.getAttribute('data-parallax'))||6,inFrame=!!el.closest('.frame'),box=el.closest('section')||el.parentElement;
      gsap.fromTo(el,{yPercent:-s,scale:inFrame?1.16:1},{yPercent:s,scale:inFrame?1.16:1,ease:'none',scrollTrigger:{trigger:box,start:'top bottom',end:'bottom top',scrub:true}});
    });
  });

  // ---------- atmosphere: one fixed sky behind the cinematic zone, dawn -> day -> sunset -> dusk ----------
  // Only CSS variables change. Every stop is dark enough for white text (checked in tools/check-contrast.mjs).
  var atm=$('.atmos');
  if(atm){
    var SKY={ // [top, bottom, glow] from the brand palette: navy/teal base, coral and gold light
      dawn:  ['#0d2638','#1d2c44','rgba(224,102,74,.20)'],
      day:   ['#08303f','#0c4350','rgba(176,125,58,.16)'],
      sunset:['#14213a','#3a2433','rgba(224,102,74,.30)'],
      dusk:  ['#071a26','#0f1d33','rgba(242,215,166,.10)']
    };
    var parse=function(c){var m=c.match(/[\d.]+/g);if(c[0]==='#'){var n=parseInt(c.slice(1),16);return [n>>16,n>>8&255,n&255,1];}return [+m[0],+m[1],+m[2],m[3]===undefined?1:+m[3]];};
    for(var k in SKY)SKY[k]=SKY[k].map(parse);
    var mix=function(a,b,t){return 'rgba('+[0,1,2].map(function(i){return Math.round(a[i]+(b[i]-a[i])*t);}).join(',')+','+(a[3]+(b[3]-a[3])*t).toFixed(3)+')';};
    // stops are scroll positions where a section's top reaches mid-screen
    var plan=[['#hero','dawn'],['#villas','day'],['#gallery','sunset'],['#location','dusk']],stops=[];
    var measure=function(){stops=plan.map(function(p){var el=$(p[0]);return el?{y:Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight/2),c:SKY[p[1]]}:null;}).filter(Boolean);stops[0].y=0;};
    var last='';
    var paint=function(){
      var y=scrollY,i=0;while(i<stops.length-1&&y>stops[i+1].y)i++;
      var a=stops[i],b=stops[Math.min(i+1,stops.length-1)],t=b.y>a.y?Math.min(1,Math.max(0,(y-a.y)/(b.y-a.y))):0;
      var v=[0,1,2].map(function(j){return mix(a.c[j],b.c[j],t);}),key=v.join();
      if(key===last)return;last=key;
      atm.style.setProperty('--atm-top',v[0]);atm.style.setProperty('--atm-bottom',v[1]);atm.style.setProperty('--atm-glow',v[2]);
    };
    measure();paint();
    ScrollTrigger.create({start:0,end:'max',onUpdate:paint,onRefresh:function(){measure();paint();}});
  }

  // ---------- header: hide on scroll down, show on scroll up (desktop) ----------
  if(hdr){
    mm.add(DESK+' and '+OK,function(){
      var st=ScrollTrigger.create({start:0,end:'max',onUpdate:function(s){
        var y=s.scroll(),down=s.direction===1;
        hdr.classList.toggle('hide',down&&y>320&&!hdr.classList.contains('open')&&!root.classList.contains('locked'));
      }});
      hdr.addEventListener('focusin',function(){hdr.classList.remove('hide');});
      return function(){st.kill();hdr.classList.remove('hide');};
    });
  }

  // ---------- scroll progress line ----------
  var bar=$('.progress span');
  if(bar)gsap.to(bar,{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:reduce?true:.4}});

  // ---------- hero ----------
  if(hero){
    var media=$('.hero-media',hero),img=$('.hero-media img',hero),scrim=$('.hero-scrim',hero),copy=$('.hero-copy',hero),cue=$('.scroll-cue',hero);
    var h1=$('h1',copy),eyebrow=$('.eyebrow',copy),sub=$('.sub',copy),pills=$$('.pill',copy),ctas=$$('.cta-row>*',copy),cap=$('.cap',copy);
    var kb=null;
    if(!late)mm.add({motion:OK,phone:'(max-width: 767px)'},function(ctx){
      if(!ctx.conditions.motion)return;
      gsap.set(copy.children,{visibility:'visible'});
      // Ken Burns: settle from a slight zoom, then a very slow drift
      kb=gsap.timeline();
      kb.fromTo(img,{scale:1.14},{scale:1.02,duration:2.8,ease:'power2.out'})
        .to(img,{scale:1.09,duration:18,ease:'sine.inOut',yoyo:true,repeat:-1});
      // intro: location line, headline lines and the two buttons first; once the headline has settled,
      // the subtext and pills follow (on phones the pills wait until the visitor starts scrolling)
      var intro=gsap.timeline({delay:.15,defaults:{ease:T.ease}});
      intro.fromTo(eyebrow,{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.9});
      var split=SplitText.create(h1,{type:'lines',mask:'lines',linesClass:'ln',autoSplit:true,onSplit:function(self){
        return gsap.fromTo(self.lines,{yPercent:115},{yPercent:0,duration:T.durLong,ease:T.ease,stagger:.12,delay:.35});
      }});
      intro.fromTo(ctas,{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.8,stagger:.09},.9)
        .fromTo(sub,{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:1},2.05)
        .fromTo(cap,{autoAlpha:0},{autoAlpha:.75,duration:.8},2.4);
      if(ctx.conditions.phone){
        gsap.set(pills,{autoAlpha:0,y:14});
        ScrollTrigger.create({trigger:hero,start:'top+=8 top',once:true,onEnter:function(){gsap.to(pills,{autoAlpha:1,y:0,duration:.8,stagger:.07,ease:T.ease});}});
      }else{
        intro.fromTo(pills,{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.8,stagger:.07},2.2);
      }
      if(cue)intro.fromTo(cue,{autoAlpha:0},{autoAlpha:1,duration:.8},2.5);
      // on scroll: the image drifts down and grows a touch, the scrim deepens, the copy lifts away
      var out=gsap.timeline({scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});
      out.fromTo(media,{yPercent:0,scale:1},{yPercent:16,scale:1.06,ease:'none'},0)
         .fromTo(scrim,{opacity:0},{opacity:.7,ease:'none'},0)
         .fromTo(copy,{y:0},{y:-70,ease:'none'},0);
      if(cue)gsap.to(cue,{opacity:0,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'+=160',scrub:true}});
      return function(){if(split)split.revert();};
    });

    // optional looping hero video: desktop, motion allowed, no Save-Data, and only if the file exists.
    // The still image (poster) paints first; the video is fetched only after the page has loaded.
    var src=C.heroLoop,saveData=navigator.connection&&navigator.connection.saveData;
    if(src&&!saveData&&/^https?:/.test(location.protocol)&&matchMedia(DESK+' and '+OK).matches){
      addEventListener('load',function(){
        var start=function(){
          fetch(src,{method:'HEAD'}).then(function(r){
            if(!r.ok||!/video/.test(r.headers.get('content-type')||'video'))return;
            var v=document.createElement('video');
            v.muted=true;v.loop=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-hidden','true');v.setAttribute('playsinline','');
            v.poster=img.currentSrc||img.src;v.src=src;
            v.addEventListener('playing',function(){gsap.to(v,{opacity:1,duration:1.2,ease:'power2.out'});if(kb)kb.pause();},{once:true});
            media.appendChild(v);var p=v.play();if(p&&p.catch)p.catch(function(){v.remove();});
          }).catch(function(){});
        };
        if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:2500});else setTimeout(start,1200);
      });
    }
  }

  // re-measure once web fonts and images have settled (prevents wrong trigger positions)
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){ScrollTrigger.refresh();});
  addEventListener('load',function(){ScrollTrigger.refresh();});
})();
