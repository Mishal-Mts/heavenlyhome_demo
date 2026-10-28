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
      // split into lines only when the heading is about to come on screen (splitting is layout work)
      ScrollTrigger.create({trigger:el,start:'top bottom+=320',once:true,onEnter:function(){
        show(el);
        SplitText.create(el,{type:'lines',mask:'lines',linesClass:'ln',autoSplit:true,onSplit:function(self){
          return gsap.from(self.lines,{yPercent:115,duration:T.durLong,ease:T.ease,stagger:.1,scrollTrigger:trig(el)});
        }});
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
  // Everything below the hero is set up at the browser's first idle moment (see the end of this file),
  // so the hero paints and starts animating without waiting for the rest of the page to be measured.
  var later=[];

  // ---------- reveals (any width, motion allowed) ----------
  later.push(function(){
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
      var sc=el.hasAttribute('data-lowres')?1.04:1.18; // a small image is barely enlarged
      gsap.fromTo(el,{yPercent:-s,scale:sc},{yPercent:s,scale:sc,ease:'none',scrollTrigger:{trigger:box,start:'top bottom',end:'bottom top',scrub:true}});
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
    var SKY={ // [top, bottom, glow] from the brand palette: navy base, gold and red light
      dawn:  ['#0d2638','#1b2a44','rgba(242,215,166,.14)'],
      day:   ['#08303f','#0c4350','rgba(176,125,58,.16)'],
      sunset:['#14213a','#36202e','rgba(209,0,28,.22)'],
      dusk:  ['#071a26','#0f1d33','rgba(242,215,166,.10)']
    };
    var parse=function(c){var m=c.match(/[\d.]+/g);if(c[0]==='#'){var n=parseInt(c.slice(1),16);return [n>>16,n>>8&255,n&255,1];}return [+m[0],+m[1],+m[2],m[3]===undefined?1:+m[3]];};
    for(var k in SKY)SKY[k]=SKY[k].map(parse);
    var mix=function(a,b,t){return 'rgba('+[0,1,2].map(function(i){return Math.round(a[i]+(b[i]-a[i])*t);}).join(',')+','+(a[3]+(b[3]-a[3])*t).toFixed(3)+')';};
    // stops are scroll positions where a section's top reaches mid-screen
    var plan=[['#hero','dawn'],['#villas','day'],['#gallery','sunset'],['#location','dusk']],stops=[];
    var measure=function(){stops=plan.map(function(p){var el=$(p[0]);return el?{y:Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight/2),c:SKY[p[1]],n:p[1]}:null;}).filter(Boolean);stops[0].y=0;};
    var last='';
    var paint=function(){
      var y=scrollY,i=0;while(i<stops.length-1&&y>stops[i+1].y)i++;
      var a=stops[i],b=stops[Math.min(i+1,stops.length-1)],t=b.y>a.y?Math.min(1,Math.max(0,(y-a.y)/(b.y-a.y))):0;
      var v=[0,1,2].map(function(j){return mix(a.c[j],b.c[j],t);}),key=v.join();
      if(key===last)return;last=key;
      atm.style.setProperty('--atm-top',v[0]);atm.style.setProperty('--atm-bottom',v[1]);atm.style.setProperty('--atm-glow',v[2]);
      // optional faint sky images (CONFIG.images atmos-*): each stage's image fades with its colours
      ['dawn','day','sunset','dusk'].forEach(function(n){atm.style.setProperty('--w-'+n,(n===a.n?1-t:0)+(n===b.n&&b!==a?t:0));});
    };
    measure();paint();
    // refreshPriority -1: measured after the pinned scenes have added their scroll distance
    ScrollTrigger.create({start:0,end:'max',refreshPriority:-1,onUpdate:paint,onRefresh:function(){measure();paint();}});
  }
  });

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
      var lo=img.hasAttribute('data-lowres'); // a small brochure image zooms less, so it is not visibly enlarged
      kb.fromTo(img,{scale:lo?1.06:1.14},{scale:lo?1:1.02,duration:2.8,ease:'power2.out'})
        .to(img,{scale:lo?1.03:1.09,duration:18,ease:'sine.inOut',yoyo:true,repeat:-1});
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
    // The image script (update-images.bat) writes data-loop on the hero when CONFIG.heroLoop's file exists,
    // so no request is ever made for a missing video. The still image paints first; the video starts after load.
    var src=hero.getAttribute('data-loop'),saveData=navigator.connection&&navigator.connection.saveData;
    if(src&&!saveData&&matchMedia(DESK+' and '+OK).matches){
      addEventListener('load',function(){
        var start=function(){
          var v=document.createElement('video');
          v.muted=true;v.loop=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-hidden','true');v.setAttribute('playsinline','');
          v.poster=img.currentSrc||img.src;v.src=src;
          v.addEventListener('playing',function(){gsap.to(v,{opacity:1,duration:1.2,ease:'power2.out'});if(kb)kb.pause();},{once:true});
          v.addEventListener('error',function(){v.remove();});
          media.appendChild(v);var p=v.play();if(p&&p.catch)p.catch(function(){v.remove();});
        };
        if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:2500});else setTimeout(start,1200);
      });
    }
  }

  // ---------- signature scenes (desktop, tall enough screen, motion allowed) ----------
  later.push(function(){
  var PIN=DESK+' and (min-height: 700px) and '+OK;
  // jump the page to the point of a pinned scene where a focused element is visible (keyboard users)
  var seek=function(st,p){var y=st.start+(st.end-st.start)*p;if(lenis)lenis.scrollTo(y,{immediate:true});else scrollTo(0,y);};

  // villas: the Premium and Budget cards share one stage and crossfade with scroll; the plan card follows as its own panel
  var vScene=$('#villas .v-scene');
  if(vScene&&!late)mm.add(PIN,function(){
    var sec=$('#villas'),car=$('.car',vScene),track=$('.car-track',car),slides=[].slice.call(track.children);
    var a=slides[0],b=slides[1],plan=slides[2],holder=document.createElement('div');
    holder.className='v-plan';vScene.parentNode.insertBefore(holder,vScene.nextSibling);holder.appendChild(plan);
    sec.classList.add('is-pinned');
    var bodyA=$$('.body>*',a),bodyB=$$('.body>*',b),imgA=$('.ph img',a),imgB=$('.ph img',b);
    var setActive=function(p){var on=p>.5;a.style.pointerEvents=on?'none':'';b.style.pointerEvents=on?'':'none';a.setAttribute('aria-hidden',on);b.setAttribute('aria-hidden',!on);};
    gsap.set(b,{opacity:0});setActive(0);
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:vScene,start:'top top',end:'+=130%',pin:true,scrub:true,anticipatePin:1,refreshPriority:2,
      onUpdate:function(s){setActive(s.progress);}}});
    // the first card's text leaves before the second card's text arrives, so the two never overlap
    tl.to({},{duration:.3})
      .to(bodyA,{y:-24,opacity:0,stagger:.03,duration:.3},'swap')
      .to(imgA,{scale:1.08,duration:1},'swap')
      .to(b,{opacity:1,duration:.4},'swap+=.3')           // the second card fades in on top of the still-opaque first card
      .set(a,{opacity:0},'swap+=.71')
      .fromTo(imgB,{scale:1.16},{scale:1,duration:1},'swap+=.1')
      .fromTo(bodyB,{y:34,opacity:0},{y:0,opacity:1,stagger:.06,duration:.4},'swap+=.62')
      .to({},{duration:.3});
    var onFocus=function(e){var st=tl.scrollTrigger;seek(st,b.contains(e.target)?.95:0);};
    a.addEventListener('focusin',onFocus);b.addEventListener('focusin',onFocus);
    return function(){
      a.removeEventListener('focusin',onFocus);b.removeEventListener('focusin',onFocus);
      track.appendChild(plan);holder.remove();sec.classList.remove('is-pinned');
      [a,b].forEach(function(s){s.style.pointerEvents='';s.removeAttribute('aria-hidden');});
      gsap.set([a,b,imgA,imgB].concat(bodyA,bodyB),{clearProps:'opacity,transform'});
      if(car.refresh)car.refresh();
    };
  });

  // gallery: the image row scrolls sideways while the section is pinned; the lightbox still opens on click
  var gal=$('#gallery');
  if(gal&&!late)mm.add(PIN,function(){
    var track=$('.car-track',gal),car=$('.car',gal);
    gal.classList.add('is-hscroll');
    var vis=function(){return [].slice.call(track.children).filter(function(s){return !s.hidden;});};
    var dist=function(){var s=vis(),last=s[s.length-1];return last?Math.max(0,last.offsetLeft+last.offsetWidth-track.clientWidth):0;};
    var tw=gsap.to(track,{x:function(){return -dist();},ease:'none',scrollTrigger:{trigger:gal,start:'top top',end:function(){return '+='+dist();},pin:true,scrub:true,anticipatePin:1,invalidateOnRefresh:true,refreshPriority:1}});
    var onFocus=function(e){var s=e.target.closest('.car-slide');if(!s)return;var d=dist();seek(tw.scrollTrigger,d?Math.min(1,s.offsetLeft/d):0);};
    track.addEventListener('focusin',onFocus);
    return function(){track.removeEventListener('focusin',onFocus);gal.classList.remove('is-hscroll');gsap.set(track,{clearProps:'transform'});if(car.refresh)car.refresh();};
  });

  // location sketch: the route from the project to NH-66 draws itself as the map scrolls into view
  var route=$('#mapbox .route-draw');
  if(route&&!late)mm.add(OK,function(){
    gsap.fromTo(route,{strokeDashoffset:1},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'#mapbox',start:'top 80%',end:'center 50%',scrub:true}});
  });
  });

  // optional gallery slides appearing later change the layout
  document.addEventListener('site:layout',function(){ScrollTrigger.refresh();});

  // run the deferred set-up at the first idle moment (at most ~1.2 s after start), in page order, then measure once
  var ready=false;
  var runLater=function(){if(ready)return;ready=true;later.forEach(function(f){f();});ScrollTrigger.sort();ScrollTrigger.refresh();};
  if('requestIdleCallback' in window)requestIdleCallback(runLater,{timeout:1200});else setTimeout(runLater,300);
  // re-measure whenever the page height changes (late web fonts re-wrapping text, optional photos appearing...),
  // so scroll-triggered reveals never wait at stale positions
  addEventListener('load',function(){if(ready)ScrollTrigger.refresh();});
  if('ResizeObserver' in window){
    var lastH=0,rt=0,main=$('main');
    new ResizeObserver(function(){var h=main.offsetHeight;if(!ready||Math.abs(h-lastH)<2)return;lastH=h;clearTimeout(rt);rt=setTimeout(function(){ScrollTrigger.refresh();},200);}).observe(main);
  }
})();
