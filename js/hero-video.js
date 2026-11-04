// ======================= MOTION VIDEO HERO (reusable) =======================
// Works with css/hero-video.css on any <section class="hero--video"> that holds .hero-media > video.hero-video.
// - Fades the video in over the poster only once it really plays; if it errors or autoplay is blocked,
//   the poster stays. Reduced motion: no <source> matches (media queries), so only the poster shows.
//   Save-Data: the sources are removed before more is downloaded and the poster stays.
// - Pauses the video while the hero is off-screen and resumes it when it comes back.
// - While the hero scrolls away (768 px and up): the video and poster scale 1 -> 1.08 and the copy fades out.
//   Phones get neither: the video is left completely still while scrolling, so nothing repaints there.
//   One scroll listener, throttled with requestAnimationFrame; only CSS variables for transform/opacity change.
(function(){
  var hero=document.querySelector('.hero--video');if(!hero)return;
  var media=hero.querySelector('.hero-media'),video=hero.querySelector('.hero-video'),copy=hero.querySelector('.hero-copy');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData=!!(navigator.connection&&navigator.connection.saveData);
  var SCALE=0.08,FADE_START=0.3,FADE_END=0.75; // zoom added over the hero height; the copy fades between 30% and 75% of it

  // ---------- video: play, fade in, fall back to the poster ----------
  // The video (preload="none", no autoplay attribute) starts downloading only after the page's load event, so it
  // never competes with the poster, fonts and scripts; the poster shows until then.
  var wanted=false; // true once the video is allowed to play
  var onScreen=true;
  var stop=function(){if(!video)return;[].slice.call(video.querySelectorAll('source')).forEach(function(s){s.remove();});video.removeAttribute('autoplay');video.pause();try{video.load();}catch(e){}video=null;};
  var play=function(){if(!video)return;var p=video.play&&video.play();if(p&&p.catch)p.catch(function(){/* autoplay blocked: the poster stays */});};
  if(video){
    if(reduce||saveData)stop();
    else{
      video.addEventListener('playing',function(){media.classList.add('is-playing');});
      // the last <source> failing means no source could play: keep the poster
      var srcs=video.querySelectorAll('source');
      if(srcs.length)srcs[srcs.length-1].addEventListener('error',function(){media.classList.remove('is-playing');});
      video.addEventListener('error',function(){media.classList.remove('is-playing');});
      var begin=function(){if(!video)return;wanted=true;video.preload='auto';if(onScreen)play();};
      if(document.readyState==='complete')begin();else addEventListener('load',begin,{once:true});
    }
  }

  // ---------- pause off-screen, resume on return ----------
  if(video&&'IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      var e=es[0];onScreen=e.isIntersecting;if(!wanted||!video)return;
      if(e.isIntersecting)play();
      else video.pause();
    },{threshold:0,rootMargin:'120px 0px'}).observe(hero); // 120 px hysteresis: no pause/play toggling at the hero edge
  }

  // ---------- scroll: zoom the background, fade the copy ----------
  if(reduce)return;
  // phones: no zoom and no fade (the copy sits below the video and is read while scrolling)
  var wide=matchMedia('(min-width: 768px)');
  var ticking=false,last=-1;
  var update=function(){
    ticking=false;
    var h=hero.offsetHeight||innerHeight,p=Math.min(1,Math.max(0,(scrollY-hero.offsetTop)/h));
    if(!wide.matches)p=0;
    if(p===last)return;last=p;
    // set on the elements that use them, so a scroll frame restyles only the media layer and the copy
    media.style.setProperty('--hv-scale',(1+SCALE*p).toFixed(4));
    if(copy)copy.style.setProperty('--hv-copy',Math.min(1,Math.max(0,1-(p-FADE_START)/(FADE_END-FADE_START))).toFixed(3));
  };
  var onScroll=function(){if(!ticking){ticking=true;requestAnimationFrame(update);}};
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  update();
})();
