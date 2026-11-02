// ======================= VIDEO BAND (full-width looping clip below the fold) =======================
// Works with css/video-band.css on every .vband-frame that holds a video.vband-video (preload="none").
// - Nothing is downloaded at page load: the video loads and plays only when the band comes within 300 px of the
//   viewport, and pauses when it leaves, so it never competes with the hero video or the LCP image.
// - It fades in over the poster once it really plays; on an error or blocked autoplay the poster stays.
//   Reduced motion: no <source> matches (media queries), poster only. Save-Data: the sources are removed, poster only.
// - 768 px and up: a subtle zoom (1 -> 1.06) while the band scrolls through, one rAF-throttled scroll listener,
//   transform only. Phones keep the video still while scrolling.
(function(){
  var frames=[].slice.call(document.querySelectorAll('.vband-frame'));if(!frames.length)return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData=!!(navigator.connection&&navigator.connection.saveData);
  var SCALE=0.06,wide=matchMedia('(min-width: 768px)');

  frames.forEach(function(frame){
    var v=frame.querySelector('.vband-video');if(!v)return;
    if(reduce||saveData){[].slice.call(v.querySelectorAll('source')).forEach(function(s){s.remove();});return;}
    v.addEventListener('playing',function(){frame.classList.add('is-playing');});
    v.addEventListener('error',function(){frame.classList.remove('is-playing');});
    var srcs=v.querySelectorAll('source');if(srcs.length)srcs[srcs.length-1].addEventListener('error',function(){frame.classList.remove('is-playing');});
    var play=function(){var p=v.play();if(p&&p.catch)p.catch(function(){/* autoplay blocked: the poster stays */});};
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){if(es[0].isIntersecting)play();else v.pause();},{rootMargin:'300px 0px'}).observe(frame);
    }else play();
  });

  if(reduce)return;
  var ticking=false;
  var update=function(){
    ticking=false;
    frames.forEach(function(frame){
      var r=frame.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
      var p=wide.matches?Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight+r.height))):0;
      var s=(1+SCALE*p).toFixed(4);if(frame.__s===s)return;frame.__s=s;frame.style.setProperty('--vb-scale',s);
    });
  };
  var onScroll=function(){if(!ticking){ticking=true;requestAnimationFrame(update);}};
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});update();
})();
