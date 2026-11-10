(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))t(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&t(l)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function t(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function _(o=""){const e=o?`${o}-`:"";return`
    <defs>
      <!-- Outer Body Spherical Gradient: Dark Slate Lavender Shell -->
      <linearGradient id="${e}outerBodyGrad" x1="20%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#877a8e" />
        <stop offset="40%" stop-color="#766589" />
        <stop offset="80%" stop-color="#644e7f" />
        <stop offset="100%" stop-color="#553e71" />
      </linearGradient>

      <!-- Outer Rim Bottom Luminous Highlight (Iconic glowing violet rim from reference) -->
      <radialGradient id="${e}rimLightGrad" cx="50%" cy="94%" r="52%">
        <stop offset="0%" stop-color="#dcbbfb" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#bf9ee8" stop-opacity="0.65" />
        <stop offset="70%" stop-color="#916fc2" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#644e7f" stop-opacity="0" />
      </radialGradient>

      <!-- Inner Face Gradient: Full, Plump, Pillowy Pastel Lilac-Pink -->
      <linearGradient id="${e}faceBodyGrad" x1="30%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#fdf4fd" />
        <stop offset="25%" stop-color="#fae8f8" />
        <stop offset="60%" stop-color="#f1dbf6" />
        <stop offset="85%" stop-color="#e5cdf2" />
        <stop offset="100%" stop-color="#d6bcf0" />
      </linearGradient>

      <!-- Plush Spherical Top Specular Glow (Gives round toy-like volume) -->
      <radialGradient id="${e}plushTopGlow" cx="42%" cy="28%" r="55%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="45%" stop-color="#ffffff" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>

      <!-- Inner Edge Soft Depth Shade (Separates face from outer shell naturally) -->
      <radialGradient id="${e}faceDepthGrad" cx="50%" cy="50%" r="50%">
        <stop offset="78%" stop-color="#7e629b" stop-opacity="0" />
        <stop offset="92%" stop-color="#7e629b" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#563b72" stop-opacity="0.48" />
      </radialGradient>

      <!-- Soft Cheek Blush: Delicate Pastel Rose-Lilac -->
      <radialGradient id="${e}blushGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f49ecf" stop-opacity="0.45" />
        <stop offset="55%" stop-color="#e99dc9" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#e99dc9" stop-opacity="0" />
      </radialGradient>

      <!-- Eye Color Gradient: Deep Dark Eggplant/Plum -->
      <linearGradient id="${e}eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#462e57" />
        <stop offset="100%" stop-color="#321e42" />
      </linearGradient>

      <!-- Ambient Glow Behind Mascot -->
      <radialGradient id="${e}ambientBacklight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#b488ed" stop-opacity="0.28" />
        <stop offset="50%" stop-color="#7e52be" stop-opacity="0.12" />
        <stop offset="80%" stop-color="#4e2c84" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#08080b" stop-opacity="0" />
      </radialGradient>

      <!-- Detective Hat Gradients (Jaunty Fedora) -->
      <linearGradient id="${e}hatCrownGrad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="#9d81bf" />
        <stop offset="45%" stop-color="#8468a5" />
        <stop offset="100%" stop-color="#694e8a" />
      </linearGradient>
      <linearGradient id="${e}hatBrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#735693" />
        <stop offset="50%" stop-color="#8e73b0" />
        <stop offset="100%" stop-color="#6a4d8a" />
      </linearGradient>
      <linearGradient id="${e}hatBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#48325b" />
        <stop offset="100%" stop-color="#311e42" />
      </linearGradient>

      <!-- Headphone Ear Cup Gradient -->
      <linearGradient id="${e}earCupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ab8ecf" />
        <stop offset="50%" stop-color="#8d70ac" />
        <stop offset="100%" stop-color="#694d86" />
      </linearGradient>

      <!-- Magnifying Glass Gradients -->
      <linearGradient id="${e}lensFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c4abe3" />
        <stop offset="40%" stop-color="#9e84bd" />
        <stop offset="100%" stop-color="#70548e" />
      </linearGradient>
      <linearGradient id="${e}lensGlassGrad" x1="30%" y1="10%" x2="70%" y2="90%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
        <stop offset="45%" stop-color="#ede3fd" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#b695ee" stop-opacity="0.22" />
      </linearGradient>
      <linearGradient id="${e}handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5a4173" />
        <stop offset="50%" stop-color="#452f5b" />
        <stop offset="100%" stop-color="#301b44" />
      </linearGradient>

      <!-- Reasoning Prism Gradient (d1-2B) -->
      <linearGradient id="${e}prismFacet1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f5bbfd" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>
      <linearGradient id="${e}prismFacet2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>
      <linearGradient id="${e}prismFacet3" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>

      <!-- Filters -->
      <filter id="${e}magGlassGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="-1" dy="2.5" stdDeviation="3" flood-color="#000000" flood-opacity="0.5" />
      </filter>

      <filter id="${e}prismGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `}const E={idle:{name:"Idle",bodyTransform:"translate(0, 0) rotate(0)",headTilt:0,blushOpacity:.38,blushScale:1,leftEye:{type:"oval",cx:74,cy:98,rx:3.3,ry:5,rotation:10,glint:!0,sparkle:!1},rightEye:{type:"oval",cx:106,cy:92,rx:3.3,ry:5,rotation:10,glint:!0,sparkle:!1},eyebrows:{visible:!1,leftD:"M 71 89 Q 74 88 78 89",rightD:"M 102 85 Q 106 84 110 85"},mouth:{d:"M 87.5 97.5 Q 90.2 101.5 93.5 97",fill:"none",stroke:"#352046",strokeWidth:2.1,hasTongue:!1}},happy:{name:"Happy",bodyTransform:"translate(0, -6px) scale(1.02, 0.98)",headTilt:2,blushOpacity:.65,blushScale:1.25,leftEye:{type:"arc",d:"M 70 99 Q 74 93.5 78 99",strokeWidth:2.6,glint:!1,sparkle:!1},rightEye:{type:"arc",d:"M 102 93.5 Q 106 88 110 93.5",strokeWidth:2.6,glint:!1,sparkle:!1},eyebrows:{visible:!1,leftD:"M 71 88 Q 74 86 78 88",rightD:"M 102 84 Q 106 82 110 84"},mouth:{d:"M 87 97 Q 90.5 103.5 94 96.5 Z",fill:"#352046",stroke:"#352046",strokeWidth:1.5,hasTongue:!0,tongueD:"M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z"}},sad:{name:"Sad",bodyTransform:"translate(0, 3px) rotate(-1.5deg)",headTilt:-2.5,blushOpacity:.2,blushScale:.9,leftEye:{type:"droop",cx:74,cy:99.5,rx:3.1,ry:4.4,rotation:18,glint:!0,sparkle:!1},rightEye:{type:"droop",cx:106,cy:93.5,rx:3.1,ry:4.4,rotation:18,glint:!0,sparkle:!1},eyebrows:{visible:!0,leftD:"M 71 91 Q 74 92.5 78 93",rightD:"M 102 89 Q 105 88 109 86.5"},mouth:{d:"M 87.5 100.5 Q 90.5 97.5 93.5 100.5",fill:"none",stroke:"#352046",strokeWidth:2.1,hasTongue:!1}},angry:{name:"Angry",bodyTransform:"translate(0, 1px) scale(0.99, 1.01)",headTilt:-1,blushOpacity:.45,blushScale:1.1,leftEye:{type:"narrow",cx:74,cy:98.5,rx:3.3,ry:4,rotation:5,glint:!1,sparkle:!1},rightEye:{type:"narrow",cx:106,cy:92.5,rx:3.3,ry:4,rotation:5,glint:!1,sparkle:!1},eyebrows:{visible:!0,leftD:"M 72 91 L 78 93.5",rightD:"M 102 91 L 108 88"},mouth:{d:"M 87.5 99.5 Q 90.5 98.5 93.5 99.5",fill:"none",stroke:"#352046",strokeWidth:2.2,hasTongue:!1}},excited:{name:"Excited",bodyTransform:"translate(0, -8px) scale(1.03, 0.97) rotate(2deg)",headTilt:3,blushOpacity:.7,blushScale:1.3,leftEye:{type:"sparkle",cx:74,cy:97,rx:3.6,ry:5.4,rotation:8,glint:!1,sparkle:!0},rightEye:{type:"sparkle",cx:106,cy:91,rx:3.6,ry:5.4,rotation:8,glint:!1,sparkle:!0},eyebrows:{visible:!0,leftD:"M 71 87 Q 74 84 78 87",rightD:"M 102 83 Q 106 80 110 83"},mouth:{d:"M 86.5 96.5 Q 90.5 104 94.5 96 Z",fill:"#352046",stroke:"#352046",strokeWidth:1.5,hasTongue:!0,tongueD:"M 88 100.5 Q 90.5 98 93 100.5 Q 90.5 103 88 100.5 Z"}},surprised:{name:"Surprised",bodyTransform:"translate(0, -5px) scale(0.97, 1.04)",headTilt:0,blushOpacity:.5,blushScale:1.2,leftEye:{type:"oval",cx:74,cy:97,rx:4,ry:5.8,rotation:8,glint:!0,sparkle:!1},rightEye:{type:"oval",cx:106,cy:91,rx:4,ry:5.8,rotation:8,glint:!0,sparkle:!1},eyebrows:{visible:!0,leftD:"M 70 85 Q 74 82 78 85",rightD:"M 102 81 Q 106 78 110 81"},mouth:{d:"M 88.5 98.5 A 2.5 3.2 0 1 0 92.5 98.5 A 2.5 3.2 0 1 0 88.5 98.5 Z",fill:"#352046",stroke:"#352046",strokeWidth:1.2,hasTongue:!1}},curious:{name:"Curious",bodyTransform:"translate(1px, -3px) rotate(5deg)",headTilt:6,blushOpacity:.45,blushScale:1.05,leftEye:{type:"oval",cx:74,cy:97.5,rx:3.5,ry:5.2,rotation:14,glint:!0,sparkle:!1},rightEye:{type:"oval",cx:106,cy:91,rx:3.2,ry:4.6,rotation:14,glint:!0,sparkle:!1},eyebrows:{visible:!0,leftD:"M 71 87 Q 74 85 78 87",rightD:"M 102 84 Q 106 83 110 85"},mouth:{d:"M 88 98 Q 91 100 94 97.5",fill:"none",stroke:"#352046",strokeWidth:2.1,hasTongue:!1}},shy:{name:"Shy",bodyTransform:"translate(0, 2px) rotate(-2deg)",headTilt:-3,blushOpacity:.75,blushScale:1.45,leftEye:{type:"droop",cx:73,cy:99,rx:3,ry:4.2,rotation:16,glint:!0,sparkle:!1},rightEye:{type:"droop",cx:105,cy:93,rx:3,ry:4.2,rotation:16,glint:!0,sparkle:!1},eyebrows:{visible:!1,leftD:"M 71 89 Q 74 88 78 89",rightD:"M 102 85 Q 106 84 110 85"},mouth:{d:"M 88 98.5 Q 90.5 100 93 98",fill:"none",stroke:"#352046",strokeWidth:2,hasTongue:!1}},sleepy:{name:"Sleepy",bodyTransform:"translate(0, 3px) scale(1.02, 0.98)",headTilt:-2,blushOpacity:.3,blushScale:1,leftEye:{type:"droop",cx:74,cy:99.5,rx:3.4,ry:2.8,rotation:10,glint:!1,sparkle:!1},rightEye:{type:"droop",cx:106,cy:93.5,rx:3.4,ry:2.8,rotation:10,glint:!1,sparkle:!1},eyebrows:{visible:!1,leftD:"M 71 89 Q 74 88 78 89",rightD:"M 102 85 Q 106 84 110 85"},mouth:{d:"M 88.5 98 Q 90.5 101.5 92.5 98 Z",fill:"#352046",stroke:"#352046",strokeWidth:1.2,hasTongue:!1}},confused:{name:"Confused",bodyTransform:"translate(-1px, 0px) rotate(-4deg)",headTilt:-4,blushOpacity:.35,blushScale:1,leftEye:{type:"oval",cx:74,cy:97.5,rx:3.6,ry:5.2,rotation:6,glint:!0,sparkle:!1},rightEye:{type:"narrow",cx:106,cy:92.5,rx:3,ry:3.8,rotation:8,glint:!0,sparkle:!1},eyebrows:{visible:!0,leftD:"M 71 86 Q 74 84 78 86",rightD:"M 102 87 Q 106 89 110 88"},mouth:{d:"M 87.5 98 Q 89.5 96 91 98 Q 92.5 100 94 97.5",fill:"none",stroke:"#352046",strokeWidth:2,hasTongue:!1}},proud:{name:"Proud",bodyTransform:"translate(0, -6px) scale(1.03, 0.97)",headTilt:1,blushOpacity:.65,blushScale:1.3,leftEye:{type:"arc",d:"M 70 98 Q 74 93 78 98",strokeWidth:2.6,glint:!1,sparkle:!1},rightEye:{type:"arc",d:"M 102 92.5 Q 106 87.5 110 92.5",strokeWidth:2.6,glint:!1,sparkle:!1},eyebrows:{visible:!1,leftD:"M 71 88 Q 74 86 78 88",rightD:"M 102 84 Q 106 82 110 84"},mouth:{d:"M 87 97.5 Q 89 100 90.5 98 Q 92 100 94 97",fill:"none",stroke:"#352046",strokeWidth:2.1,hasTongue:!1}},wink:{name:"Wink",bodyTransform:"translate(0, -3px) rotate(2deg)",headTilt:2,blushOpacity:.6,blushScale:1.25,leftEye:{type:"arc",d:"M 70 99 Q 74 94 78 99",strokeWidth:2.8,glint:!1,sparkle:!1},rightEye:{type:"sparkle",cx:106,cy:91,rx:3.6,ry:5.4,rotation:8,glint:!1,sparkle:!0},eyebrows:{visible:!0,leftD:"M 71 90 Q 74 89 78 90",rightD:"M 102 83 Q 106 80 110 83"},mouth:{d:"M 87.5 97 Q 90.5 102.5 94 96.5 Z",fill:"#352046",stroke:"#352046",strokeWidth:1.4,hasTongue:!0,tongueD:"M 89 100.5 Q 90.8 99 92.5 100.5 Z"}},thinking:{name:"Thinking",bodyTransform:"translate(0, -2px) rotate(3deg)",headTilt:4,blushOpacity:.4,blushScale:1.1,leftEye:{type:"oval",cx:75,cy:96,rx:3.2,ry:4.8,rotation:12,glint:!0,sparkle:!1},rightEye:{type:"oval",cx:107,cy:90,rx:3.2,ry:4.8,rotation:12,glint:!0,sparkle:!1},eyebrows:{visible:!0,leftD:"M 71 87 Q 74 86 78 88",rightD:"M 102 83 Q 106 81 110 83"},mouth:{d:"M 88 98 Q 91 97 93.5 98.5",fill:"none",stroke:"#352046",strokeWidth:2.1,hasTongue:!1}}},Y={"lfm3-17b":{strideRate:1,runTilt:4,jumpTilt:-5,landSquash:"scale(1.12, 0.88)",accessoryRunClass:""},"lfm3-vl-2b":{strideRate:1.06,runTilt:5,jumpTilt:-4,landSquash:"scale(1.14, 0.86)",accessoryRunClass:"runner-glasses-jiggle"},"lfm3-audio-2b":{strideRate:.96,runTilt:3,jumpTilt:-5,landSquash:"scale(1.13, 0.87)",accessoryRunClass:"runner-headphones-beat"},"lfm3-omni-2b":{strideRate:1.02,runTilt:4.5,jumpTilt:-5,landSquash:"scale(1.13, 0.87)",accessoryRunClass:"runner-omni-stride"},"d1-2b":{strideRate:.98,runTilt:3.5,jumpTilt:-4,landSquash:"scale(1.12, 0.88)",accessoryRunClass:"runner-prism-trail"},"d1-omni-2b":{strideRate:1.05,runTilt:5.5,jumpTilt:-6,landSquash:"scale(1.15, 0.85)",accessoryRunClass:"runner-detective-dash"}};function z(o,e){if(!o||!o.svgElement)return;const i=o.svgElement,t=i.querySelector(".mascot-body-root"),s=i.querySelector(".mascot-inner-face"),r=i.querySelector(".mascot-mouth"),l=i.querySelector(".mascot-tongue"),a=i.querySelector(".eye-left .eye-shape"),c=i.querySelector(".eye-right .eye-shape"),n=i.querySelector(".eye-left .eye-arc"),f=i.querySelector(".eye-right .eye-arc"),y=i.querySelector(".eye-left .eye-glint"),m=i.querySelector(".eye-right .eye-glint"),d=i.querySelector(".eye-left .eye-sparkle"),u=i.querySelector(".eye-right .eye-sparkle"),g=i.querySelector(".eyebrow-left"),p=i.querySelector(".eyebrow-right"),b=Y[o.id]||Y["lfm3-17b"];switch(t.classList.remove("loco-run","loco-takeoff","loco-jump","loco-dodge","loco-land","loco-hurt","loco-victory"),t.classList.add(`loco-${e}`),e){case"run":a&&c&&(a.style.opacity="1",c.style.opacity="1",a.setAttribute("rx","3.3"),a.setAttribute("ry","4.8"),c.setAttribute("rx","3.3"),c.setAttribute("ry","4.8")),n&&(n.style.opacity="0"),f&&(f.style.opacity="0"),y&&(y.style.opacity="0.95"),m&&(m.style.opacity="0.95"),d&&(d.style.opacity="0"),u&&(u.style.opacity="0"),g&&(g.style.opacity="0"),p&&(p.style.opacity="0"),r&&(r.setAttribute("d","M 87.5 97.5 Q 90.2 102 93.5 97"),r.setAttribute("fill","none"),r.setAttribute("stroke","#352046"),r.setAttribute("stroke-width","2.1")),l&&(l.style.opacity="0"),s&&(s.style.transform=`rotate(${b.runTilt}deg)`);break;case"takeoff":t.style.transform="scale(1.15, 0.85)",s&&(s.style.transform="translateY(1.5px)");break;case"jump":t.style.transform="scale(0.92, 1.1) rotate(-3deg)",s&&(s.style.transform=`rotate(${b.jumpTilt}deg)`),o.id.includes("audio")?(a&&(a.style.opacity="0"),c&&(c.style.opacity="0"),n&&(n.setAttribute("d","M 70 98 Q 74 92 78 98"),n.style.opacity="1"),f&&(f.setAttribute("d","M 102 92.5 Q 106 86.5 110 92.5"),f.style.opacity="1"),r&&(r.setAttribute("d","M 87 96.5 Q 90.5 103 94 96.5 Z"),r.setAttribute("fill","#352046"))):(a&&c&&(a.style.opacity="1",c.style.opacity="1",a.setAttribute("rx","3.8"),a.setAttribute("ry","5.4"),c.setAttribute("rx","3.8"),c.setAttribute("ry","5.4")),n&&(n.style.opacity="0"),f&&(f.style.opacity="0"),y&&(y.style.opacity="1"),m&&(m.style.opacity="1"),r&&(r.setAttribute("d","M 88 97.5 A 2.6 3.2 0 1 0 93.2 97.5 A 2.6 3.2 0 1 0 88 97.5 Z"),r.setAttribute("fill","#352046")));break;case"dodge":t.style.transform="scale(1.36, 0.62) translateY(14px)",s&&(s.style.transform=`scale(1.2, 0.7) translateY(8px) rotate(${b.runTilt*.5}deg)`),o.id.includes("audio")||o.id.includes("17b")?(a&&(a.style.opacity="0"),c&&(c.style.opacity="0"),n&&(n.setAttribute("d","M 70 100 Q 74 94 78 100"),n.style.opacity="1"),f&&(f.setAttribute("d","M 102 94.5 Q 106 88.5 110 94.5"),f.style.opacity="1")):(a&&c&&(a.style.opacity="1",c.style.opacity="1",a.setAttribute("rx","3.6"),a.setAttribute("ry","2.5"),c.setAttribute("rx","3.6"),c.setAttribute("ry","2.5")),n&&(n.style.opacity="0"),f&&(f.style.opacity="0")),g&&p&&(g.setAttribute("d","M 71 91 Q 74 90 78 91"),p.setAttribute("d","M 102 87 Q 106 86 110 87"),g.style.opacity="0.7",p.style.opacity="0.7"),r&&(r.setAttribute("d","M 87 99 Q 90.5 102.5 94 99"),r.setAttribute("fill","none"),r.setAttribute("stroke","#352046"),r.setAttribute("stroke-width","2.2")),l&&(l.style.opacity="0");break;case"land":t.style.transform=b.landSquash,s&&(s.style.transform="translateY(2px)");break;case"hurt":t.style.transform="rotate(-10deg) translateY(3px)",a&&c&&(a.style.opacity="1",c.style.opacity="1",a.setAttribute("rx","2.9"),a.setAttribute("ry","3.9"),c.setAttribute("rx","2.9"),c.setAttribute("ry","3.9")),g&&p&&(g.setAttribute("d","M 71 92 Q 74 93.5 78 94"),p.setAttribute("d","M 102 90 Q 105 89 109 87.5"),g.style.opacity="0.9",p.style.opacity="0.9"),r&&(r.setAttribute("d","M 87.5 101 Q 90.2 97.5 93.5 101"),r.setAttribute("fill","none"),r.setAttribute("stroke","#352046"),r.setAttribute("stroke-width","2.2")),l&&(l.style.opacity="0");break;case"victory":t.style.transform="translateY(-10px) scale(1.04, 0.96) rotate(3deg)",a&&(a.style.opacity="0"),c&&(c.style.opacity="0"),n&&(n.setAttribute("d","M 70 99 Q 74 93.5 78 99"),n.style.opacity="1"),f&&(f.setAttribute("d","M 102 93.5 Q 106 88 110 93.5"),f.style.opacity="1"),d&&(d.style.opacity="1"),u&&(u.style.opacity="1"),r&&(r.setAttribute("d","M 87 97 Q 90.5 103.5 94 96.5 Z"),r.setAttribute("fill","#352046")),l&&(l.setAttribute("d","M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z"),l.style.opacity="1");break;case"idle":default:t.style.transform="",s&&(s.style.transform=""),o.applyEmotion("idle",!0);break}}const H={"lfm3-17b":{sequence:["idle","curious","idle","happy","idle","excited","idle","shy"],reactions:["curious","happy","surprised","shy","excited"],blink:[2300,4600]},"lfm3-vl-2b":{sequence:["idle","thinking","idle","curious","idle","surprised","idle","proud"],reactions:["curious","surprised","thinking","confused","proud"],blink:[3e3,5900]},"lfm3-audio-2b":{sequence:["idle","happy","idle","excited","idle","sleepy","idle","shy"],reactions:["happy","excited","sleepy","surprised","wink"],blink:[2700,5400]},"lfm3-omni-2b":{sequence:["idle","excited","idle","curious","idle","happy","idle","proud"],reactions:["excited","surprised","curious","happy","proud"],blink:[2200,4800]},"d1-2b":{sequence:["idle","thinking","idle","confused","idle","curious","idle","proud"],reactions:["thinking","confused","curious","proud","happy"],blink:[3700,7e3]},"d1-omni-2b":{sequence:["idle","curious","idle","proud","idle","thinking","idle","excited"],reactions:["curious","proud","thinking","surprised","wink"],blink:[2500,5400]}};function ee(o){return H[o.replace(/^(inline|game)-/,"")]||H["lfm3-17b"]}function te(o,e,i,t){const s=o-i,r=e-t,l=Math.hypot(s,r);if(l<=5)return{x:0,y:0};const a=Math.min(l/300,1);return{x:s/l*2.4*a,y:r/l*1.8*a}}function ie(o=""){return`
    <g class="accessory-glasses" style="transform-origin: 90px 95px;">
      <!-- Left Lens Glass Subtle Sheen & Glint -->
      <circle cx="74" cy="98" r="13" fill="#ffffff" fill-opacity="0.14" />
      <path d="M 65 94 A 11 11 0 0 1 78 89" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="81" cy="93" r="1.2" fill="#ffffff" opacity="0.9" />
      
      <!-- Right Lens Glass Subtle Sheen & Glint -->
      <circle cx="106" cy="92" r="13" fill="#ffffff" fill-opacity="0.14" />
      <path d="M 97 88 A 11 11 0 0 1 110 83" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="113" cy="87" r="1.2" fill="#ffffff" opacity="0.9" />

      <!-- Left Wireframe Frame (Bright crisp white with drop shadow for pop) -->
      <circle cx="74" cy="98" r="13" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 2px 3px rgba(35,20,50,0.45))" />

      <!-- Right Wireframe Frame -->
      <circle cx="106" cy="92" r="13" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 2px 3px rgba(35,20,50,0.45))" />

      <!-- Angled Bridge between lenses -->
      <path d="M 86 96.5 Q 90 92 94 94.5" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 1px 2px rgba(35,20,50,0.35))" />

      <!-- Left & Right Temples / Hinges extending to outer rim -->
      <path d="M 61 98 L 51 98.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
      <path d="M 119 92 L 129 91.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
    </g>
  `}function se(o=""){return`
    <g class="accessory-headphones" style="transform-origin: 90px 85px;">
      <!-- Headband Arc: Sweeping closely over the plush orb head with dimensional thickness -->
      <path d="M 41 96 C 41 43 139 43 139 93" fill="none" stroke="#362248" stroke-width="6.5" stroke-linecap="round" />
      <path d="M 46 90 C 46 48 134 48 134 87" fill="none" stroke="#5a3f74" stroke-width="2.6" stroke-linecap="round" opacity="0.9" />

      <!-- Left Pivot Mount -->
      <rect x="37" y="86" width="8" height="11" rx="3" fill="#251436" stroke="#48325a" stroke-width="1" />

      <!-- Left Ear Cup (Deep, Plush, 3D Cushion) -->
      <g class="earcup-left" style="transform-origin: 40px 94px;">
        <!-- Drop Shadow Back -->
        <rect x="31" y="76" width="18" height="36" rx="9" fill="#1b0c2a" opacity="0.5" />
        <!-- Main Ear Cup Body -->
        <rect x="32" y="75" width="16" height="36" rx="8" fill="url(#${o}earCupGrad)" stroke="#39244f" stroke-width="1.8" />
        <!-- Inner Soft Cushion Core -->
        <rect x="36" y="80" width="9" height="26" rx="4.5" fill="#543870" />
        <!-- Cup Specular Rim Highlight -->
        <path d="M 34.5 78 L 34.5 108" stroke="#dec9fc" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
      </g>

      <!-- Right Pivot Mount -->
      <rect x="135" y="83" width="8" height="11" rx="3" fill="#251436" stroke="#48325a" stroke-width="1" />

      <!-- Right Ear Cup -->
      <g class="earcup-right" style="transform-origin: 140px 91px;">
        <!-- Drop Shadow Back -->
        <rect x="131" y="73" width="18" height="36" rx="9" fill="#1b0c2a" opacity="0.5" />
        <!-- Main Ear Cup Body -->
        <rect x="132" y="72" width="16" height="36" rx="8" fill="url(#${o}earCupGrad)" stroke="#39244f" stroke-width="1.8" />
        <!-- Inner Soft Cushion Core -->
        <rect x="135" y="77" width="9" height="26" rx="4.5" fill="#543870" />
        <!-- Cup Specular Rim Highlight -->
        <path d="M 134.5 75 L 134.5 105" stroke="#dec9fc" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
      </g>
    </g>
  `}function re(o=""){return`
    <g class="accessory-hat" style="transform-origin: 88px 65px;">
      <!-- Hat Shadow on Mascot Head -->
      <ellipse cx="88" cy="72" rx="42" ry="9" fill="#150a22" opacity="0.45" />

      <!-- Hat Crown (Creased Fedora Top with Soft Depth) -->
      <path d="M 56 68 C 55 45 68 37 85 38 C 102 39 120 42 123 65 Z" fill="url(#${o}hatCrownGrad)" stroke="#452e5d" stroke-width="1.5" />
      <!-- Indented Top Crease Fold -->
      <path d="M 70 42 Q 86 46 100 42" fill="none" stroke="#412957" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      <path d="M 85 44 L 85 54" fill="none" stroke="#3f2754" stroke-width="2.4" stroke-linecap="round" opacity="0.5" />

      <!-- Hatband Ribbon (Dark Plum with Crisp Edge) -->
      <path d="M 55 67 C 75 71 106 68 123 64 L 123 58 C 106 62 75 65 55 61 Z" fill="url(#${o}hatBandGrad)" />
      <!-- Hatband Specular Highlight -->
      <path d="M 57 63 C 76 67 105 64 121 60" fill="none" stroke="#9d7ebd" stroke-width="1.1" opacity="0.75" />

      <!-- Hat Brim (Curled Jaunty Fedora Brim) -->
      <path d="M 43 72 C 64 77 116 73 137 64 C 125 59 66 62 43 72 Z" fill="url(#${o}hatBrimGrad)" stroke="#452e5d" stroke-width="1.5" />
      <path d="M 45 72 C 66 76 114 72 134 64" fill="none" stroke="#d5beff" stroke-width="1.5" opacity="0.75" />
    </g>
  `}function oe(o=""){return`
    <g class="accessory-magnifier" filter="url(#${o}magGlassGlow)" style="transform-origin: 52px 124px;">
      <!-- Turned Handle matching reference structure: -->
      <!-- End Pommel Knob -->
      <circle cx="20" cy="159" r="3.8" fill="url(#${o}handleGrad)" stroke="#200e30" stroke-width="1.2" />
      <circle cx="19.5" cy="158" r="1.3" fill="#b994e4" opacity="0.8" />

      <!-- Lower Shaft -->
      <path d="M 22 157 L 28 149" stroke="url(#${o}handleGrad)" stroke-width="5.2" stroke-linecap="round" />

      <!-- Distinctive Turned Spherical Center Bead (from reference) -->
      <circle cx="31" cy="146" r="7.0" fill="url(#${o}earCupGrad)" stroke="#301c42" stroke-width="1.5" />
      <circle cx="29.5" cy="144" r="2.5" fill="#e3ceff" opacity="0.7" />

      <!-- Upper Neck Joint attaching to Lens -->
      <path d="M 34 142 L 42 134" stroke="url(#${o}handleGrad)" stroke-width="5.8" stroke-linecap="round" />

      <!-- Glass Lens Sheen & Refraction Backing -->
      <circle cx="52" cy="124" r="15" fill="url(#${o}lensGlassGrad)" />

      <!-- Circular Frame Rim (High Visibility) -->
      <circle cx="52" cy="124" r="15" fill="none" stroke="url(#${o}lensFrameGrad)" stroke-width="3.5" />
      
      <!-- Specular Reflection Arc -->
      <path d="M 41 118 A 12 12 0 0 1 60 112" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
      <circle cx="62" cy="115" r="1.4" fill="#ffffff" opacity="0.9" />
    </g>
  `}function ne(o=""){return`
    <g class="accessory-monocle" style="transform-origin: 74px 98px;">
      <!-- Monocle Glass Sheen -->
      <circle cx="74" cy="98" r="13.5" fill="#ffffff" fill-opacity="0.16" />
      <path d="M 65 94 A 11 11 0 0 1 78 89" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="81" cy="93" r="1.2" fill="#ffffff" opacity="0.9" />

      <!-- Monocle Wireframe Frame (Bright crisp wire with glow) -->
      <circle cx="74" cy="98" r="13.5" fill="none" stroke="#f3e8ff" stroke-width="2.6" stroke-linecap="round" filter="drop-shadow(0 2px 4px rgba(40,20,60,0.5))" />

      <!-- Top & Bottom Gallery Tabs -->
      <rect x="72.5" y="83" width="3" height="2.2" rx="1" fill="#f3e8ff" />
      <rect x="72.5" y="110.5" width="3" height="2.8" rx="1" fill="#f3e8ff" />

      <!-- Distinctive Draping Chain (Clearly visible, fine beaded links) -->
      <path d="M 74 112 C 73 122 69 130 63 135 C 57 139 50 140 44 140" 
            fill="none" 
            stroke="#e0c4fd" 
            stroke-width="1.8" 
            stroke-linecap="round" 
            stroke-dasharray="2.8,2.2" 
            filter="drop-shadow(0 1px 2px rgba(30,15,45,0.4))"
            opacity="0.95" />
      <!-- Chain End Loop / Ring -->
      <circle cx="43" cy="140" r="2.2" fill="none" stroke="#e0c4fd" stroke-width="1.2" opacity="0.9" />
    </g>
  `}function ae(o=""){return`
    <g class="accessory-prism" filter="url(#${o}prismGlow)" style="transform-origin: 118px 44px;">
      <!-- Ambient Sparkle Rays (Brighter, pulsing) -->
      <line x1="118" y1="30" x2="118" y2="35" stroke="#f5bbfd" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-1" />
      <line x1="118" y1="53" x2="118" y2="58" stroke="#f5bbfd" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-2" />
      <line x1="104" y1="44" x2="109" y2="44" stroke="#c084fc" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-3" />
      <line x1="127" y1="44" x2="132" y2="44" stroke="#c084fc" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-4" />

      <!-- Faceted Geometric Crystal Prism (Prominent & Radiant) -->
      <polygon points="118,34 109,44 118,46" fill="url(#${o}prismFacet1)" opacity="0.98" stroke="#fbcfe8" stroke-width="0.6" />
      <polygon points="118,34 127,44 118,46" fill="url(#${o}prismFacet2)" opacity="0.95" stroke="#e9d5ff" stroke-width="0.6" />
      <polygon points="109,44 118,54 118,46" fill="url(#${o}prismFacet3)" opacity="0.95" stroke="#c084fc" stroke-width="0.6" />
      <polygon points="127,44 118,54 118,46" fill="url(#${o}prismFacet1)" opacity="0.98" stroke="#fbcfe8" stroke-width="0.6" />

      <!-- Facet Inner Highlights -->
      <line x1="118" y1="36" x2="118" y2="52" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />

      <!-- Center Sparkle Core -->
      <circle cx="118" cy="44" r="2.6" fill="#ffffff" opacity="1" filter="drop-shadow(0 0 4px #ffffff)" />
    </g>
  `}class P{constructor(e){this.id=e.id,this.name=e.name,this.accessories=e.accessories||[],this.timingOffset=e.timingOffset||0,this.currentEmotion=e.initialEmotion||"idle",this.currentLocomotion="idle",this.profile=ee(this.id),this.isBlinking=!1,this.isReacting=!1,this.reactionTimeout=null,this.blinkTimer=null,this.cycleTimer=null,this.personalityTimer=null,this.startTimer=null,this.blinkResetTimer=null,this.microTimers=new Set,this.container=null,this.svgElement=null,this.isPaused=!1,this.eyeTargetX=0,this.eyeTargetY=0,this.eyeCurrentX=0,this.eyeCurrentY=0,this.emotionSequence=this.profile.sequence,this.sequenceIndex=0,this.durations={idle:4400+(Math.random()*800-400),happy:3800,excited:3600,sad:3800,angry:3400}}render(){const e=document.createElement("div");e.className=`mascot-card mascot-${this.id} personality-${this.id}`,e.setAttribute("data-mascot-id",this.id),e.setAttribute("data-emotion",this.currentEmotion),e.setAttribute("tabindex","0"),e.setAttribute("role","button"),e.setAttribute("aria-label",`${this.name} mascot. Click to react, double-click to launch game.`);const i=document.createElement("div");i.className="mascot-svg-wrapper";const t=document.createElementNS("http://www.w3.org/2000/svg","svg");t.setAttribute("viewBox","0 0 180 180"),t.setAttribute("class",`mascot-svg mascot-svg-${this.id}`),t.setAttribute("aria-hidden","true");const s=_(this.id);let r="";this.accessories.includes("glasses")&&(r+=ie(this.id)),this.accessories.includes("headphones")&&(r+=se(this.id)),this.accessories.includes("hat")&&(r+=re(this.id)),this.accessories.includes("magnifier")&&(r+=oe(this.id)),this.accessories.includes("monocle")&&(r+=ne(this.id)),this.accessories.includes("prism")&&(r+=ae(this.id));const l=this.id==="lfm3-audio-2b"||this.id==="game-lfm3-audio-2b";t.innerHTML=`
      ${s}

      <!-- Ambient Background Glow -->
      <circle cx="90" cy="100" r="74" fill="url(#${this.id}-ambientBacklight)" class="mascot-ambient-glow" />

      <!-- Main Mascot Character Root (floats, breathes, and runs) -->
      <g class="mascot-body-root" style="transform-origin: 90px 100px;">
        
        <!-- Outer Shell Sphere: Sleek Dark Slate-Lavender with Glowing Violet Rim -->
        <g class="mascot-outer-sphere">
          <!-- Main Outer Body Circle (r=48) -->
          <circle cx="90" cy="100" r="48" fill="url(#${this.id}-outerBodyGrad)" filter="drop-shadow(0 6px 14px rgba(10,5,20,0.55))" />
          <!-- Lower Rim Glow Light (3D sphere illumination matching reference) -->
          <circle cx="90" cy="100" r="48" fill="url(#${this.id}-rimLightGrad)" />
        </g>

        <!-- Inner Face Sphere: FULL, PLUMP, PILLOWY PASTEL LILAC-PINK ORB (r=39.5) -->
        <g class="mascot-inner-face" style="transform-origin: 90px 100px;">
          <!-- Plush Face Base (dominant, pillowy volume) -->
          <circle cx="90" cy="100" r="39.5" fill="url(#${this.id}-faceBodyGrad)" />
          <!-- Soft Specular Top Shine (Gives rounded toy-like volume) -->
          <ellipse cx="85" cy="80" rx="28" ry="16" fill="url(#${this.id}-plushTopGlow)" />
          <!-- Soft Inset Rim Depth Shading -->
          <circle cx="90" cy="100" r="39.5" fill="url(#${this.id}-faceDepthGrad)" />

          <!-- Delicate Cheek Blushes -->
          <circle cx="68" cy="106" r="8" fill="url(#${this.id}-blushGrad)" class="cheek-blush blush-left" />
          <circle cx="112" cy="100" r="8" fill="url(#${this.id}-blushGrad)" class="cheek-blush blush-right" />
        </g>

        <!-- Facial Expressions Layer: Natural 10° Curious Angle -->
        <g class="mascot-face-features" style="transform-origin: 90px 98px;">
          <!-- Eyebrows (Dynamic for Emotions, hidden in Idle) -->
          <path class="eyebrow eyebrow-left" d="M 71 89 Q 74 88 78 89" fill="none" stroke="#352046" stroke-width="2.2" stroke-linecap="round" opacity="0" />
          <path class="eyebrow eyebrow-right" d="M 102 85 Q 106 84 110 85" fill="none" stroke="#352046" stroke-width="2.2" stroke-linecap="round" opacity="0" />

          <!-- Left Eye Group with Eye-Tracking container -->
          <g class="eye-tracker-left" style="transform-origin: 74px 98px; transition: transform 0.08s ease-out;">
            <g class="eye-group eye-left" style="transform-origin: 74px 98px;">
              <ellipse class="eye-shape" cx="74" cy="98" rx="3.3" ry="5.0" fill="url(#${this.id}-eyeGrad)" transform="rotate(10 74 98)" style="opacity: ${l?0:1};" />
              <path class="eye-arc" d="M 70 99 Q 74 93.5 78 99" fill="none" stroke="#352046" stroke-width="2.6" stroke-linecap="round" style="opacity: ${l?1:0};" />
              <!-- Specular Glint -->
              <circle class="eye-glint" cx="75.6" cy="96" r="1.1" fill="#ffffff" style="opacity: ${l?0:.95};" />
              <!-- Sparkle Star for Excited -->
              <polygon class="eye-sparkle" points="74,94 75,97 78,97 75.5,99 76.5,102 74,100 71.5,102 72.5,99 70,97 73,97" fill="#ffffff" opacity="0" transform="scale(0.8) translate(19, 21)" />
            </g>
          </g>

          <!-- Right Eye Group with Eye-Tracking container -->
          <g class="eye-tracker-right" style="transform-origin: 106px 92px; transition: transform 0.08s ease-out;">
            <g class="eye-group eye-right" style="transform-origin: 106px 92px;">
              <ellipse class="eye-shape" cx="106" cy="92" rx="3.3" ry="5.0" fill="url(#${this.id}-eyeGrad)" transform="rotate(10 106 92)" style="opacity: ${l?0:1};" />
              <path class="eye-arc" d="M 102 93.5 Q 106 88 110 93.5" fill="none" stroke="#352046" stroke-width="2.6" stroke-linecap="round" style="opacity: ${l?1:0};" />
              <!-- Specular Glint -->
              <circle class="eye-glint" cx="107.6" cy="90" r="1.1" fill="#ffffff" style="opacity: ${l?0:.95};" />
              <!-- Sparkle Star for Excited -->
              <polygon class="eye-sparkle" points="106,88 107,91 110,91 107.5,93 108.5,96 106,94 103.5,96 104.5,93 102,91 105,91" fill="#ffffff" opacity="0" transform="scale(0.8) translate(26, 20)" />
            </g>
          </g>

          <!-- Tiny, Sweet, Delicate Smiling Mouth -->
          <path class="mascot-mouth" d="M 87.5 97.5 Q 90.2 101.5 93.5 97" fill="none" stroke="#352046" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Tongue for open smile -->
          <path class="mascot-tongue" d="M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z" fill="#ff9ebb" opacity="0" />
        </g>

        <!-- Accessories (Glasses, Headphones, Hat, Monocle, Prism, Magnifier) -->
        <g class="mascot-accessories-layer">
          ${r}
        </g>

      </g>
    `,i.appendChild(t),e.appendChild(i);const a=document.createElement("div");a.className="mascot-pedestal",e.appendChild(a);const c=document.createElement("div");return c.className="mascot-name",c.textContent=this.name,e.appendChild(c),this.container=e,this.svgElement=t,this.gazeElement=i,this.leftEyeTracker=t.querySelector(".eye-tracker-left"),this.rightEyeTracker=t.querySelector(".eye-tracker-right"),this.applyEmotion(this.currentEmotion,!1),e}createGameClone(){const e=this.svgElement.cloneNode(!0);return e.classList.add("runner-mascot-svg"),e}start(){this.isPaused&&(this.isPaused=!1),this.scheduleBlink(),this.startPersonalityBehaviors(),this.startTimer=setTimeout(()=>{!this.isPaused&&!this.isReacting&&this.cycleNextEmotion()},this.timingOffset)}triggerRandomReaction(){if(this.isPaused)return;const e=this.profile.reactions,i=e[Math.floor(Math.random()*e.length)];this.triggerReaction(i)}triggerReaction(e){E[e]&&(this.isReacting=!0,clearTimeout(this.cycleTimer),clearTimeout(this.reactionTimeout),this.container&&(this.container.classList.add("mascot-click-pop"),this.scheduleMicro(()=>{var i;return(i=this.container)==null?void 0:i.classList.remove("mascot-click-pop")},400),this.container.setAttribute("data-emotion",e)),this.applyEmotion(e,!0),this.reactionTimeout=setTimeout(()=>{this.isReacting=!1,this.isPaused||(this.setEmotion("idle"),this.cycleTimer=setTimeout(()=>this.cycleNextEmotion(),this.durations.idle))},1600))}showEmotionFor(e,i=4e3){!E[e]||this.isPaused||(clearTimeout(this.cycleTimer),clearTimeout(this.reactionTimeout),this.isReacting=!0,this.setEmotion(e),this.reactionTimeout=setTimeout(()=>{this.isReacting=!1,this.isPaused||(this.setEmotion("idle"),this.cycleTimer=setTimeout(()=>this.cycleNextEmotion(),this.durations.idle))},i))}handlePointerMove(e,i){if(!this.svgElement||this.isPaused||this.currentLocomotion!=="idle")return;const t=this.gazeElement.getBoundingClientRect(),s=t.left+t.width/2,r=t.top+t.height*(100/180),{x:l,y:a}=te(e,i,s,r),c=this.leftEyeTracker,n=this.rightEyeTracker;c&&n&&(c.style.transform=`translate(${l.toFixed(2)}px, ${a.toFixed(2)}px)`,n.style.transform=`translate(${l.toFixed(2)}px, ${a.toFixed(2)}px)`)}resetEyes(){if(!this.svgElement)return;const e=this.leftEyeTracker,i=this.rightEyeTracker;e&&i&&(e.style.transform="translate(0px, 0px)",i.style.transform="translate(0px, 0px)")}scheduleMicro(e,i){const t=setTimeout(()=>{this.microTimers.delete(t),this.isPaused||e()},i);this.microTimers.add(t)}clearMicroTimers(){var e,i,t,s,r,l;this.microTimers.forEach(clearTimeout),this.microTimers.clear(),(e=this.container)==null||e.classList.remove("mascot-click-pop"),(t=(i=this.svgElement)==null?void 0:i.querySelector(".mascot-body-root"))==null||t.classList.remove("personality-audio-groove"),(r=(s=this.svgElement)==null?void 0:s.querySelector(".accessory-prism"))==null||r.classList.remove("prism-thought-shimmer"),(l=this.svgElement)==null||l.querySelectorAll(".accessory-glasses, .accessory-hat, .accessory-magnifier, .mascot-inner-face, .eye-group").forEach(a=>{a.style.transform=""})}pause(){this.isPaused=!0,clearTimeout(this.blinkTimer),clearTimeout(this.cycleTimer),clearTimeout(this.personalityTimer),clearTimeout(this.reactionTimeout),clearTimeout(this.startTimer),clearTimeout(this.blinkResetTimer),this.clearMicroTimers(),this.resetEyes()}resume(){this.isPaused&&(this.isPaused=!1,this.scheduleBlink(),this.startPersonalityBehaviors(),this.cycleNextEmotion())}setLocomotion(e){this.currentLocomotion=e,z(this,e)}scheduleBlink(){if(this.isPaused)return;const[e,i]=this.profile.blink,t=e+Math.random()*(i-e);this.blinkTimer=setTimeout(()=>{!this.isPaused&&!this.isReacting&&(this.currentEmotion==="idle"||this.currentEmotion==="sad")&&this.performBlink(),this.scheduleBlink()},t)}performBlink(){if(!this.svgElement||this.isPaused||this.id==="lfm3-audio-2b"&&this.currentEmotion==="idle")return;const e=this.svgElement.querySelector(".eye-left .eye-shape"),i=this.svgElement.querySelector(".eye-right .eye-shape"),t=this.svgElement.querySelector(".eye-left .eye-glint"),s=this.svgElement.querySelector(".eye-right .eye-glint");e&&i&&e.style.opacity!=="0"&&(e.style.transform="scaleY(0.08)",i.style.transform="scaleY(0.08)",t&&(t.style.opacity="0"),s&&(s.style.opacity="0"),this.blinkResetTimer=setTimeout(()=>{this.isPaused||(e.style.transform="",i.style.transform="",t&&(t.style.opacity="0.95"),s&&(s.style.opacity="0.95"))},140))}startPersonalityBehaviors(){if(this.isPaused)return;const e=()=>{if(this.isPaused||this.isReacting||this.currentEmotion!=="idle"){this.personalityTimer=setTimeout(e,3500);return}switch(this.id){case"lfm3-vl-2b":this.triggerGlassesNudge();break;case"lfm3-audio-2b":this.triggerAudioGroove();break;case"lfm3-omni-2b":this.triggerOmniPerk();break;case"d1-2b":this.triggerPrismShimmer();break;case"d1-omni-2b":this.triggerDetectiveInspect();break;case"lfm3-17b":default:this.triggerCuriousTilt();break}const i=4500+Math.random()*3e3;this.personalityTimer=setTimeout(e,i)};this.personalityTimer=setTimeout(e,2200+this.timingOffset)}triggerCuriousTilt(){var i;const e=(i=this.svgElement)==null?void 0:i.querySelector(".mascot-inner-face");e&&(e.style.transition="transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",e.style.transform="rotate(4deg) translateY(-2px)",this.scheduleMicro(()=>{e&&this.currentEmotion==="idle"&&!this.isReacting&&(e.style.transform="rotate(0deg) translateY(0px)")},1200))}triggerGlassesNudge(){var t,s;const e=(t=this.svgElement)==null?void 0:t.querySelector(".accessory-glasses"),i=(s=this.svgElement)==null?void 0:s.querySelectorAll(".eye-group");e&&(i==null||i.forEach(r=>{r.style.transform="translateX(2px)"}),e.style.transition="transform 0.35s ease",e.style.transform="translateY(-2px) rotate(-1deg)",this.scheduleMicro(()=>{e.style.transform="translateY(0) rotate(0deg)",i==null||i.forEach(r=>{r.style.transform=""})},900))}triggerAudioGroove(){var i;const e=(i=this.svgElement)==null?void 0:i.querySelector(".mascot-body-root");e&&(e.classList.add("personality-audio-groove"),this.scheduleMicro(()=>{e.classList.remove("personality-audio-groove")},1800))}triggerOmniPerk(){var t,s;const e=(t=this.svgElement)==null?void 0:t.querySelector(".mascot-inner-face"),i=(s=this.svgElement)==null?void 0:s.querySelector(".accessory-glasses");e&&(e.style.transform="translateY(-2.5px) scale(1.02)",i&&(i.style.transform="translateY(-1.5px)"),this.scheduleMicro(()=>{e&&this.currentEmotion==="idle"&&!this.isReacting&&(e.style.transform="",i&&(i.style.transform=""))},1100))}triggerPrismShimmer(){var i;const e=(i=this.svgElement)==null?void 0:i.querySelector(".accessory-prism");e&&(e.classList.add("prism-thought-shimmer"),this.scheduleMicro(()=>{e.classList.remove("prism-thought-shimmer")},1600))}triggerDetectiveInspect(){var s,r,l;const e=(s=this.svgElement)==null?void 0:s.querySelector(".accessory-hat"),i=(r=this.svgElement)==null?void 0:r.querySelector(".accessory-magnifier"),t=(l=this.svgElement)==null?void 0:l.querySelector(".mascot-inner-face");e&&(e.style.transform="rotate(-4deg) translateY(-1.5px)"),i&&(i.style.transform="translate(5px, -3px) scale(1.06)"),t&&(t.style.transform="rotate(-2deg) translate(-1px, 1.5px)"),this.scheduleMicro(()=>{e&&(e.style.transform=""),i&&(i.style.transform=""),t&&this.currentEmotion==="idle"&&!this.isReacting&&(t.style.transform="")},1400)}cycleNextEmotion(){if(this.isPaused||this.isReacting||this.currentLocomotion!=="idle")return;this.sequenceIndex=(this.sequenceIndex+1)%this.emotionSequence.length;const e=this.emotionSequence[this.sequenceIndex];this.setEmotion(e);const i=this.durations[e]||3600;this.cycleTimer=setTimeout(()=>{!this.isPaused&&!this.isReacting&&this.cycleNextEmotion()},i)}setEmotion(e){E[e]&&(this.currentEmotion=e,this.container&&this.container.setAttribute("data-emotion",e),this.applyEmotion(e,!0))}applyEmotion(e,i=!0){if(!this.svgElement)return;const t=E[e];if(!t)return;const s=this.svgElement,r=s.querySelector(".eye-left .eye-shape"),l=s.querySelector(".eye-right .eye-shape"),a=s.querySelector(".eye-left .eye-arc"),c=s.querySelector(".eye-right .eye-arc"),n=s.querySelector(".eye-left .eye-glint"),f=s.querySelector(".eye-right .eye-glint"),y=s.querySelector(".eye-left .eye-sparkle"),m=s.querySelector(".eye-right .eye-sparkle"),d=s.querySelector(".eyebrow-left"),u=s.querySelector(".eyebrow-right"),g=s.querySelector(".mascot-mouth"),p=s.querySelector(".mascot-tongue"),b=s.querySelector(".blush-left"),w=s.querySelector(".blush-right"),T=s.querySelector(".mascot-inner-face");t.leftEye.type==="arc"||this.id==="lfm3-audio-2b"&&e==="idle"&&!this.isReacting?(r&&(r.style.opacity="0"),l&&(l.style.opacity="0"),a&&(a.setAttribute("d",t.leftEye.d||"M 70 99 Q 74 93.5 78 99"),a.style.opacity="1"),c&&(c.setAttribute("d",t.rightEye.d||"M 102 93.5 Q 106 88 110 93.5"),c.style.opacity="1"),n&&(n.style.opacity="0"),f&&(f.style.opacity="0"),y&&(y.style.opacity="0"),m&&(m.style.opacity="0")):(r&&(r.setAttribute("rx",t.leftEye.rx),r.setAttribute("ry",t.leftEye.ry),r.setAttribute("cx",t.leftEye.cx),r.setAttribute("cy",t.leftEye.cy),r.setAttribute("transform",`rotate(${t.leftEye.rotation} ${t.leftEye.cx} ${t.leftEye.cy})`),r.style.opacity="1"),l&&(l.setAttribute("rx",t.rightEye.rx),l.setAttribute("ry",t.rightEye.ry),l.setAttribute("cx",t.rightEye.cx),l.setAttribute("cy",t.rightEye.cy),l.setAttribute("transform",`rotate(${t.rightEye.rotation} ${t.rightEye.cx} ${t.rightEye.cy})`),l.style.opacity="1"),a&&(a.style.opacity="0"),c&&(c.style.opacity="0"),n&&(n.style.opacity=t.leftEye.glint?"0.95":"0"),f&&(f.style.opacity=t.rightEye.glint?"0.95":"0"),y&&(y.style.opacity=t.leftEye.sparkle?"1":"0"),m&&(m.style.opacity=t.rightEye.sparkle?"1":"0")),t.eyebrows.visible?(d&&(d.setAttribute("d",t.eyebrows.leftD),d.style.opacity="0.85"),u&&(u.setAttribute("d",t.eyebrows.rightD),u.style.opacity="0.85")):(d&&(d.style.opacity="0"),u&&(u.style.opacity="0")),g&&(g.setAttribute("d",t.mouth.d),g.setAttribute("fill",t.mouth.fill),g.setAttribute("stroke",t.mouth.stroke),g.setAttribute("stroke-width",t.mouth.strokeWidth)),p&&(t.mouth.hasTongue?(p.setAttribute("d",t.mouth.tongueD),p.style.opacity="1"):p.style.opacity="0"),b&&(b.style.opacity=t.blushOpacity,b.style.transform=`scale(${t.blushScale})`,b.style.transformOrigin="68px 106px"),w&&(w.style.opacity=t.blushOpacity,w.style.transform=`scale(${t.blushScale})`,w.style.transformOrigin="112px 100px"),T&&this.currentLocomotion==="idle"&&(T.style.transform=`rotate(${t.headTilt}deg)`)}destroy(){this.isPaused=!0,clearTimeout(this.blinkTimer),clearTimeout(this.cycleTimer),clearTimeout(this.personalityTimer),clearTimeout(this.reactionTimeout),clearTimeout(this.startTimer),clearTimeout(this.blinkResetTimer),this.clearMicroTimers()}}const V=["prism-cactus","crystal-pillar","tech-totem","floating-cube"];let le=0;class ce{constructor(e,i,t,s){switch(this.id=`obs_${++le}`,this.type=e,this.x=i,this.groundY=t,this.speed=s,this.passed=!1,this.type){case"crystal-pillar":this.width=30,this.height=70,this.y=t-this.height,this.hitbox={xOffset:5,yOffset:6,width:20,height:62};break;case"tech-totem":this.width=36,this.height=62,this.y=t-this.height,this.hitbox={xOffset:4,yOffset:6,width:28,height:54};break;case"floating-cube":this.width=32,this.height=32,this.y=t-50,this.hitbox={xOffset:4,yOffset:4,width:24,height:24};break;case"prism-cactus":default:this.width=40,this.height=54,this.y=t-this.height,this.hitbox={xOffset:4,yOffset:8,width:32,height:44};break}}update(e,i){this.x-=i*e}getBounds(){return{left:this.x+this.hitbox.xOffset,right:this.x+this.hitbox.xOffset+this.hitbox.width,top:this.y+this.hitbox.yOffset,bottom:this.y+this.hitbox.yOffset+this.hitbox.height}}renderSvg(){const e=document.createElementNS("http://www.w3.org/2000/svg","g");e.setAttribute("class",`game-obstacle obstacle-${this.type}`),e.setAttribute("id",this.id),e.setAttribute("transform",`translate(${this.x}, ${this.y})`);let i="";return this.type==="prism-cactus"?i=`
        <!-- Ground contact glow -->
        <ellipse cx="20" cy="54" rx="16" ry="2" fill="#c084fc" opacity="0.4" filter="url(#obs-glow-magenta)" />

        <!-- Primary Crystal Pyramid (Taller, Left/Center) -->
        <!-- Facet Left -->
        <polygon points="2,54 16,8 16,54" fill="url(#obs-pyramid-facet1)" fill-opacity="0.8" stroke="#e879f9" stroke-width="1.6" filter="url(#obs-glow-magenta)" />
        <!-- Facet Right -->
        <polygon points="16,54 16,8 30,54" fill="url(#obs-pyramid-facet2)" fill-opacity="0.6" stroke="#e879f9" stroke-width="1.6" filter="url(#obs-glow-magenta)" />
        <!-- Ridge and internal facet lines -->
        <line x1="16" y1="8" x2="16" y2="54" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.9" />
        <line x1="16" y1="28" x2="2" y2="54" stroke="#f5d0fe" stroke-width="1.1" opacity="0.65" />
        <line x1="16" y1="28" x2="30" y2="54" stroke="#f5d0fe" stroke-width="1.1" opacity="0.65" />

        <!-- Secondary Overlapping Crystal Pyramid (Front, Right) -->
        <!-- Facet Left -->
        <polygon points="16,54 28,18 28,54" fill="url(#obs-pyramid-facet-cyan)" fill-opacity="0.75" stroke="#38bdf8" stroke-width="1.5" filter="url(#obs-glow-cyan)" />
        <!-- Facet Right -->
        <polygon points="28,54 28,18 38,54" fill="url(#obs-pyramid-facet-purple)" fill-opacity="0.55" stroke="#38bdf8" stroke-width="1.5" filter="url(#obs-glow-cyan)" />
        <!-- Ridge and internal facet lines -->
        <line x1="28" y1="18" x2="28" y2="54" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.85" />
        <line x1="28" y1="34" x2="16" y2="54" stroke="#bae6fd" stroke-width="1" opacity="0.6" />
        <line x1="28" y1="34" x2="38" y2="54" stroke="#bae6fd" stroke-width="1" opacity="0.6" />

        <!-- Glowing Core Point at intersection -->
        <circle cx="20" cy="32" r="3.2" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <circle cx="20" cy="32" r="1.6" fill="#fdf4ff" />

        <!-- Apex Sparkles -->
        <circle cx="16" cy="8" r="2.2" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <circle cx="28" cy="18" r="1.8" fill="#ffffff" filter="url(#obs-glow-bright)" />
      `:this.type==="crystal-pillar"?i=`
        <!-- Ground contact glow -->
        <ellipse cx="15" cy="70" rx="14" ry="2.5" fill="#c084fc" opacity="0.5" filter="url(#obs-glow-magenta)" />

        <!-- Monolith Pillar Body -->
        <polygon points="5,16 15,18 15,70 5,70" fill="url(#obs-pillar-facet-l)" stroke="#c084fc" stroke-width="1.2" />
        <polygon points="15,18 25,16 25,70 15,70" fill="url(#obs-pillar-facet-r)" stroke="#a855f7" stroke-width="1.2" />
        <!-- Outer edge luminous highlights -->
        <line x1="5" y1="16" x2="5" y2="70" stroke="#f0abfc" stroke-width="1.3" opacity="0.8" />
        <line x1="25" y1="16" x2="25" y2="70" stroke="#c084fc" stroke-width="1.3" opacity="0.8" />

        <!-- Diamond-Cut Top Cap -->
        <polygon points="15,2 5,16 15,19" fill="url(#obs-cap-facet-l)" stroke="#f5d0fe" stroke-width="1.2" />
        <polygon points="15,2 25,16 15,19" fill="url(#obs-cap-facet-r)" stroke="#e879f9" stroke-width="1.2" />
        <circle cx="15" cy="2" r="2.2" fill="#ffffff" filter="url(#obs-glow-bright)" />

        <!-- Internal Laser Energy Core Line with Pulsing Glow Filter -->
        <line x1="15" y1="20" x2="15" y2="67" stroke="#e879f9" stroke-width="4" stroke-linecap="round" opacity="0.6" filter="url(#obs-laser-glow)" />
        <line x1="15" y1="18" x2="15" y2="68" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" filter="url(#obs-pulsing-glow)" />
        <circle cx="15" cy="32" r="2.2" fill="#ffffff" opacity="0.95" />
        <circle cx="15" cy="50" r="2" fill="#ffffff" opacity="0.9" />

        <!-- Floating Particles Around Pillar -->
        <circle cx="2" cy="22" r="1.4" fill="#38bdf8" opacity="0.9" filter="url(#obs-glow-cyan)" />
        <polygon points="28,26 30,28 28,30 26,28" fill="#ffffff" opacity="0.85" filter="url(#obs-glow-magenta)" />
        <circle cx="1" cy="46" r="1.5" fill="#f0abfc" opacity="0.8" />
        <polygon points="28,50 30,52 28,54 26,52" fill="#a855f7" opacity="0.85" />
        <circle cx="3" cy="62" r="1.2" fill="#ffffff" opacity="0.75" />
        <circle cx="27" cy="38" r="1.3" fill="#e879f9" opacity="0.8" />
      `:this.type==="tech-totem"?i=`
        <!-- Floating Ground Shadow / Energy Tether -->
        <ellipse cx="18" cy="60" rx="12" ry="2" fill="#38bdf8" opacity="0.3" filter="url(#obs-glow-cyan)" />
        <line x1="18" y1="50" x2="18" y2="58" stroke="#818cf8" stroke-width="1" stroke-dasharray="2,2" opacity="0.6" />

        <!-- Outer Rotated Diamond Body -->
        <polygon points="18,10 32,30 18,50 4,30" fill="url(#obs-gem-body)" stroke="#38bdf8" stroke-width="1.8" filter="url(#obs-glow-cyan)" />

        <!-- Inner Faceted Diamond & Internal Facet Lines -->
        <polygon points="18,18 26,30 18,42 10,30" fill="url(#obs-gem-core)" stroke="#bae6fd" stroke-width="1.2" />
        <line x1="18" y1="10" x2="18" y2="18" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="32" y1="30" x2="26" y2="30" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="18" y1="50" x2="18" y2="42" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="4" y1="30" x2="10" y2="30" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <!-- Cross Facet Lines -->
        <line x1="18" y1="18" x2="18" y2="42" stroke="#e0e7ff" stroke-width="1" opacity="0.75" />
        <line x1="10" y1="30" x2="26" y2="30" stroke="#e0e7ff" stroke-width="1" opacity="0.75" />

        <!-- Glowing Center Point -->
        <circle cx="18" cy="30" r="2.8" fill="#ffffff" filter="url(#obs-glow-bright)" />

        <!-- Small Sparkle Crosses at Cardinal Points -->
        <!-- North -->
        <path d="M 18 1 L 18 6 M 15.5 3.5 L 20.5 3.5" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="18" cy="3.5" r="1" fill="#ffffff" />
        <!-- South -->
        <path d="M 18 54 L 18 59 M 15.5 56.5 L 20.5 56.5" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="18" cy="56.5" r="1" fill="#ffffff" />
        <!-- West -->
        <path d="M 1 27.5 L 1 32.5 M -1.5 30 L 3.5 30" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="1" cy="30" r="1" fill="#ffffff" />
        <!-- East -->
        <path d="M 35 27.5 L 35 32.5 M 32.5 30 L 37.5 30" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="35" cy="30" r="1" fill="#ffffff" />
      `:this.type==="floating-cube"&&(i=`
        <!-- Isometric Cube Faces (Semi-transparent Holographic) -->
        <!-- Top Face -->
        <polygon points="16,2 29,9.5 16,16.5 3,9.5" fill="url(#obs-cube-face-top)" fill-opacity="0.45" stroke="#f0abfc" stroke-width="1.4" filter="url(#obs-glow-magenta)" />
        <!-- Left Face -->
        <polygon points="3,9.5 16,16.5 16,31 3,23.5" fill="url(#obs-cube-face-left)" fill-opacity="0.4" stroke="#c084fc" stroke-width="1.4" filter="url(#obs-glow-magenta)" />
        <!-- Right Face -->
        <polygon points="16,16.5 29,9.5 29,23.5 16,31" fill="url(#obs-cube-face-right)" fill-opacity="0.35" stroke="#a855f7" stroke-width="1.4" filter="url(#obs-glow-magenta)" />

        <!-- Cube Center Ridge Lines -->
        <line x1="16" y1="16.5" x2="16" y2="31" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />
        <line x1="16" y1="16.5" x2="3" y2="9.5" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />
        <line x1="16" y1="16.5" x2="29" y2="9.5" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />

        <!-- Glowing Equilateral Triangle Inside -->
        <polygon points="16,7.5 24,21.5 8,21.5" fill="url(#obs-triangle-glow-fill)" fill-opacity="0.65" stroke="#38bdf8" stroke-width="1.8" filter="url(#obs-glow-cyan)" />
        <line x1="16" y1="7.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        <line x1="24" y1="21.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        <line x1="8" y1="21.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />

        <!-- Lens-Flare Style Cross Sparkle at Center -->
        <polygon points="5,16.5 16,15.2 27,16.5 16,17.8" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <polygon points="16,5.5 17.3,16.5 16,27.5 14.7,16.5" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <line x1="11" y1="11.5" x2="21" y2="21.5" stroke="#ffffff" stroke-width="1" opacity="0.75" />
        <line x1="21" y1="11.5" x2="11" y2="21.5" stroke="#ffffff" stroke-width="1" opacity="0.75" />
        <circle cx="16" cy="16.5" r="2.2" fill="#ffffff" filter="url(#obs-glow-cyan)" />
      `),e.innerHTML=i,e}}function j(){return`
    <defs>
      <!-- Glow Filters -->
      <filter id="obs-glow-magenta" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#e879f9" flood-opacity="0.8" />
      </filter>

      <filter id="obs-glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#38bdf8" flood-opacity="0.8" />
      </filter>

      <filter id="obs-glow-bright" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ffffff" flood-opacity="0.9" />
      </filter>

      <filter id="obs-laser-glow" x="-50%" y="-20%" width="200%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#ec4899" flood-opacity="0.85" />
      </filter>

      <filter id="obs-pulsing-glow" x="-50%" y="-20%" width="200%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ffffff" flood-opacity="1" />
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#e879f9" flood-opacity="0.75" />
      </filter>

      <!-- Crystal Pyramid Clusters Gradients -->
      <linearGradient id="obs-pyramid-facet1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="45%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fae8ff" />
        <stop offset="50%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#3b0764" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e0f2fe" />
        <stop offset="55%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet-purple" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>

      <!-- Backwards compatibility for cactus IDs -->
      <linearGradient id="obs-cactus-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fae8ff" />
        <stop offset="45%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>
      <linearGradient id="obs-cactus-side" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="60%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>

      <!-- Monolith Pillar Gradients -->
      <linearGradient id="obs-pillar-facet-l" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#581c87" />
        <stop offset="60%" stop-color="#7e22ce" />
        <stop offset="100%" stop-color="#3b0764" />
      </linearGradient>

      <linearGradient id="obs-pillar-facet-r" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b0764" />
        <stop offset="60%" stop-color="#581c87" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <linearGradient id="obs-cap-facet-l" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#f0abfc" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>

      <linearGradient id="obs-cap-facet-r" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="60%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>

      <linearGradient id="obs-pillar-body" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b0764" />
        <stop offset="50%" stop-color="#6b21a8" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>

      <!-- Floating Gem Gradients -->
      <linearGradient id="obs-gem-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95" />
        <stop offset="45%" stop-color="#38bdf8" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#312e81" stop-opacity="0.9" />
      </linearGradient>

      <linearGradient id="obs-gem-core" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#bae6fd" />
        <stop offset="50%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <!-- Floating Cube Gradients -->
      <linearGradient id="obs-cube-face-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="50%" stop-color="#e879f9" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>

      <linearGradient id="obs-cube-face-left" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="60%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>

      <linearGradient id="obs-cube-face-right" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="60%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#2e1065" />
      </linearGradient>

      <linearGradient id="obs-triangle-glow-fill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>

      <linearGradient id="obs-cube-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="50%" stop-color="#d946ef" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>
    </defs>
  `}function fe(){return`
    <g class="runner-scenery-layer" aria-hidden="true">
      <defs>
        <!-- Full Moon Radial Surface & Glow Gradients -->
        <radialGradient id="scenery-moon-surface" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#f3e8ff" />
          <stop offset="85%" stop-color="#ddd6fe" />
          <stop offset="100%" stop-color="#c4b5fd" />
        </radialGradient>

        <radialGradient id="scenery-moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e9d5ff" stop-opacity="0.45" />
          <stop offset="35%" stop-color="#c084fc" stop-opacity="0.25" />
          <stop offset="70%" stop-color="#a855f7" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
        </radialGradient>

        <!-- Shooting Star Fading Trail Gradient -->
        <linearGradient id="scenery-shooting-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="55%" stop-color="#f5d0fe" stop-opacity="0.35" />
          <stop offset="90%" stop-color="#ffffff" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
        </linearGradient>

        <!-- Flower Petal Glow Filter -->
        <filter id="scenery-flower-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#f43f5e" flood-opacity="0.9" />
        </filter>

        <!-- Rich Purple Hill Gradients -->
        <linearGradient id="scenery-hill-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#581c87" />
          <stop offset="50%" stop-color="#3b0764" />
          <stop offset="100%" stop-color="#1e1035" />
        </linearGradient>

        <linearGradient id="scenery-hill-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="55%" stop-color="#4c1d95" />
          <stop offset="100%" stop-color="#2e1065" />
        </linearGradient>
      </defs>

      <!-- Celestial Layer: Moon & Glow Halo -->
      <g class="scenery-celestial">
        <!-- Radial Glow Halo -->
        <circle cx="620" cy="45" r="52" fill="url(#scenery-moon-halo)" />
        <circle cx="620" cy="45" r="38" fill="url(#scenery-moon-halo)" opacity="0.75" />

        <!-- Full Moon Disc -->
        <circle cx="620" cy="45" r="28" fill="url(#scenery-moon-surface)" stroke="#ede9fe" stroke-width="0.75" />

        <!-- Hand-drawn Craters -->
        <ellipse cx="612" cy="40" rx="4.5" ry="3.2" fill="#a78bfa" opacity="0.45" transform="rotate(-15 612 40)" />
        <ellipse cx="628" cy="51" rx="5" ry="3.6" fill="#8b5cf6" opacity="0.4" transform="rotate(12 628 51)" />
        <ellipse cx="616" cy="56" rx="3.5" ry="2.5" fill="#a78bfa" opacity="0.42" transform="rotate(-6 616 56)" />
        <ellipse cx="632" cy="37" rx="3" ry="2.2" fill="#8b5cf6" opacity="0.36" transform="rotate(20 632 37)" />
      </g>

      <!-- Twinkling 4-Pointed Cross Stars (y < 160) -->
      <g class="scenery-stars">
        <!-- Star 1: size ~4px -->
        <path d="M 48 34 Q 48 38 52 38 Q 48 38 48 42 Q 48 38 44 38 Q 48 38 48 34 Z" fill="#ffffff" opacity="0.9" />
        <!-- Star 2: size ~3px -->
        <path d="M 118 71 Q 118 74 121 74 Q 118 74 118 77 Q 118 74 115 74 Q 118 74 118 71 Z" fill="#f5d0fe" opacity="0.8" />
        <!-- Star 3: size ~5px -->
        <path d="M 192 21 Q 192 26 197 26 Q 192 26 192 31 Q 192 26 187 26 Q 192 26 192 21 Z" fill="#ffffff" opacity="0.95" />
        <!-- Star 4: size ~2.5px -->
        <path d="M 248 93.5 Q 248 96 250.5 96 Q 248 96 248 98.5 Q 248 96 245.5 96 Q 248 96 248 93.5 Z" fill="#e9d5ff" opacity="0.75" />
        <!-- Star 5: size ~4px -->
        <path d="M 334 42 Q 334 46 338 46 Q 334 46 334 50 Q 334 46 330 46 Q 334 46 334 42 Z" fill="#ffffff" opacity="0.9" />
        <!-- Star 6: size ~3px -->
        <path d="M 418 105 Q 418 108 421 108 Q 418 108 418 111 Q 418 108 415 108 Q 418 108 418 105 Z" fill="#f0abfc" opacity="0.8" />
        <!-- Star 7: size ~4.5px -->
        <path d="M 488 27.5 Q 488 32 492.5 32 Q 488 32 488 36.5 Q 488 32 483.5 32 Q 488 32 488 27.5 Z" fill="#ffffff" opacity="0.92" />
        <!-- Star 8: size ~2.5px -->
        <path d="M 546 79.5 Q 546 82 548.5 82 Q 546 82 546 84.5 Q 546 82 543.5 82 Q 546 82 546 79.5 Z" fill="#e9d5ff" opacity="0.75" />
        <!-- Star 9: size ~3.5px -->
        <path d="M 694 94.5 Q 694 98 697.5 98 Q 694 98 694 101.5 Q 694 98 690.5 98 Q 694 98 694 94.5 Z" fill="#ffffff" opacity="0.85" />
        <!-- Star 10: size ~2.5px -->
        <path d="M 728 31.5 Q 728 34 730.5 34 Q 728 34 728 36.5 Q 728 34 725.5 34 Q 728 34 728 31.5 Z" fill="#f5d0fe" opacity="0.8" />
      </g>

      <!-- Shooting Star (Top-Left) -->
      <g class="scenery-shooting-star">
        <line x1="50" y1="16" x2="148" y2="54" stroke="url(#scenery-shooting-star)" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="148" cy="54" r="2.2" fill="#ffffff" filter="drop-shadow(0 0 3px #f0abfc)" />
        <polygon points="148,51 149.2,54 148,57 146.8,54" fill="#ffffff" />
      </g>

      <!-- Mountain Ridge Observatory Dome (Peak at x=264) -->
      <g class="scenery-observatory">
        <!-- Foundation Base -->
        <rect x="254" y="164" width="20" height="3" rx="1" fill="#3b0764" stroke="#a855f7" stroke-width="0.8" />
        <!-- Semicircular Dome (r≈8) -->
        <path d="M 256 164 A 8 8 0 0 1 272 164 Z" fill="#c084fc" stroke="#f5d0fe" stroke-width="1.1" />
        <!-- Slit Opening -->
        <path d="M 264 156.5 L 266 164" stroke="#2e1065" stroke-width="1.6" stroke-linecap="round" />
        <!-- Telescope Line Poking Out -->
        <line x1="264" y1="160" x2="272" y2="151" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" filter="drop-shadow(0 0 2px #38bdf8)" />
        <circle cx="272" cy="151" r="1.1" fill="#38bdf8" />
      </g>

      <!-- Neon Grass Tufts (Along Ground Line y=220) -->
      <g class="scenery-neon-grass">
        <!-- Tuft 1 (x=58) -->
        <path d="M 55 220 Q 53 214 51 212 M 58 220 Q 59 213 60 210 M 60 220 Q 63 215 65 213" stroke="#d946ef" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 2 (x=148) -->
        <path d="M 145 220 Q 144 215 142 213 M 148 220 Q 148 213 149 210 M 150 220 Q 153 215 155 213" stroke="#c026d3" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 3 (x=235) -->
        <path d="M 232 220 Q 231 214 229 211 M 235 220 Q 236 212 237 209 M 237 220 Q 240 214 242 212" stroke="#e879f9" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 4 (x=372) -->
        <path d="M 369 220 Q 367 214 365 211 M 372 220 Q 373 213 374 210 M 374 220 Q 377 215 379 213" stroke="#a855f7" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 5 (x=475) -->
        <path d="M 472 220 Q 470 214 468 212 M 475 220 Q 476 212 477 209 M 478 220 Q 481 215 483 213" stroke="#d946ef" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 6 (x=582) -->
        <path d="M 579 220 Q 578 214 576 211 M 582 220 Q 583 212 584 209 M 585 220 Q 587 214 590 212" stroke="#ec4899" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 7 (x=682) -->
        <path d="M 679 220 Q 677 214 675 212 M 682 220 Q 683 213 684 210 M 684 220 Q 687 215 689 213" stroke="#c084fc" stroke-width="1.3" stroke-linecap="round" fill="none" />
      </g>

      <!-- Glowing Flower Tufts (Hot Pink/Magenta with Glow Filter) -->
      <g class="scenery-glowing-flowers" filter="url(#scenery-flower-glow)">
        <!-- Flower 1 (x=102) -->
        <g class="neon-flower">
          <line x1="102" y1="220" x2="102" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="100" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="104" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="102" cy="213" r="2" fill="#f43f5e" />
          <circle cx="102" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 2 (x=210) -->
        <g class="neon-flower">
          <line x1="210" y1="220" x2="210" y2="215" stroke="#c084fc" stroke-width="1" />
          <circle cx="208" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="212" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="210" cy="213" r="2" fill="#f43f5e" />
          <circle cx="210" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 3 (x=420) -->
        <g class="neon-flower">
          <line x1="420" y1="220" x2="420" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="418" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="422" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="420" cy="213" r="2" fill="#f43f5e" />
          <circle cx="420" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 4 (x=530) -->
        <g class="neon-flower">
          <line x1="530" y1="220" x2="530" y2="215" stroke="#c084fc" stroke-width="1" />
          <circle cx="528" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="532" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="530" cy="213" r="2" fill="#f43f5e" />
          <circle cx="530" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 5 (x=645) -->
        <g class="neon-flower">
          <line x1="645" y1="220" x2="645" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="643" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="647" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="645" cy="213" r="2" fill="#f43f5e" />
          <circle cx="645" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
      </g>
    </g>
  `}function U(o){const e=`<path d="M0 220 L0 191 Q95 152 170 194 Q264 135 358 196 Q480 153 565 196 Q660 166 760 194 L760 220 Z" fill="url(#scenery-hill-back)" />
    <path d="M0 220 L0 207 Q100 180 185 210 Q280 178 390 209 Q485 183 590 209 Q670 186 760 207 L760 220 Z" fill="url(#scenery-hill-front)" />`;return`${fe()}<g class="runner-hills-layer" id="${o}"><g>${e}</g><g transform="translate(760,0)">${e}</g></g>`}function de(o){const e=document.createElement("div");return e.className="game-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label",`${o.name} Mini-Game Playground`),e.innerHTML=`
    <div class="game-modal">
      <!-- Top HUD -->
      <header class="game-hud">
        <div class="hud-left">
          <span class="game-mascot-badge">${o.name}</span>
          <span class="hud-instruction">SPACE / ↑ JUMP • ↓ / S DODGE</span>
        </div>
        <div class="hud-right">
          <div class="score-display">
            <span class="score-label">HI</span>
            <span class="score-best" id="gameBestScore">00000</span>
            <span class="score-current" id="gameCurrentScore">00000</span>
          </div>
          <button class="game-close-btn" id="gameCloseBtn" aria-label="Close game (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Stage Viewport -->
      <div class="game-stage-viewport" id="gameStageViewport" tabindex="0" aria-label="Runner stage. Space or Up to jump, Down or S to dodge.">
        <svg class="runner-scene-svg" viewBox="0 0 760 280" preserveAspectRatio="xMidYMid meet">
          ${j()}

          <!-- Scenic video or CSS poster sits behind this transparent SVG. -->
          ${U("hillsGroup")}

          <!-- Horizon Sky Glow -->
          <radialGradient id="horizonGlow" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.28" />
            <stop offset="60%" stop-color="#4c1d95" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#08080b" stop-opacity="0" />
          </radialGradient>
          <rect x="0" y="60" width="760" height="220" fill="url(#horizonGlow)" />

          <!-- Parallax Distant Stars / Stardust -->
          <circle cx="90" cy="40" r="1.3" fill="#e9d5ff" opacity="0.6" />
          <circle cx="210" cy="70" r="1.5" fill="#f0abfc" opacity="0.7" />
          <circle cx="360" cy="35" r="1.2" fill="#c084fc" opacity="0.5" />
          <circle cx="500" cy="65" r="1.6" fill="#f5d0fe" opacity="0.8" />
          <circle cx="670" cy="45" r="1.2" fill="#d8b4fe" opacity="0.6" />

          <!-- Parallax Clouds Group -->
          <g class="runner-clouds-layer" id="cloudsGroup"></g>

          <!-- Obstacles Layer -->
          <g class="runner-obstacles-layer" id="obstaclesGroup"></g>

          <!-- Mascot Layer (Positioned by RunnerEngine) -->
          <g class="runner-mascot-layer" id="mascotGroup"></g>

          <!-- Dino-style Textured Ground Group (Pebbles, dashes, baseline) -->
          <g class="runner-ground-layer" id="groundGroup"></g>
        </svg>

        <!-- On-screen Action Controls (Jump / Dodge) -->
        <div class="inline-touch-controls">
          <button class="touch-btn" id="modalJumpBtn">JUMP ↑</button>
          <button class="touch-btn" id="modalDodgeBtn">DODGE ↓</button>
        </div>

        <div class="runner-ready" id="gameReady">
          <span class="runner-ready-title">READY TO RUN?</span>
          <span class="runner-ready-hint">Jump over crystals. Duck beneath floating cubes.</span>
          <button class="runner-ready-btn" id="gameStartBtn" type="button">START RUNNING</button>
        </div>

        <!-- Milestone Sparkle Notification -->
        <div class="milestone-badge" id="milestoneBadge" style="display: none;">
          <span>+100 GAME SCORE</span>
        </div>

        <!-- Game Over Modal Overlay -->
        <div class="game-over-modal" id="gameOverModal" style="display: none;">
          <h2 class="game-over-title">GAME OVER</h2>
          <div class="game-over-stats">
            <div class="stat-item">
              <span class="stat-label">SCORE</span>
              <span class="stat-value" id="finalScoreVal">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">BEST</span>
              <span class="stat-value" id="finalBestVal">0</span>
            </div>
          </div>
          <div class="game-over-actions">
            <button class="game-btn game-btn-restart" id="gameRestartBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M1 4v6h6M23 20v-6h-6"></path>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              PLAY AGAIN
            </button>
            <button class="game-btn game-btn-exit" id="gameExitBtn">
              RETURN TO GALLERY
            </button>
          </div>
        </div>
      </div>
    </div>
  `,e}let v=null,B=null,D=null,O=null,he=!0,ue=.75,$=null;function pe(){if(v)return v.state==="suspended"&&v.resume().catch(()=>{}),v;const o=typeof window<"u"?window.AudioContext||window.webkitAudioContext:typeof AudioContext<"u"?AudioContext:null;if(!o)return null;try{return v=new o,B=v.createGain(),B.gain.setValueAtTime(ue,v.currentTime),B.connect(v.destination),D=v.createGain(),D.gain.setValueAtTime(he?1:0,v.currentTime),D.connect(B),O=v.createGain(),O.gain.setValueAtTime(1,v.currentTime),O.connect(B),v}catch{return null}}function ye(o){if($&&$.sampleRate===o.sampleRate)return $;try{const e=Math.floor(o.sampleRate*.1),i=o.createBuffer(1,e,o.sampleRate),t=i.getChannelData(0);for(let s=0;s<e;s++)t[s]=Math.random()*2-1;return $=i}catch{return null}}function R(o){const e=pe();e&&o(e,e.currentTime)}function me(){R((o,e)=>{const i=o.createOscillator(),t=o.createGain();i.type="sine",i.frequency.setValueAtTime(200,e),i.frequency.exponentialRampToValueAtTime(600,e+.1),t.gain.setValueAtTime(.3,e),t.gain.exponentialRampToValueAtTime(.001,e+.1),i.connect(t),t.connect(D),i.start(e),i.stop(e+.105),i.onended=()=>{try{i.disconnect(),t.disconnect()}catch{}}})}function ge(){R((o,e)=>{const i=ye(o);if(!i)return;const t=o.createBufferSource(),s=o.createBiquadFilter(),r=o.createGain();t.buffer=i,s.type="lowpass",s.frequency.setValueAtTime(650,e),s.frequency.exponentialRampToValueAtTime(140,e+.08),r.gain.setValueAtTime(.38,e),r.gain.exponentialRampToValueAtTime(.001,e+.08),t.connect(s),s.connect(r),r.connect(D),t.start(e),t.stop(e+.085),t.onended=()=>{try{t.disconnect(),s.disconnect(),r.disconnect()}catch{}}})}function be(){R((o,e)=>{const i=o.createOscillator(),t=o.createBiquadFilter(),s=o.createGain();i.type="sawtooth",i.frequency.setValueAtTime(340,e),i.frequency.exponentialRampToValueAtTime(65,e+.3),t.type="lowpass",t.frequency.setValueAtTime(700,e),t.frequency.exponentialRampToValueAtTime(180,e+.3),s.gain.setValueAtTime(.3,e),s.gain.exponentialRampToValueAtTime(.001,e+.3),i.connect(t),t.connect(s),s.connect(D),i.start(e),i.stop(e+.31),i.onended=()=>{try{i.disconnect(),t.disconnect(),s.disconnect()}catch{}}})}class J{constructor(e){this.character=e.character,this.container=e.container,this.sceneSvg=e.sceneSvg,this.mascotGroup=e.mascotGroup,this.obstaclesGroup=e.obstaclesGroup,this.groundGroup=e.groundGroup,this.cloudsGroup=e.cloudsGroup,this.hillsGroup=e.hillsGroup,this.onScoreUpdate=e.onScoreUpdate,this.onMilestone=e.onMilestone,this.onGameOver=e.onGameOver,this.onJumpSuccess=e.onJumpSuccess,this.onNewBest=e.onNewBest,this.width=e.width||760,this.height=e.height||280,this.groundY=220,this.mascotX=68,this.mascotScale=.52,this.mascotOrbBottom=144,this.baseMascotY=this.groundY-this.mascotOrbBottom*this.mascotScale,this.mascotY=this.baseMascotY,this.mascotWidth=96*this.mascotScale,this.mascotHeight=96*this.mascotScale,this.vy=0,this.gravity=980,this.jumpForce=-460,this.isGrounded=!0,this.isJumping=!1,this.isDodging=!1,this.isDead=!1,this.isPaused=!1,this.hasStarted=!1,this.landSquash=0,this.demoMode=!!e.demoMode,this.runCycleTime=0,this.baseSpeed=205,this.currentSpeed=this.baseSpeed,this.score=0,this.bestScore=this.loadBestScore(),this.lastMilestone=0,this.obstacles=[],this.nextSpawnTime=1.3,this.spawnTimer=0,this.terrainElements=[],this.initTerrain(),this.groundOffset=0,this.hillsOffset=0,this.tileWidth=this.width,this.clouds=[],this.initClouds(),this.setupSceneLayers(),this.lastTime=0,this.animFrameId=null,this.stateTimers=new Set,this.updateMascotTransform(),this.character.setLocomotion("idle"),this.demoMode&&this.start()}setDemoMode(e){this.demoMode=!!e,this.demoMode&&(this.isDead?this.restart():this.hasStarted?this.isPaused&&this.resume():this.start())}loadBestScore(){try{const e=localStorage.getItem(`prismlab_best_${this.character.id}`);return e?parseInt(e,10):0}catch{return 0}}saveBestScore(){const e=Math.floor(this.score);if(!(e<=this.bestScore)){this.bestScore=e;try{localStorage.setItem(`prismlab_best_${this.character.id}`,String(e))}catch{}}}initTerrain(){for(let e=0;e<this.width+60;e+=35+Math.random()*40)this.terrainElements.push({x:e,y:this.groundY+4+Math.random()*12,width:3+Math.random()*6,type:Math.random()>.4?"dash":"dot"})}initClouds(){for(let e=0;e<3;e++)this.clouds.push({x:60+e*260+Math.random()*60,y:40+Math.random()*50,speedFactor:.15+Math.random()*.1,width:48+Math.random()*24})}setupSceneLayers(){if(this.groundGroup){this.groundGroup.innerHTML=`
        <rect x="0" y="${this.groundY}" width="${this.width}" height="60" fill="#24143d" />
        <g class="terrain-tiles">
          <image href="/runner-prototype/assets/runner-ground-bricks.png" x="0" y="${this.groundY}" width="${this.tileWidth}" height="60" preserveAspectRatio="none" />
          <image href="/runner-prototype/assets/runner-ground-bricks.png" x="${this.tileWidth}" y="${this.groundY}" width="${this.tileWidth}" height="60" preserveAspectRatio="none" />
        </g>
        <line x1="0" y1="${this.groundY}" x2="${this.width}" y2="${this.groundY}" stroke="#e9d5ff" stroke-width="2" opacity=".9" />
        <g class="terrain-details"></g>`,this.tileGroup=this.groundGroup.querySelector(".terrain-tiles");const e=this.groundGroup.querySelector(".terrain-details");this.terrainNodes=this.terrainElements.map(i=>{const t=document.createElementNS("http://www.w3.org/2000/svg",i.type==="dash"?"line":"circle");return i.type==="dash"?(t.setAttribute("stroke","#f0abfc"),t.setAttribute("stroke-width","1.6"),t.setAttribute("stroke-linecap","round")):(t.setAttribute("r","1.4"),t.setAttribute("fill","#ffffff")),t.setAttribute("opacity",i.type==="dash"?".75":".85"),e.appendChild(t),t}),this.updateTerrain(0)}this.cloudsGroup&&(this.cloudsGroup.innerHTML=this.clouds.map(()=>`
        <g opacity=".35">
          <ellipse cx="20" cy="12" rx="18" ry="8" fill="#7c3aed" />
          <ellipse cx="32" cy="10" rx="14" ry="7" fill="#a855f7" />
          <ellipse cx="24" cy="11" rx="12" ry="5" fill="#f0abfc" />
        </g>`).join(""),this.cloudNodes=[...this.cloudsGroup.children],this.updateClouds(0))}start(){this.isPaused=!1,this.isDead=!1,this.hasStarted=!0,this.character.setLocomotion("run"),this.lastTime=performance.now(),this.animFrameId=requestAnimationFrame(this.loop.bind(this))}scheduleState(e,i){const t=setTimeout(()=>{this.stateTimers.delete(t),this.hasStarted&&!this.isDead&&e()},i);this.stateTimers.add(t)}clearStateTimers(){this.stateTimers.forEach(clearTimeout),this.stateTimers.clear()}dodge(e=!0){this.isDead||this.isPaused||(e?this.isDodging||(this.isDodging=!0,ge(),this.isGrounded||(this.vy+=850),this.character.setLocomotion("dodge")):this.isDodging&&(this.isDodging=!1,this.isGrounded&&!this.isDead&&this.character.setLocomotion("run")))}jump(){this.isDead||this.isPaused||this.isGrounded&&(this.isGrounded=!1,this.isJumping=!0,this.isDodging=!1,this.vy=this.jumpForce,me(),this.character.setLocomotion("jump"))}loop(e){if(this.isPaused)return;const i=Math.min((e-this.lastTime)/1e3,.1);this.lastTime=e,this.isDead||this.update(i),this.isDead||(this.animFrameId=requestAnimationFrame(this.loop.bind(this)))}update(e){var s,r,l,a,c;this.currentSpeed=this.baseSpeed+Math.min(Math.floor(this.score/80)*10,180),this.score+=e*18*(this.currentSpeed/this.baseSpeed);const i=Math.floor(this.score);this.onScoreUpdate&&this.onScoreUpdate(i,Math.max(i,this.bestScore));const t=Math.floor(this.score/100);if(t>this.lastMilestone&&(this.lastMilestone=t),this.isGrounded)if(this.isDodging)(s=this.mascotGroup)==null||s.setAttribute("transform",`translate(${this.mascotX}, ${this.mascotY+12}) scale(${this.mascotScale*1.34}, ${this.mascotScale*.65})`);else{this.runCycleTime+=e*(this.currentSpeed/50);const n=Math.sin(this.runCycleTime*4)*3,f=1+Math.sin(this.runCycleTime*4)*.03,y=this.mascotScale*f*(1+(this.landSquash||0)*.15),m=this.mascotScale/f*(1-(this.landSquash||0)*.1);this.mascotGroup&&this.mascotGroup.setAttribute("transform",`translate(${this.mascotX}, ${this.mascotY+n}) scale(${y}, ${m})`),this.landSquash=Math.max(0,(this.landSquash||0)*.88)}else{this.vy+=this.gravity*e,this.mascotY+=this.vy*e;const n=Math.max(-15,Math.min(15,this.vy*.018));this.mascotY>=this.baseMascotY?(this.mascotY=this.baseMascotY,this.vy=0,this.isGrounded=!0,this.isJumping=!1,this.landSquash=.2,this.isDodging?this.character.setLocomotion("dodge"):(this.character.setLocomotion("land"),this.scheduleState(()=>{!this.isDead&&this.isGrounded&&!this.isDodging&&this.character.setLocomotion("run")},90)),this.updateMascotTransform()):this.mascotGroup&&this.mascotGroup.setAttribute("transform",`translate(${this.mascotX}, ${this.mascotY}) rotate(${n} ${this.mascotX+45} ${this.mascotY+40}) scale(${this.mascotScale})`)}if(this.updateTerrain(e),this.updateHills(e),this.updateClouds(e),this.spawnTimer+=e,this.spawnTimer>=this.nextSpawnTime){this.spawnObstacle(),this.spawnTimer=0;const n=this.baseSpeed/this.currentSpeed;this.nextSpawnTime=(1.1+Math.random()*1.1)*n}if(this.demoMode&&!this.isDead)for(const n of this.obstacles){const f=n.x-this.mascotX;if(f>0&&f<120){n.type==="floating-cube"?this.isGrounded&&!this.isDodging&&this.dodge(!0):this.isGrounded&&!this.isJumping&&this.jump();break}f>0&&f>140&&this.isDodging&&this.dodge(!1)}for(let n=this.obstacles.length-1;n>=0;n--){const f=this.obstacles[n];f.update(e,this.currentSpeed);const y=(r=this.obstaclesGroup)==null?void 0:r.querySelector(`#${f.id}`);if(y&&y.setAttribute("transform",`translate(${f.x}, ${f.y})`),this.checkCollision(f)){this.handleGameOver();return}f.x<-60&&(y&&y.remove(),this.obstacles.splice(n,1)),!f.passed&&f.getBounds().right<this.mascotX+42*this.mascotScale&&(f.passed=!0,this.isJumping&&((a=(l=this.character).setEmotion)==null||a.call(l,"happy"),(c=this.onJumpSuccess)==null||c.call(this)))}}updateMascotTransform(e=0){if(this.mascotGroup){const i=e?` rotate(${e} ${this.mascotX+45} ${this.mascotY+40})`:"";this.mascotGroup.setAttribute("transform",`translate(${this.mascotX}, ${this.mascotY})${i} scale(${this.mascotScale})`)}}updateTerrain(e){var i;if(this.groundGroup){this.groundOffset=(this.groundOffset+this.currentSpeed*e)%this.tileWidth;for(let t=0;t<this.terrainElements.length;t++){const s=this.terrainElements[t];s.x-=this.currentSpeed*e,s.x<-20&&(s.x=this.width+10+Math.random()*30,s.y=this.groundY+4+Math.random()*14)}(i=this.tileGroup)==null||i.setAttribute("transform",`translate(${-this.groundOffset}, 0)`),this.terrainElements.forEach((t,s)=>{const r=this.terrainNodes[s];r&&(t.type==="dash"?(r.setAttribute("x1",t.x),r.setAttribute("x2",t.x+t.width),r.setAttribute("y1",t.y),r.setAttribute("y2",t.y)):(r.setAttribute("cx",t.x),r.setAttribute("cy",t.y)))})}}updateClouds(e){var i;if(this.cloudsGroup)for(const[t,s]of this.clouds.entries())s.x-=this.currentSpeed*s.speedFactor*e,s.x<-60&&(s.x=this.width+40,s.y=35+Math.random()*55),(i=this.cloudNodes[t])==null||i.setAttribute("transform",`translate(${s.x}, ${s.y})`)}updateHills(e){this.hillsGroup&&(this.hillsOffset=(this.hillsOffset+this.currentSpeed*e*.06)%this.width,this.hillsGroup.setAttribute("transform",`translate(${-this.hillsOffset}, 0)`))}spawnObstacle(){var s;const e=V[Math.floor(Math.random()*V.length)],i=new ce(e,this.width+20,this.groundY,this.currentSpeed);this.obstacles.push(i);const t=i.renderSvg();(s=this.obstaclesGroup)==null||s.appendChild(t)}checkCollision(e){const i=e.getBounds(),t=10,s=this.isDodging?20*this.mascotScale:68*this.mascotScale,r=this.isDodging?this.groundY-s:this.mascotY+52*this.mascotScale,l=this.mascotX+42*this.mascotScale+t,a=this.mascotX+138*this.mascotScale-t,c=this.isDodging?this.groundY-2:this.mascotY+139*this.mascotScale;return!(a<i.left||l>i.right||c<i.top||r>i.bottom)}handleGameOver(){var i;this.isDead=!0,be();const e=Math.floor(this.score)>this.bestScore;this.saveBestScore(),this.character.setLocomotion("hurt"),e&&((i=this.onNewBest)==null||i.call(this,this.bestScore)),this.onGameOver&&this.onGameOver(Math.floor(this.score),this.bestScore)}pause(){this.isPaused=!0,this.clearStateTimers(),this.animFrameId&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null)}resume(){!this.hasStarted||!this.isPaused||this.isDead||(this.isPaused=!1,this.isGrounded&&!this.isDodging&&this.character.setLocomotion("run"),this.lastTime=performance.now(),this.animFrameId=requestAnimationFrame(this.loop.bind(this)))}restart(){this.pause(),this.clearStateTimers(),this.obstacles.forEach(e=>{var t;const i=(t=this.obstaclesGroup)==null?void 0:t.querySelector(`#${e.id}`);i&&i.remove()}),this.obstacles=[],this.score=0,this.lastMilestone=0,this.spawnTimer=0,this.isDodging=!1,this.mascotY=this.baseMascotY,this.vy=0,this.isGrounded=!0,this.isJumping=!1,this.isDead=!1,this.landSquash=0,this.currentSpeed=this.baseSpeed,this.hillsOffset=0,this.character.setLocomotion("run"),this.updateMascotTransform(),this.start()}destroy(){this.pause(),this.clearStateTimers(),this.hasStarted=!1,this.obstacles.forEach(e=>{var t;const i=(t=this.obstaclesGroup)==null?void 0:t.querySelector(`#${e.id}`);i&&i.remove()}),this.obstacles=[]}}const Q="/runner-prototype/media/backgrounds/";function F(o,e,{shouldPlay:i=()=>!0}={}){const t=document.createElement("video");t.className=`world-video world-video-${e}`,t.muted=!0,t.defaultMuted=!0,t.autoplay=!0,t.loop=!0,t.playsInline=!0,t.preload=e==="gallery"?"metadata":"none",t.poster=`${Q}${e}-night-poster.webp`,t.setAttribute("aria-hidden","true"),t.innerHTML=`<source src="${Q}${e}-night.webm" type="video/webm"><source src="${Q}${e}-night.mp4" type="video/mp4">`,o.prepend(t);const s=matchMedia("(prefers-reduced-motion: reduce)"),r=()=>{document.hidden||s.matches||!o.isConnected||!i()||e==="gallery"&&document.querySelector(".game-overlay-visible")?t.pause():t.play().catch(()=>{t.classList.add("video-failed"),o.classList.add("scenery-fallback")})},l=()=>{o.closest(".game-overlay")||t.pause()},a=()=>r();return t.addEventListener("error",()=>{t.classList.add("video-failed"),o.classList.add("scenery-fallback")}),t.addEventListener("playing",()=>o.classList.remove("scenery-fallback")),document.addEventListener("visibilitychange",r),document.addEventListener("prism:game-open",l),document.addEventListener("prism:game-close",a),s.addEventListener("change",r),r(),()=>{document.removeEventListener("visibilitychange",r),document.removeEventListener("prism:game-open",l),document.removeEventListener("prism:game-close",a),s.removeEventListener("change",r),t.pause(),t.remove(),o.classList.remove("scenery-fallback")}}const N=new WeakMap;function G(o,e){var t;if(!o)return;clearTimeout(N.get(o)),(t=o.querySelector(".runner-dialogue"))==null||t.remove();const i=document.createElement("span");i.className="runner-dialogue",i.textContent=e,o.appendChild(i),N.set(o,setTimeout(()=>i.remove(),1900))}const W={"lfm3-17b":{idle:["Oh! Hello there!","I have an idea!"],react:["That tickles!","Watch me!"],launch:["Watch me!"]},"lfm3-vl-2b":{idle:["Interesting!","Did something move?"],react:["I see you!","Let me look closer..."],launch:["Eyes on the trail!"]},"lfm3-audio-2b":{idle:["La la la~","That's my favourite sound!"],react:["Did you hear that?","One more beat!"],launch:["Feel the rhythm!"]},"lfm3-omni-2b":{idle:["I'm listening!","I'm ready!"],react:["Look! Over there!","So many things happening!"],launch:["I'm ready!"]},"d1-2b":{idle:["Hmm... intriguing.","One more possibility..."],react:["Let me think...","Aha! Got it!"],launch:["Let me calculate..."]},"d1-omni-2b":{idle:["Something's suspicious...","A clue!"],react:["Case closed!","Mystery solved!"],launch:["The chase is on!"]}};function xe(o){return o.replace(/^(inline|game)-/,"")}function K(o,e,i=""){var r;const t=((r=W[xe(o)])==null?void 0:r[e])||W["lfm3-17b"].idle,s=t.filter(l=>l!==i);return s[Math.floor(Math.random()*s.length)]||t[0]}let A=null;class M{constructor(e){this.character=e,this.overlayElement=null,this.engine=null,this.boundKeyDown=null,this.boundVisibilityChange=null,this.boundStageTap=null,this.hasStarted=!1}static launch(e){A&&A.close();const i=new M(e);return i.init(),A=i,document.dispatchEvent(new Event("prism:game-open")),i}static getActive(){return A}init(){this.character.pause(),this.overlayElement=de(this.character),document.body.appendChild(this.overlayElement);const e=this.overlayElement.querySelector("#mascotGroup"),i=this.overlayElement.querySelector("#obstaclesGroup"),t=this.overlayElement.querySelector("#groundGroup"),s=this.overlayElement.querySelector("#cloudsGroup"),r=this.overlayElement.querySelector("#hillsGroup"),l=this.overlayElement.querySelector(".runner-scene-svg"),a=this.overlayElement.querySelector("#gameCurrentScore"),c=this.overlayElement.querySelector("#gameBestScore"),n=this.overlayElement.querySelector("#milestoneBadge"),f=this.overlayElement.querySelector("#gameOverModal"),y=this.overlayElement.querySelector("#finalScoreVal"),m=this.overlayElement.querySelector("#finalBestVal"),d=this.overlayElement.querySelector("#gameRestartBtn"),u=this.overlayElement.querySelector("#gameExitBtn"),g=this.overlayElement.querySelector("#gameCloseBtn"),p=this.overlayElement.querySelector("#gameStageViewport");G(p,K(this.character.id,"launch")),this.newBest=!1,this.disposeVideo=F(p,"runner"),this.runnerMascot=new P({id:`game-${this.character.id}`,name:this.character.name,accessories:this.character.accessories,timingOffset:0,initialEmotion:"idle"});const w=this.runnerMascot.render().querySelector("svg");w.classList.add("runner-mascot-svg"),w.setAttribute("width","180"),w.setAttribute("height","180"),e.appendChild(w),this.engine=new J({character:this.runnerMascot,container:p,sceneSvg:l,mascotGroup:e,obstaclesGroup:i,groundGroup:t,cloudsGroup:s,hillsGroup:r,width:760,height:280,onScoreUpdate:(h,x)=>{a&&(a.textContent=h.toString().padStart(5,"0")),c&&(c.textContent=x.toString().padStart(5,"0"))},onMilestone:h=>{G(p,"Look at us go!"),n&&(n.textContent=`+${h} GAME SCORE`,n.style.display="block",n.classList.add("milestone-pop"),clearTimeout(this.milestoneTimer),this.milestoneTimer=setTimeout(()=>{n.classList.remove("milestone-pop"),n.style.display="none"},1200))},onGameOver:(h,x)=>{this.newBest||G(p,"Ouch! One more try?"),y&&(y.textContent=h),m&&(m.textContent=x),this.gameOverTimer=setTimeout(()=>{f!=null&&f.isConnected&&(f.style.display="flex",f.classList.add("fade-in"))},650)},onNewBest:()=>{this.newBest=!0,G(p,"A new best!")},onJumpSuccess:()=>{Math.random()<.2&&G(p,"Nice jump!")}}),c&&(c.textContent=this.engine.bestScore.toString().padStart(5,"0")),this.boundKeyDown=h=>{var x,q;if(h.code==="Tab"){const C=[...this.overlayElement.querySelectorAll('button, [tabindex="0"]')].filter(X=>X.offsetParent!==null),I=C.indexOf(document.activeElement);h.shiftKey&&I<=0?(h.preventDefault(),(x=C.at(-1))==null||x.focus()):!h.shiftKey&&I===C.length-1&&(h.preventDefault(),(q=C[0])==null||q.focus());return}if(!(h.target instanceof Element&&h.target.closest("button")&&h.code!=="Escape")){if(h.code==="Escape"){h.preventDefault(),this.close();return}if(h.code==="Space"||h.code==="ArrowUp"||h.code==="KeyW"){if(h.preventDefault(),!this.hasStarted){this.startGame();return}this.engine.isDead?this.restartGame():this.engine.jump()}else h.code==="ArrowDown"||h.code==="KeyS"?(h.preventDefault(),this.engine.isDead||this.engine.dodge(!0)):h.code==="Enter"&&this.engine.isDead&&(h.preventDefault(),this.restartGame())}},window.addEventListener("keydown",this.boundKeyDown),this.boundKeyUp=h=>{(h.code==="ArrowDown"||h.code==="KeyS")&&(h.preventDefault(),this.engine.dodge(!1))},window.addEventListener("keyup",this.boundKeyUp);const T=this.overlayElement.querySelector("#modalJumpBtn");T&&T.addEventListener("pointerdown",h=>{h.stopPropagation(),this.hasStarted||this.startGame(),this.engine.isDead?this.restartGame():this.engine.jump()});const L=this.overlayElement.querySelector("#modalDodgeBtn");if(L){L.addEventListener("pointerdown",x=>{x.stopPropagation(),this.hasStarted||this.startGame(),L.classList.add("is-pressed"),this.engine.dodge(!0)});const h=x=>{x==null||x.stopPropagation(),L.classList.remove("is-pressed"),this.engine.dodge(!1)};L.addEventListener("pointerup",h),L.addEventListener("pointerleave",h),L.addEventListener("pointercancel",h)}this.boundStageTap=h=>{if(h.target.closest("button"))return;if(!this.hasStarted){this.startGame();return}if(this.engine.isDead){this.restartGame();return}const x=p.getBoundingClientRect();(h.clientY-x.top)/x.height>.68?(this.engine.dodge(!0),clearTimeout(this.dodgeTimer),this.dodgeTimer=setTimeout(()=>{var C;return(C=this.engine)==null?void 0:C.dodge(!1)},380)):this.engine.jump()},p.addEventListener("pointerdown",this.boundStageTap),d.addEventListener("click",()=>this.restartGame()),u.addEventListener("click",()=>this.close()),g.addEventListener("click",()=>this.close()),this.overlayElement.querySelector("#gameStartBtn").addEventListener("click",h=>{h.stopPropagation(),this.startGame(),p.focus()}),this.boundVisibilityChange=()=>{document.hidden?this.engine.pause():this.engine.resume()},document.addEventListener("visibilitychange",this.boundVisibilityChange),requestAnimationFrame(()=>{this.overlayElement.classList.add("game-overlay-visible"),p.focus()})}startGame(){this.hasStarted||(this.hasStarted=!0,this.overlayElement.querySelector("#gameReady").style.display="none",this.engine.start())}restartGame(){clearTimeout(this.gameOverTimer),clearTimeout(this.milestoneTimer),clearTimeout(this.dodgeTimer),this.newBest=!1;const e=this.overlayElement.querySelector("#gameOverModal");e&&(e.style.display="none"),this.hasStarted=!0,this.engine&&this.engine.restart()}close(){var e;if(clearTimeout(this.gameOverTimer),clearTimeout(this.milestoneTimer),clearTimeout(this.dodgeTimer),(e=this.disposeVideo)==null||e.call(this),this.disposeVideo=null,this.engine&&(this.engine.destroy(),this.engine=null),this.boundKeyDown&&(window.removeEventListener("keydown",this.boundKeyDown),this.boundKeyDown=null),this.boundKeyUp&&(window.removeEventListener("keyup",this.boundKeyUp),this.boundKeyUp=null),this.boundVisibilityChange&&(document.removeEventListener("visibilitychange",this.boundVisibilityChange),this.boundVisibilityChange=null),this.boundStageTap&&this.overlayElement){const i=this.overlayElement.querySelector("#gameStageViewport");i&&i.removeEventListener("pointerdown",this.boundStageTap),this.boundStageTap=null}this.runnerMascot&&(this.runnerMascot.destroy(),this.runnerMascot=null),this.overlayElement&&(this.overlayElement.classList.remove("game-overlay-visible"),setTimeout(()=>{this.overlayElement&&(this.overlayElement.remove(),this.overlayElement=null)},200)),this.character.resume(),this.character.container&&this.character.container.focus(),A===this&&(A=null),document.dispatchEvent(new Event("prism:game-close"))}}const ke=["idle","happy","sad","angry","excited","surprised","curious","shy","sleepy","confused","thinking","proud"];function we(o){const e=E[o]||E.idle;let i="";e.leftEye.type==="arc"?i='<path d="M 12 19 Q 15 15.5 18 19" fill="none" stroke="#352046" stroke-width="1.8" stroke-linecap="round" />':e.leftEye.type==="droop"?i='<ellipse cx="15" cy="20" rx="2.0" ry="1.6" fill="#352046" />':e.leftEye.type==="narrow"?i='<ellipse cx="15" cy="19.5" rx="2.2" ry="1.4" fill="#352046" />':i=`<ellipse cx="15" cy="19" rx="2.2" ry="3.0" fill="#352046" />
      ${e.leftEye.glint?'<circle cx="16" cy="17.8" r="0.8" fill="#ffffff" />':""}
      ${e.leftEye.sparkle?'<circle cx="15" cy="18" r="1.3" fill="#ffffff" />':""}`;let t="";e.rightEye.type==="arc"?t='<path d="M 22 19 Q 25 15.5 28 19" fill="none" stroke="#352046" stroke-width="1.8" stroke-linecap="round" />':e.rightEye.type==="droop"?t='<ellipse cx="25" cy="20" rx="2.0" ry="1.6" fill="#352046" />':e.rightEye.type==="narrow"?t='<ellipse cx="25" cy="19.5" rx="2.2" ry="1.4" fill="#352046" />':t=`<ellipse cx="25" cy="19" rx="2.2" ry="3.0" fill="#352046" />
      ${e.rightEye.glint?'<circle cx="26" cy="17.8" r="0.8" fill="#ffffff" />':""}
      ${e.rightEye.sparkle?'<circle cx="25" cy="18" r="1.3" fill="#ffffff" />':""}`;let s="";e.mouth.d.includes("A 2.5")?s='<circle cx="20" cy="23.5" r="1.6" fill="#352046" />':e.mouth.hasTongue?s=`<path d="M 18 22 Q 20 25.5 22 22 Z" fill="#352046" />
                <path d="M 19 24.2 Q 20 23.2 21 24.2 Z" fill="#ff9ebb" />`:s='<path d="M 18.2 22.5 Q 20 24.8 21.8 22.5" fill="none" stroke="#352046" stroke-width="1.4" stroke-linecap="round" />';let r="";return e.eyebrows&&e.eyebrows.visible&&(o==="angry"?r=`<line x1="13" y1="14" x2="17" y2="15.5" stroke="#352046" stroke-width="1.2" stroke-linecap="round" />
                  <line x1="27" y1="14" x2="23" y2="15.5" stroke="#352046" stroke-width="1.2" stroke-linecap="round" />`:r=`<path d="M 13 14 Q 15 12.5 17 14" fill="none" stroke="#352046" stroke-width="1.1" stroke-linecap="round" />
                  <path d="M 23 14 Q 25 12.5 27 14" fill="none" stroke="#352046" stroke-width="1.1" stroke-linecap="round" />`),`
    <svg width="38" height="38" viewBox="0 0 40 40" class="mini-face-svg">
      <defs>
        <radialGradient id="mini-face-grad-${o}" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#fae9f8" />
          <stop offset="70%" stop-color="#ebd5f5" />
          <stop offset="100%" stop-color="#d6bcf1" />
        </radialGradient>
      </defs>
      <!-- Outer orb shell -->
      <circle cx="20" cy="20" r="18.5" fill="#7b6c8f" stroke="#a78bfa" stroke-width="0.8" opacity="0.6" />
      <!-- Inner pastel face -->
      <circle cx="20" cy="20.5" r="15" fill="url(#mini-face-grad-${o})" />
      <!-- Soft blushes -->
      <circle cx="11.5" cy="23" r="3.2" fill="#ec4899" opacity="${e.blushOpacity||.4}" />
      <circle cx="28.5" cy="23" r="3.2" fill="#ec4899" opacity="${e.blushOpacity||.4}" />
      <!-- Eyes & Brows -->
      ${r}
      ${i}
      ${t}
      <!-- Mouth -->
      ${s}
    </svg>
  `}function ve(o){switch(o){case"idle":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 11.5 3.5 C 6.5 4 3 8 4 13 C 4.8 17 8.5 18 12 16.5 C 7.5 14.5 6.5 8.5 11.5 3.5 Z" fill="#fef08a" stroke="#facc15" stroke-width="0.8" stroke-linejoin="round" />
          <path d="M 15 5.5 Q 15 7.5 13 7.5 Q 15 7.5 15 9.5 Q 15 7.5 17 7.5 Q 15 7.5 15 5.5 Z" fill="#ffffff" />
          <circle cx="15.5" cy="13.5" r="0.75" fill="#fef08a" opacity="0.8" />
        </svg>
      `.trim();case"happy":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 5.5 14 C 7.5 11 9 9 11.5 6.5" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" />
          <path d="M 9.5 15.5 C 11.5 12.5 13 10.5 15.5 8" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" />
        </svg>
      `.trim();case"sad":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 10 3 C 9.5 5.5 5.5 9.5 5.5 13 C 5.5 15.5 7.5 17.5 10 17.5 C 12.5 17.5 14.5 15.5 14.5 13 C 14.5 9.5 10.5 5.5 10 3 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" />
          <path d="M 8 11.5 C 7.5 12.5 7.5 13.8 8 14.8" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.85" fill="none" />
        </svg>
      `.trim();case"angry":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="6" y1="6" x2="14" y2="14" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
          <line x1="14" y1="6" x2="6" y2="14" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="5.5" cy="5.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="14.5" cy="5.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="5.5" cy="14.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="14.5" cy="14.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
        </svg>
      `.trim();case"excited":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="10" y1="9" x2="10" y2="3" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <line x1="7.5" y1="11" x2="3.5" y2="6.5" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <line x1="12.5" y1="11" x2="16.5" y2="6.5" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <circle cx="10" cy="2.5" r="1" fill="#ffffff" />
          <circle cx="3" cy="6" r="0.9" fill="#ffffff" />
          <circle cx="17" cy="6" r="0.9" fill="#ffffff" />
          <path d="M 8.5 13.5 Q 10 12 11.5 13.5" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round" fill="none" />
        </svg>
      `.trim();case"surprised":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="10" y1="3.5" x2="10" y2="11.5" stroke="#fbbf24" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="10" cy="16" r="1.6" fill="#fbbf24" />
        </svg>
      `.trim();case"curious":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 7.5 6.5 C 7.5 4.5 9 3 10.5 3 C 12.5 3 13.5 4.5 13.5 6.2 C 13.5 8 11.8 9.2 10.5 10.5 L 10.5 11.8" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <circle cx="10.5" cy="16" r="1.5" fill="#38bdf8" />
        </svg>
      `.trim();case"shy":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 15.5 3.5 C 15 4.8 12.8 6.2 11.8 7.5 C 10.8 8.8 11.2 10.8 12.5 11.5 C 13.8 12.2 15.8 11.5 16.5 10.2 C 17.2 8.8 15.5 3.5 15.5 3.5 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" />
          <circle cx="12.8" cy="9.2" r="0.75" fill="#ffffff" opacity="0.85" />
          <line x1="4.5" y1="16" x2="8.5" y2="11" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
          <line x1="8.5" y1="16.5" x2="12.5" y2="11.5" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `.trim();case"sleepy":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <!-- Large Z -->
          <path d="M 4 11 L 9 11 L 4 17 L 9 17" fill="none" stroke="#a5b4fc" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Medium Z -->
          <path d="M 9.5 6.5 L 13.5 6.5 L 9.5 11 L 13.5 11" fill="none" stroke="#a5b4fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Small Z -->
          <path d="M 14.5 3 L 17.5 3 L 14.5 6.5 L 17.5 6.5" fill="none" stroke="#a5b4fc" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `.trim();case"confused":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 10 10 C 10.6 10 11.2 10.4 11.2 11 C 11.2 11.8 10.4 12.4 9.5 12.4 C 8.3 12.4 7.4 11.4 7.4 10 C 7.4 8.3 8.8 7 10.5 7 C 12.5 7 14 8.5 14 10.5 C 14 12.8 12.1 14.5 9.8 14.5 C 7 14.5 5 12.5 5 9.8 C 5 6.8 7.5 4.5 10.5 4.5 C 13 4.5 15.5 6 16 8.5" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `.trim();case"thinking":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 6 10.5 C 4 10.5 3 9 3 7.5 C 3 6 4.2 4.8 5.8 4.8 C 6.5 3.5 8 2.5 10 2.5 C 12.2 2.5 13.8 3.8 14.3 5 C 15.8 5.2 17 6.3 17 7.8 C 17 9.5 15.5 10.5 14 10.5 Z" fill="rgba(199, 210, 254, 0.2)" stroke="#c7d2fe" stroke-width="1.2" stroke-linejoin="round" />
          <circle cx="6.5" cy="13.5" r="1.3" fill="#c7d2fe" />
          <circle cx="4.5" cy="16.5" r="0.85" fill="#c7d2fe" />
        </svg>
      `.trim();case"proud":return`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 4 6 L 7.5 9.5 L 10 3.5 L 12.5 9.5 L 16 6 L 15 14.5 C 11.5 15.5 8.5 15.5 5 14.5 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.1" stroke-linejoin="round" />
          <circle cx="4" cy="5.5" r="1" fill="#ec4899" />
          <circle cx="10" cy="3" r="1.2" fill="#38bdf8" />
          <circle cx="16" cy="5.5" r="1" fill="#ec4899" />
          <circle cx="10" cy="12.5" r="0.9" fill="#ffffff" opacity="0.9" />
        </svg>
      `.trim();default:return""}}function Se(o,e){if(!o)return;o.innerHTML=`
    <div class="panel-header">
      <span class="panel-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="panel-icon-svg" aria-hidden="true">
          <!-- Tragedy mask (behind, top-right) -->
          <path d="M 7.5 4 C 7.5 2 13.5 2 13.5 4 C 13.5 8 12.5 11 10.5 11.5 C 8.5 11 7.5 8 7.5 4 Z" fill="#24143d" stroke="#c084fc" stroke-width="1" stroke-linejoin="round" />
          <path d="M 13.4 4.5 C 14.4 4.3 15 4.8 15.5 4.5" stroke="#a855f7" stroke-width="0.8" stroke-linecap="round" />
          <circle cx="9.2" cy="5.2" r="0.65" fill="#f3e8ff" />
          <circle cx="11.8" cy="5.2" r="0.65" fill="#f3e8ff" />
          <path d="M 9.4 8.2 Q 10.5 7 11.6 8.2" stroke="#f3e8ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <!-- Comedy mask (in front, bottom-left) -->
          <path d="M 2.5 7 C 2.5 5 8.5 5 8.5 7 C 8.5 11 7.5 14 5.5 14.5 C 3.5 14 2.5 11 2.5 7 Z" fill="#2e184d" stroke="#e879f9" stroke-width="1.1" stroke-linejoin="round" />
          <path d="M 2.6 7 C 1.6 7.2 1 7.8 0.5 7.5" stroke="#a855f7" stroke-width="0.8" stroke-linecap="round" />
          <path d="M 3.8 8.2 Q 4.6 7 5.3 8.2" stroke="#fdf4ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <path d="M 5.8 8.2 Q 6.5 7 7.2 8.2" stroke="#fdf4ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <path d="M 4.2 10.6 Q 5.5 12.8 6.8 10.6" stroke="#fdf4ff" stroke-width="1" stroke-linecap="round" fill="none" />
          <circle cx="3.6" cy="9.6" r="0.6" fill="#ec4899" opacity="0.6" />
          <circle cx="7.4" cy="9.6" r="0.6" fill="#ec4899" opacity="0.6" />
        </svg>
      </span>
      <h2 class="panel-title">Example Emotions & Reactions</h2>
    </div>
    <div class="emotions-grid">
      ${ke.map(t=>{var r;const s=((r=E[t])==null?void 0:r.name)||t;return`
          <button class="emotion-item" data-emotion="${t}" title="Apply ${s} emotion">
            <div class="emotion-avatar">
              ${we(t)}
              <span class="emotion-ornament">${ve(t)}</span>
            </div>
            <span class="emotion-name">${s}</span>
          </button>
        `}).join("")}
    </div>
  `;const i=o.querySelectorAll(".emotion-item");i.forEach(t=>{t.addEventListener("click",()=>{const s=t.dataset.emotion;i.forEach(r=>r.classList.remove("is-active")),t.classList.add("is-active"),e.forEach(r=>{r.showEmotionFor(s)})})})}class Me{constructor(e,i,t=1){this.container=e,this.characters=i,this.currentMascot=i[t]||i[0],this.engine=null,this.runnerMascot=null,this.isPaused=!1,this.render(),this.initEngine(),this.updateActiveCardHighlight()}render(){this.container.innerHTML=`
      <div class="inline-runner-card">
        <!-- Top Game Header Bar -->
        <header class="inline-hud">
          <div class="inline-hud-left">
            <button class="inline-mascot-pill" id="inlineMascotPicker" title="Click to cycle mascot">
              <span class="inline-mascot-label" id="inlineMascotName">${this.currentMascot.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span class="inline-hud-hint">SPACE / ↑ JUMP • ↓ / S DODGE</span>
          </div>

          <div class="inline-hud-right">
            <div class="inline-score-box">
              <span class="inline-hi-tag">HI</span>
              <span class="inline-hi-val" id="inlineHiVal">00297</span>
              <span class="inline-score-val" id="inlineScoreVal">00000</span>
            </div>
            
            <button class="inline-icon-btn" id="inlinePauseBtn" title="Pause / Play">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" id="inlinePauseIcon">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            </button>

            <button class="inline-icon-btn" id="inlineExpandBtn" title="Launch Fullscreen Stage">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>
        </header>

        <!-- Runner Stage Viewport -->
        <div class="inline-stage-viewport" id="inlineStage" tabindex="0" aria-label="Inline runner. Space or Up to jump, Down or S to dodge.">
          <svg class="inline-runner-svg" viewBox="0 0 760 280" preserveAspectRatio="xMidYMid meet">
            ${j()}

            <!-- Scenic video or CSS poster sits behind this transparent SVG. -->
            ${U("inlineHillsGroup")}

            <!-- Parallax Clouds Group -->
            <g class="runner-clouds-layer" id="inlineCloudsGroup"></g>

            <!-- Obstacles Layer -->
            <g class="runner-obstacles-layer" id="inlineObstaclesGroup"></g>

            <!-- Mascot Layer -->
            <g class="runner-mascot-layer" id="inlineMascotGroup"></g>

            <!-- Dino-style Scrolling Brick Ground Group -->
            <g class="runner-ground-layer" id="inlineGroundGroup"></g>
          </svg>

          <!-- On-screen Action Controls (Jump / Dodge) -->
          <div class="inline-touch-controls">
            <button class="touch-btn" id="inlineJumpBtn">JUMP ↑</button>
            <button class="touch-btn" id="inlineDodgeBtn">DODGE ↓</button>
          </div>

          <!-- Milestone Badge -->
          <div class="milestone-badge" id="inlineMilestone" style="display: none;">
            <span>+100 GAME SCORE</span>
          </div>

          <div class="runner-ready" id="inlineReady">
            <span class="runner-ready-title">READY TO RUN?</span>
            <span class="runner-ready-hint">Jump over crystals. Duck beneath floating cubes.</span>
            <button class="runner-ready-btn" id="inlineStartBtn" type="button">START RUNNING</button>
          </div>

          <!-- Inline Game Over Overlay -->
          <div class="inline-gameover" id="inlineGameOver" style="display: none;">
            <span class="inline-gameover-title">GAME OVER</span>
            <div class="inline-gameover-stats">
              <span>SCORE: <b id="inlineFinalScore">0</b></span>
              <span>BEST: <b id="inlineFinalBest">0</b></span>
            </div>
            <button class="inline-btn-restart" id="inlineRestartBtn">PLAY AGAIN</button>
          </div>
        </div>
      </div>
    `,this.container.querySelector("#inlineMascotPicker").addEventListener("click",n=>{n.stopPropagation(),this.cycleMascot()}),this.container.querySelector("#inlineExpandBtn").addEventListener("click",n=>{n.stopPropagation(),M.launch(this.currentMascot)}),this.container.querySelector("#inlinePauseBtn").addEventListener("click",n=>{n.stopPropagation(),this.togglePause()}),this.container.querySelector("#inlineJumpBtn").addEventListener("pointerdown",n=>{n.stopPropagation(),this.hasStarted||this.startGame(),this.engine.isDead?this.restart():this.engine.jump()});const r=this.container.querySelector("#inlineDodgeBtn");r.addEventListener("pointerdown",n=>{n.stopPropagation(),this.hasStarted||this.startGame(),r.classList.add("is-pressed"),this.engine.dodge(!0)});const l=n=>{n==null||n.stopPropagation(),r.classList.remove("is-pressed"),this.engine.dodge(!1)};r.addEventListener("pointerup",l),r.addEventListener("pointerleave",l),r.addEventListener("pointercancel",l);const a=this.container.querySelector("#inlineStage");a.addEventListener("pointerdown",n=>{if(n.target.closest("button"))return;if(!this.hasStarted){this.startGame();return}if(this.engine.isDead){this.restart();return}const f=a.getBoundingClientRect();(n.clientY-f.top)/f.height>.68?(this.engine.dodge(!0),clearTimeout(this.dodgeTimer),this.dodgeTimer=setTimeout(()=>{var m;return(m=this.engine)==null?void 0:m.dodge(!1)},380)):this.engine.jump()}),this.container.querySelector("#inlineRestartBtn").addEventListener("click",n=>{n.stopPropagation(),this.restart()}),this.container.querySelector("#inlineStartBtn").addEventListener("click",n=>{n.stopPropagation(),this.startGame(),a.focus()}),this.boundKeyDown=n=>{if(!M.getActive()&&!(n.target instanceof Element&&n.target.closest("button, .mascot-card")))if(n.code==="Space"||n.code==="ArrowUp"||n.code==="KeyW"){if(n.preventDefault(),!this.hasStarted){this.startGame();return}this.engine.isDead?this.restart():this.engine.jump()}else(n.code==="ArrowDown"||n.code==="KeyS")&&(n.preventDefault(),this.engine.isDead||this.engine.dodge(!0))},window.addEventListener("keydown",this.boundKeyDown),this.boundKeyUp=n=>{M.getActive()||n.target instanceof Element&&n.target.closest("button, .mascot-card")||this.hasStarted&&(n.code==="ArrowDown"||n.code==="KeyS")&&(n.preventDefault(),this.engine.dodge(!1))},window.addEventListener("keyup",this.boundKeyUp)}initEngine(){var p;clearTimeout(this.gameOverTimer),clearTimeout(this.milestoneTimer),clearTimeout(this.dodgeTimer),this.newBest=!1,this.isPaused=!1,this.engine&&this.engine.destroy(),this.runnerMascot&&this.runnerMascot.destroy();const e=this.container.querySelector("#inlineMascotGroup"),i=this.container.querySelector("#inlineObstaclesGroup"),t=this.container.querySelector("#inlineGroundGroup"),s=this.container.querySelector("#inlineCloudsGroup"),r=this.container.querySelector("#inlineHillsGroup"),l=this.container.querySelector(".inline-runner-svg"),a=this.container.querySelector("#inlineScoreVal"),c=this.container.querySelector("#inlineHiVal"),n=this.container.querySelector("#inlineMilestone"),f=this.container.querySelector("#inlineGameOver"),y=this.container.querySelector("#inlineFinalScore"),m=this.container.querySelector("#inlineFinalBest"),d=this.container.querySelector("#inlineStage");(p=d.querySelector(".world-video-runner"))==null||p.pause(),this.hasStarted=!1,this.container.querySelector("#inlineReady").style.display="flex",this.container.querySelector("#inlinePauseIcon").innerHTML='<polygon points="5 3 19 12 5 21 5 3"></polygon>',e.innerHTML="",this.runnerMascot=new P({id:`inline-${this.currentMascot.id}`,name:this.currentMascot.name,accessories:this.currentMascot.accessories,timingOffset:0,initialEmotion:"idle"});const g=this.runnerMascot.render().querySelector("svg");g.classList.add("runner-mascot-svg"),g.setAttribute("width","180"),g.setAttribute("height","180"),e.appendChild(g),this.engine=new J({character:this.runnerMascot,container:d,sceneSvg:l,mascotGroup:e,obstaclesGroup:i,groundGroup:t,cloudsGroup:s,hillsGroup:r,width:760,height:280,onScoreUpdate:(b,w)=>{a&&(a.textContent=b.toString().padStart(5,"0")),c&&(c.textContent=w.toString().padStart(5,"0"))},onMilestone:b=>{G(d,"Look at us go!"),n&&(n.textContent=`+${b} GAME SCORE`,n.style.display="block",this.milestoneTimer=setTimeout(()=>{n.style.display="none"},1200))},onGameOver:(b,w)=>{var T;(T=d.querySelector(".world-video-runner"))==null||T.pause(),this.newBest||G(d,"Ouch! One more try?"),y&&(y.textContent=b),m&&(m.textContent=w),this.gameOverTimer=setTimeout(()=>{f&&(f.style.display="flex")},650)},onNewBest:()=>{this.newBest=!0,G(d,"A new best!")},onJumpSuccess:()=>{Math.random()<.2&&G(d,"Nice jump!")}}),c&&(c.textContent=this.engine.bestScore.toString().padStart(5,"0")),a&&(a.textContent="00000")}startGame(){var i;if(this.hasStarted)return;this.hasStarted=!0;const e=this.container.querySelector("#inlineStage");this.disposeVideo?(i=e.querySelector(".world-video-runner"))==null||i.play().catch(()=>{}):this.disposeVideo=F(e,"runner",{shouldPlay:()=>{var t;return this.hasStarted&&!this.isPaused&&!((t=this.engine)!=null&&t.isDead)&&!M.getActive()}}),this.container.querySelector("#inlineReady").style.display="none",this.container.querySelector("#inlinePauseIcon").innerHTML='<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',this.engine.start()}updateActiveCardHighlight(){document.querySelectorAll(".mascot-card").forEach(e=>{var t;((t=e.querySelector(".mascot-name"))==null?void 0:t.textContent)===this.currentMascot.name?e.classList.add("is-active-runner"):e.classList.remove("is-active-runner")})}setMascot(e){this.currentMascot=e;const i=this.container.querySelector("#inlineMascotName");i&&(i.textContent=e.name),this.updateActiveCardHighlight(),this.container.querySelector("#inlineGameOver").style.display="none",this.initEngine()}cycleMascot(){const i=(this.characters.findIndex(t=>t.id===this.currentMascot.id)+1)%this.characters.length;this.setMascot(this.characters[i])}togglePause(){var i,t;if(!this.hasStarted){this.startGame();return}if(this.engine.isDead)return;this.isPaused=!this.isPaused;const e=this.container.querySelector("#inlinePauseIcon");this.isPaused?(this.engine.pause(),(i=this.container.querySelector(".world-video-runner"))==null||i.pause(),e&&(e.innerHTML='<polygon points="5 3 19 12 5 21 5 3"></polygon>')):(this.engine.resume(),(t=this.container.querySelector(".world-video-runner"))==null||t.play().catch(()=>{}),e&&(e.innerHTML='<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>'))}restart(){const e=this.container.querySelector("#inlineGameOver");e&&(e.style.display="none"),this.initEngine(),this.startGame()}destroy(){var e,i,t;clearTimeout(this.gameOverTimer),clearTimeout(this.milestoneTimer),clearTimeout(this.dodgeTimer),window.removeEventListener("keydown",this.boundKeyDown),window.removeEventListener("keyup",this.boundKeyUp),(e=this.engine)==null||e.destroy(),(i=this.runnerMascot)==null||i.destroy(),(t=this.disposeVideo)==null||t.call(this),this.container.innerHTML=""}}function Ee({soundUrl:o=null}={}){let e=null;return{play(i){if(this.cancel(),o&&(e=new Audio(o),e.volume=.35,e.play().catch(()=>{})),"speechSynthesis"in window){const t=new SpeechSynthesisUtterance(i);t.volume=.45,t.rate=1.1,speechSynthesis.speak(t)}},cancel(){e==null||e.pause(),e=null,"speechSynthesis"in window&&speechSynthesis.cancel()}}}function Ge(o,e,i,t=45e3){return!o&&i-e>=t}class Te{constructor(e,i=Ee()){this.characters=e,this.active=null,this.timer=null,this.idleTimer=null,this.lastLine=new Map,this.lastShown=new Map,this.soundEnabled=!1,this.audioAdapter=i,this.scheduleIdle()}setSoundEnabled(e){this.soundEnabled=e,e||this.audioAdapter.cancel()}show(e,i="react",t=null,s=!1){if(!(e!=null&&e.container)||document.hidden)return!1;const r=Date.now();if(s&&!Ge(this.active,this.lastShown.get(e.id)||0,r))return!1;this.clear();const l=t||K(e.id,i,this.lastLine.get(e.id));this.lastLine.set(e.id,l),this.lastShown.set(e.id,r);const a=document.createElement("span");a.className="mascot-speech-bubble",a.textContent=l,a.setAttribute("role","status"),e.container.appendChild(a),this.active=a;const c=a.getBoundingClientRect();return c.left<8&&(a.style.transform=`translateX(${8-c.left}px)`),c.right>innerWidth-8&&(a.style.transform=`translateX(${innerWidth-8-c.right}px)`),this.timer=setTimeout(()=>this.clear(),2800),this.soundEnabled&&!s&&this.audioAdapter.play(l),!0}clear(){var e;clearTimeout(this.timer),(e=this.active)==null||e.remove(),this.active=null,this.audioAdapter.cancel()}scheduleIdle(){this.idleTimer=setTimeout(()=>{if(!document.hidden&&!document.querySelector(".game-overlay-visible")&&!this.active&&this.characters.length){const e=this.characters[Math.floor(Math.random()*this.characters.length)];this.show(e,"idle",null,!0)}this.scheduleIdle()},12e3+Math.random()*8e3)}destroy(){clearTimeout(this.idleTimer),this.clear()}}function Le(o){const e=document.createElement("div");e.className="ambient-world",e.setAttribute("aria-hidden","true"),e.innerHTML=`
    <div class="ambient-moon-glow"></div>
    <div class="ambient-cloud ambient-cloud-one"></div>
    <div class="ambient-cloud ambient-cloud-two"></div>
    <svg class="ambient-branch ambient-branch-left" viewBox="0 0 320 190" aria-hidden="true">
      <path d="M-20 8 C75 15 77 55 151 63 S231 103 285 167 M55 21 C86 70 107 78 141 80 M138 60 C173 22 211 22 246 12" fill="none" stroke="#65405b" stroke-width="8" stroke-linecap="round" />
      <g fill="#f9b9d9" opacity=".8"><circle cx="76" cy="28" r="9"/><circle cx="113" cy="54" r="8"/><circle cx="148" cy="62" r="11"/><circle cx="193" cy="82" r="8"/><circle cx="241" cy="122" r="9"/><circle cx="95" cy="66" r="7"/><circle cx="211" cy="20" r="8"/></g>
    </svg>
    <svg class="ambient-branch ambient-branch-right" viewBox="0 0 320 190" aria-hidden="true">
      <path d="M-20 8 C75 15 77 55 151 63 S231 103 285 167 M55 21 C86 70 107 78 141 80 M138 60 C173 22 211 22 246 12" fill="none" stroke="#65405b" stroke-width="8" stroke-linecap="round" />
      <g fill="#f9b9d9" opacity=".8"><circle cx="76" cy="28" r="9"/><circle cx="113" cy="54" r="8"/><circle cx="148" cy="62" r="11"/><circle cx="193" cy="82" r="8"/><circle cx="241" cy="122" r="9"/><circle cx="95" cy="66" r="7"/><circle cx="211" cy="20" r="8"/></g>
    </svg>`;const i=matchMedia("(max-width: 600px)").matches?12:25;for(let l=0;l<i;l++){const a=document.createElement("i");a.className=l%3===0?"ambient-petal":"ambient-star",a.style.setProperty("--x",`${l*37.1%100}%`),a.style.setProperty("--y",`${l*23.7%90}%`),a.style.setProperty("--delay",`${-(l*1.37)%16}s`),a.style.setProperty("--duration",`${10+l*7%11}s`),e.appendChild(a)}o.prepend(e);let t=0;const s=l=>{matchMedia("(prefers-reduced-motion: reduce)").matches||(cancelAnimationFrame(t),t=requestAnimationFrame(()=>{const a=(l.clientX/innerWidth-.5)*12,c=(l.clientY/innerHeight-.5)*8;o.style.setProperty("--far-x",`${(a*.15).toFixed(1)}px`),o.style.setProperty("--far-y",`${(c*.15).toFixed(1)}px`),o.style.setProperty("--mid-x",`${(a*.45).toFixed(1)}px`),o.style.setProperty("--mid-y",`${(c*.45).toFixed(1)}px`),o.style.setProperty("--near-x",`${a.toFixed(1)}px`),o.style.setProperty("--near-y",`${c.toFixed(1)}px`)}))},r=()=>{["--far-x","--far-y","--mid-x","--mid-y","--near-x","--near-y"].forEach(l=>o.style.setProperty(l,"0px"))};return window.addEventListener("pointermove",s,{passive:!0}),window.addEventListener("pointerleave",r),()=>{window.removeEventListener("pointermove",s),window.removeEventListener("pointerleave",r),cancelAnimationFrame(t),e.remove()}}const Ce=[{id:"lfm3-17b",name:"LFM3-1.7B",accessories:[],timingOffset:0,initialEmotion:"idle"},{id:"lfm3-vl-2b",name:"LFM3-VL-2B",accessories:["glasses"],timingOffset:1200,initialEmotion:"idle"},{id:"lfm3-audio-2b",name:"LFM3-Audio-2B",accessories:["headphones"],timingOffset:2400,initialEmotion:"idle"},{id:"lfm3-omni-2b",name:"LFM3-Omni-2B",accessories:["glasses","headphones"],timingOffset:3600,initialEmotion:"idle"},{id:"d1-2b",name:"d1-2B",accessories:["monocle","prism"],timingOffset:4800,initialEmotion:"idle"},{id:"d1-omni-2b",name:"d1-Omni-2B",accessories:["hat","magnifier"],timingOffset:6e3,initialEmotion:"idle"}];let k=null,S=null;function Ae(o,e){let i=null,t=0,s=null,r=0;function l(){S==null||S.show(e,"launch"),k&&k.setMascot(e),e.setEmotion("happy"),M.launch(e),setTimeout(()=>{e.setEmotion("idle")},1200)}o.addEventListener("click",a=>{i?(clearTimeout(i),i=null,l()):i=setTimeout(()=>{i=null,e.triggerRandomReaction(),S==null||S.show(e,"react")},420)}),o.addEventListener("touchend",a=>{const c=Date.now(),n=c-t;n>0&&n<420?(a.preventDefault(),i&&(clearTimeout(i),i=null),t=0,l()):t=c},{passive:!1}),o.addEventListener("pointerenter",a=>{a.pointerType==="touch"||Date.now()-r<12e3||(s=setTimeout(()=>{!e.isReacting&&!M.getActive()&&(e.showEmotionFor("curious",1e3),r=Date.now())},450))}),o.addEventListener("pointerleave",()=>{clearTimeout(s),e.resetEyes()}),o.addEventListener("keydown",a=>{a.key==="Enter"?(a.preventDefault(),l()):a.key===" "&&(a.preventDefault(),e.triggerRandomReaction(),S==null||S.show(e,"react"))})}function Z(){const o=document.getElementById("mascotGrid");if(!o)return;const e=new URLSearchParams(window.location.search),i=e.get("emotion"),t=e.get("game"),s=[],r=document.querySelector(".mascot-gallery-container");r&&(F(r,"gallery"),Le(r)),Ce.forEach(d=>{const u=new P(d),g=u.render();Ae(g,u),o.appendChild(g),i&&E[i]?u.setEmotion(i):u.start(),s.push(u),t===d.id&&setTimeout(()=>{M.launch(u)},100)}),S=new Te(s);const l=document.getElementById("soundToggle");l==null||l.addEventListener("click",()=>{const d=l.getAttribute("aria-pressed")!=="true";l.setAttribute("aria-pressed",String(d)),l.textContent=d?"Voice on":"Voice off",S.setSoundEnabled(d)});const a=document.getElementById("emotionsPanel");a&&Se(a,s);const c=document.getElementById("runnerPanel");c&&(k=new Me(c,s,1));let n=0,f=null;window.addEventListener("pointermove",d=>{M.getActive()||document.hidden||(f={x:d.clientX,y:d.clientY},!n&&(n=requestAnimationFrame(()=>{n=0,s.forEach(u=>u.handlePointerMove(f.x,f.y))})))},{passive:!0}),window.addEventListener("pointerleave",()=>{cancelAnimationFrame(n),n=0,s.forEach(d=>d.resetEyes())}),window.addEventListener("pointerdown",d=>{d.pointerType!=="mouse"&&(s.forEach(u=>u.handlePointerMove(d.clientX,d.clientY)),setTimeout(()=>s.forEach(u=>u.resetEyes()),1200))},{passive:!0});let y=!1;document.addEventListener("prism:game-open",()=>{var d,u;y=!!(k!=null&&k.hasStarted&&!k.isPaused&&!((d=k.engine)!=null&&d.isDead)),(u=k==null?void 0:k.engine)==null||u.pause()}),document.addEventListener("prism:game-close",()=>{var d;y&&((d=k==null?void 0:k.engine)==null||d.resume()),y=!1});const m=()=>{const d=document.hidden||!!M.getActive();s.forEach(u=>{d||i&&E[i]?u.pause():u.resume(),!d&&i&&E[i]&&u.setEmotion(i)}),d&&S.clear()};document.addEventListener("visibilitychange",m),document.addEventListener("prism:game-open",m),document.addEventListener("prism:game-close",m),window.__prismMascots=s,window.__prismGameController=M,window.__prismInlineRunner=k}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Z):Z();
