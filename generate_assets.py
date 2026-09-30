"""Generate beautiful self-contained SVG graphics matching the exact reference imagery."""
import os

assets_dir = "/home/code/work/morgad/assets/images"
os.makedirs(assets_dir, exist_ok=True)

svgs = {}

# 1. Cyberpunk Neon Tunnel (Viral Visual Pack Vol. 01)
svgs["cyberpunk-tunnel.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#090514"/>
      <stop offset="50%" stop-color="#19072e"/>
      <stop offset="100%" stop-color="#06020c"/>
    </linearGradient>
    <linearGradient id="neonPink" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff007f"/>
      <stop offset="100%" stop-color="#ff00bb"/>
    </linearGradient>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#7000ff"/>
    </linearGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff00a0" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#7000ff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  
  <!-- Perspective Floor & Grid -->
  <g opacity="0.6">
    <line x1="400" y1="300" x2="-200" y2="650" stroke="#00f0ff" stroke-width="2"/>
    <line x1="400" y1="300" x2="0" y2="650" stroke="#00f0ff" stroke-width="2"/>
    <line x1="400" y1="300" x2="200" y2="650" stroke="#00f0ff" stroke-width="2"/>
    <line x1="400" y1="300" x2="400" y2="650" stroke="#00f0ff" stroke-width="3"/>
    <line x1="400" y1="300" x2="600" y2="650" stroke="#00f0ff" stroke-width="2"/>
    <line x1="400" y1="300" x2="800" y2="650" stroke="#00f0ff" stroke-width="2"/>
    <line x1="400" y1="300" x2="1000" y2="650" stroke="#00f0ff" stroke-width="2"/>
    
    <!-- Transverse Floor Lines -->
    <line x1="280" y1="370" x2="520" y2="370" stroke="#ff00aa" stroke-width="1.5" opacity="0.4"/>
    <line x1="220" y1="420" x2="580" y2="420" stroke="#ff00aa" stroke-width="2" opacity="0.6"/>
    <line x1="140" y1="480" x2="660" y2="480" stroke="#ff00aa" stroke-width="2.5" opacity="0.8"/>
    <line x1="40" y1="550" x2="760" y2="550" stroke="#ff00aa" stroke-width="3"/>
  </g>

  <!-- Perspective Tunnel Portals -->
  <rect x="350" y="250" width="100" height="100" fill="none" stroke="#00f0ff" stroke-width="2" filter="url(#glow)"/>
  <rect x="290" y="190" width="220" height="220" fill="none" stroke="#ff00aa" stroke-width="3" filter="url(#glow)"/>
  <rect x="210" y="110" width="380" height="380" fill="none" stroke="#7928ca" stroke-width="4" filter="url(#glow)"/>
  <rect x="110" y="20" width="580" height="560" fill="none" stroke="#00f0ff" stroke-width="5" filter="url(#glow)"/>

  <!-- Center Portal Glow -->
  <circle cx="400" cy="300" r="140" fill="url(#centerGlow)"/>
  
  <!-- Wet floor reflections -->
  <rect x="0" y="450" width="800" height="150" fill="url(#neonCyan)" opacity="0.15" style="mix-blend-mode: screen;"/>
  <rect x="0" y="520" width="800" height="80" fill="url(#neonPink)" opacity="0.2" style="mix-blend-mode: screen;"/>
</svg>"""

# 2. Pastel Minimalist Archway (Premium Aesthetic Collection)
svgs["pink-archway.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="wallBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7e2"/>
      <stop offset="50%" stop-color="#fbb6ce"/>
      <stop offset="100%" stop-color="#f687b3"/>
    </linearGradient>
    <linearGradient id="innerSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff5f7"/>
      <stop offset="100%" stop-color="#fed7e2"/>
    </linearGradient>
    <linearGradient id="podium" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f7fafc"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx="60%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fed7aa" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="15" dy="25" stdDeviation="20" flood-color="#702459" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Background Wall -->
  <rect width="800" height="600" fill="url(#wallBg)"/>
  
  <!-- Floor Shadow -->
  <polygon points="0,480 800,480 800,600 0,600" fill="#e287a4" opacity="0.5"/>

  <!-- Grand Central Arch -->
  <g filter="url(#softShadow)">
    <path d="M 260,500 L 260,260 A 140,140 0 0,1 540,260 L 540,500 Z" fill="url(#innerSky)"/>
  </g>

  <!-- Sunlight coming through arch -->
  <circle cx="480" cy="220" r="160" fill="url(#sunGlow)"/>

  <!-- Minimalist Stepped Pedestals -->
  <ellipse cx="400" cy="460" rx="140" ry="25" fill="#fbb6ce" opacity="0.6"/>
  <rect x="300" y="380" width="200" height="70" rx="8" fill="url(#podium)" filter="url(#softShadow)"/>
  <rect x="330" y="340" width="140" height="40" rx="6" fill="#ffffff"/>

  <!-- Elegant Tropical Monstera/Palm Leaf Plant on the side -->
  <g transform="translate(560, 360)">
    <path d="M 20,120 Q 10,60 -20,20 Q 10,35 20,120" fill="#2d6a4f"/>
    <path d="M 20,120 Q 30,50 60,10 Q 40,40 20,120" fill="#40916c"/>
    <path d="M 20,120 Q -10,80 -50,60 Q -20,85 20,120" fill="#1b4332"/>
    <ellipse cx="20" cy="120" rx="15" ry="5" fill="#74c69d" opacity="0.4"/>
    <!-- Terracotta / White Ceramic Pot -->
    <polygon points="5,115 35,115 30,150 10,150" fill="#ffffff"/>
    <ellipse cx="20" cy="115" rx="15" ry="4" fill="#f8fafc"/>
  </g>
</svg>"""

# 3. Vibrant Fluid Swirl (Creative Image Bundle)
svgs["fluid-swirl.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="swirlGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f"/>
      <stop offset="35%" stop-color="#7928ca"/>
      <stop offset="70%" stop-color="#0070f3"/>
      <stop offset="100%" stop-color="#00dfd8"/>
    </linearGradient>
    <linearGradient id="swirlGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff7b00"/>
      <stop offset="40%" stop-color="#ff007f"/>
      <stop offset="80%" stop-color="#7928ca"/>
      <stop offset="100%" stop-color="#00f0ff"/>
    </linearGradient>
    <filter id="blurLayer" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="800" height="600" fill="#08071a"/>

  <!-- Vibrant Background Swirls -->
  <circle cx="250" cy="200" r="280" fill="url(#swirlGrad2)" filter="url(#blurLayer)" opacity="0.75"/>
  <circle cx="600" cy="400" r="300" fill="url(#swirlGrad1)" filter="url(#blurLayer)" opacity="0.8"/>

  <!-- Fluid Ribbons -->
  <path d="M -50,400 C 150,100 400,600 600,250 C 750,50 850,300 850,300 C 750,450 550,650 300,500 C 100,380 -50,550 -50,400 Z" fill="url(#swirlGrad1)" opacity="0.85"/>
  
  <path d="M 50,150 C 250,-50 500,450 750,180 C 850,300 650,550 450,480 C 250,420 -50,300 50,150 Z" fill="url(#swirlGrad2)" opacity="0.8"/>

  <!-- Glossy Highlights -->
  <path d="M 120,240 C 300,80 520,380 720,220" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.3" filter="url(#blurLayer)"/>
  <path d="M 180,260 C 320,120 500,360 680,240" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
</svg>"""

# 4. Serene Alpine Lake (Social Media Image Pack)
svgs["mountain-lake.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4a709c"/>
      <stop offset="50%" stop-color="#9bb8d7"/>
      <stop offset="100%" stop-color="#e2ecf7"/>
    </linearGradient>
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1b4d6b"/>
      <stop offset="50%" stop-color="#0f344d"/>
      <stop offset="100%" stop-color="#071b29"/>
    </linearGradient>
  </defs>
  <!-- Sky -->
  <rect width="800" height="350" fill="url(#skyGrad)"/>

  <!-- Distant Jagged Mountains -->
  <polygon points="-50,350 80,160 220,280 340,110 460,250 620,90 760,260 850,170 850,350" fill="#506680"/>
  <!-- Mountain Snow Highlights -->
  <polygon points="340,110 320,145 355,145" fill="#f0f6fc"/>
  <polygon points="620,90 595,135 640,135" fill="#f0f6fc"/>
  <polygon points="80,160 65,190 95,190" fill="#e2edf8"/>

  <!-- Midground Pine Hills -->
  <polygon points="-50,370 120,240 280,360 450,230 650,360 850,220 850,400 -50,400" fill="#1f382b"/>

  <!-- Deep Turquoise Alpine Water -->
  <rect y="350" width="800" height="250" fill="url(#waterGrad)"/>

  <!-- Mountain Reflections in Water -->
  <polygon points="-50,350 80,480 220,400 340,510 460,410 620,530 760,420 850,480 850,350" fill="#234e62" opacity="0.5"/>

  <!-- Wooden Rowboat at Lower Center -->
  <g transform="translate(370, 460)">
    <!-- Boat shadow -->
    <ellipse cx="30" cy="35" rx="55" ry="12" fill="#030c14" opacity="0.6"/>
    <!-- Wooden Hull -->
    <path d="M -20,25 C 0,5 60,5 80,25 C 60,45 0,45 -20,25 Z" fill="#8c4820"/>
    <path d="M -15,25 C 3,9 57,9 75,25 C 57,41 3,41 -15,25 Z" fill="#a85d2c"/>
    <rect x="25" y="10" width="6" height="30" fill="#42220f" rx="1"/>
    <!-- Oar -->
    <line x1="15" y1="2" x2="40" y2="45" stroke="#f6ad55" stroke-width="3"/>
  </g>
</svg>"""

# 5. Category Tiles (Viral, Photos, Wallpapers, Creative, Trending)
svgs["category-viral.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <radialGradient id="neonVibe" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="60%" stop-color="#3b0764"/>
      <stop offset="100%" stop-color="#090114"/>
    </radialGradient>
  </defs>
  <rect width="600" height="450" fill="url(#neonVibe)"/>
  <!-- Silhouette Figure -->
  <path d="M 300,160 Q 340,160 340,210 Q 340,250 300,250 Q 260,250 260,210 Q 260,160 300,160 Z" fill="#120422"/>
  <path d="M 230,340 C 230,265 260,250 300,250 C 340,250 370,265 370,340 Z" fill="#120422"/>
  <!-- Neon Rim Light -->
  <path d="M 260,210 Q 260,160 300,160" stroke="#d946ef" stroke-width="4" fill="none" opacity="0.9"/>
  <path d="M 230,340 C 230,265 260,250 300,250" stroke="#06b6d4" stroke-width="4" fill="none" opacity="0.8"/>
  <rect width="600" height="450" fill="black" opacity="0.3"/>
</svg>"""

svgs["category-photos.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="50%" stop-color="#db2777"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="url(#sunsetGrad)"/>
  <!-- Silhouette Mountain & Lake -->
  <polygon points="0,320 150,210 320,300 460,180 600,280 600,450 0,450" fill="#0f172a"/>
  <!-- Sunset Sun -->
  <circle cx="300" cy="200" r="60" fill="#fef08a" opacity="0.9"/>
  <rect width="600" height="450" fill="black" opacity="0.25"/>
</svg>"""

svgs["category-wallpapers.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="#030712"/>
  <!-- Flow waves -->
  <path d="M 0,200 C 150,100 250,350 400,200 C 550,50 500,400 600,250 L 600,450 L 0,450 Z" fill="url(#waveGrad)" opacity="0.85"/>
  <path d="M 0,320 C 200,220 300,420 600,180 L 600,450 L 0,450 Z" fill="#a855f7" opacity="0.6"/>
  <rect width="600" height="450" fill="black" opacity="0.2"/>
</svg>"""

svgs["category-creative.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="40%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>
  </defs>
  <rect width="600" height="450" fill="#030712"/>
  <circle cx="300" cy="225" r="220" fill="url(#nebulaGrad)" opacity="0.9"/>
  <!-- Stardust lines -->
  <path d="M 100,350 Q 300,100 500,200" stroke="#38bdf8" stroke-width="5" fill="none" opacity="0.8"/>
  <path d="M 150,100 Q 300,380 480,120" stroke="#f472b6" stroke-width="4" fill="none" opacity="0.7"/>
  <rect width="600" height="450" fill="black" opacity="0.25"/>
</svg>"""

svgs["category-trending.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#450a0a"/>
      <stop offset="40%" stop-color="#b91c1c"/>
      <stop offset="70%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="#180505"/>
  <circle cx="300" cy="220" r="180" fill="url(#fireGrad)" opacity="0.8"/>
  <path d="M 220,380 C 260,250 280,180 300,120 C 320,180 340,250 380,380 Z" fill="#facc15" opacity="0.7"/>
  <rect width="600" height="450" fill="black" opacity="0.3"/>
</svg>"""

# 6. Featured Banner Cards
svgs["featured-city.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="100%" height="100%">
  <defs>
    <linearGradient id="citySky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#090514"/>
      <stop offset="60%" stop-color="#2a0845"/>
      <stop offset="100%" stop-color="#6441a5"/>
    </linearGradient>
  </defs>
  <rect width="500" height="650" fill="url(#citySky)"/>
  <!-- Skyscrapers -->
  <rect x="40" y="220" width="90" height="430" fill="#110926"/>
  <rect x="150" y="140" width="110" height="510" fill="#190e38"/>
  <rect x="280" y="200" width="85" height="450" fill="#0d061f"/>
  <rect x="380" y="270" width="90" height="380" fill="#160c33"/>
  <!-- Glowing neon building windows -->
  <g fill="#00f0ff" opacity="0.8">
    <rect x="170" y="180" width="8" height="12"/>
    <rect x="190" y="180" width="8" height="12"/>
    <rect x="210" y="180" width="8" height="12"/>
    <rect x="170" y="210" width="8" height="12"/>
    <rect x="210" y="210" width="8" height="12"/>
    <rect x="190" y="240" width="8" height="12"/>
    <rect x="60" y="260" width="6" height="10"/>
    <rect x="80" y="260" width="6" height="10"/>
    <rect x="300" y="240" width="8" height="12"/>
    <rect x="320" y="240" width="8" height="12"/>
  </g>
  <g fill="#ff007f" opacity="0.8">
    <rect x="170" y="270" width="8" height="12"/>
    <rect x="190" y="300" width="8" height="12"/>
    <rect x="230" y="270" width="8" height="12"/>
    <rect x="400" y="310" width="7" height="10"/>
    <rect x="420" y="310" width="7" height="10"/>
  </g>
  <polygon points="205,140 100,0 220,0" fill="#ff00a0" opacity="0.15"/>
</svg>"""

svgs["featured-runner.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="100%" height="100%">
  <defs>
    <linearGradient id="goldenSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="50%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
  </defs>
  <rect width="500" height="650" fill="url(#goldenSky)"/>
  <circle cx="280" cy="380" r="140" fill="#fef08a" opacity="0.9"/>
  <path d="M 460,650 Q 430,480 470,380 Q 400,280 430,200 Q 360,260 370,360 Q 320,330 380,450 Q 380,550 440,650 Z" fill="#1c0e05"/>
  <path d="M 0,540 Q 200,490 500,560 L 500,650 L 0,650 Z" fill="#271309"/>
  <!-- Runner Silhouette -->
  <g transform="translate(230, 440)">
    <circle cx="20" cy="15" r="10" fill="#1c0e05"/>
    <path d="M 18,25 L 24,55 L 10,85" stroke="#1c0e05" stroke-width="7" stroke-linecap="round"/>
    <path d="M 24,55 L 38,80" stroke="#1c0e05" stroke-width="7" stroke-linecap="round"/>
    <path d="M 12,35 L 32,45 L 42,32" stroke="#1c0e05" stroke-width="5" stroke-linecap="round"/>
    <path d="M 18,35 L -2,45" stroke="#1c0e05" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>"""

svgs["featured-valley.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="100%" height="100%">
  <defs>
    <linearGradient id="valleySky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
  </defs>
  <rect width="500" height="650" fill="url(#valleySky)"/>
  <polygon points="0,420 180,240 320,360 500,200 500,650 0,650" fill="#334155"/>
  <polygon points="0,500 120,380 260,460 420,340 500,430 500,650 0,650" fill="#1e293b"/>
  <polygon points="0,570 200,480 380,560 500,490 500,650 0,650" fill="#0f172a"/>
  <rect y="420" width="500" height="80" fill="#f8fafc" opacity="0.25"/>
</svg>"""

# 7. Articles / From The Hub
svgs["article-lens.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420" width="100%" height="100%">
  <defs>
    <radialGradient id="lensRing" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="35%" stop-color="#0f172a"/>
      <stop offset="65%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#a855f7" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="700" height="420" fill="#090d16"/>
  <rect x="100" y="60" width="500" height="300" rx="40" fill="#1e293b"/>
  <circle cx="350" cy="210" r="160" fill="#0f172a" stroke="#475569" stroke-width="8"/>
  <circle cx="350" cy="210" r="130" fill="url(#lensRing)"/>
  <circle cx="350" cy="210" r="90" fill="#030712" stroke="#0284c7" stroke-width="3"/>
  <polygon points="350,150 390,190 350,230 310,190" fill="#082f49" opacity="0.8"/>
  <ellipse cx="320" cy="180" rx="70" ry="40" fill="url(#glassGlare)" transform="rotate(-30, 320, 180)"/>
</svg>"""

svgs["article-desk.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420" width="100%" height="100%">
  <defs>
    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="700" height="420" fill="#0f172a"/>
  <circle cx="350" cy="170" r="220" fill="#6366f1" opacity="0.25"/>
  <rect x="180" y="80" width="340" height="190" rx="8" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <rect x="190" y="90" width="320" height="170" rx="4" fill="url(#screenGrad)"/>
  <rect x="335" y="270" width="30" height="50" fill="#475569"/>
  <polygon points="300,320 400,320 380,325 320,325" fill="#64748b"/>
  <rect x="0" y="320" width="700" height="100" fill="#182234"/>
  <rect x="0" y="320" width="700" height="4" fill="#38bdf8" opacity="0.4"/>
  <rect x="270" y="340" width="160" height="30" rx="4" fill="#334155"/>
  <rect x="460" y="345" width="22" height="30" rx="10" fill="#475569"/>
  <rect x="100" y="140" width="60" height="140" rx="6" fill="#1e293b"/>
  <circle cx="130" cy="180" r="18" fill="#334155"/>
  <circle cx="130" cy="235" r="22" fill="#0284c7" opacity="0.8"/>
  <rect x="540" y="140" width="60" height="140" rx="6" fill="#1e293b"/>
  <circle cx="570" cy="180" r="18" fill="#334155"/>
  <circle cx="570" cy="235" r="22" fill="#0284c7" opacity="0.8"/>
</svg>"""

svgs["article-peaks.svg"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420" width="100%" height="100%">
  <defs>
    <linearGradient id="goldenMtnSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
  <rect width="700" height="420" fill="url(#goldenMtnSky)"/>
  <polygon points="0,420 120,200 240,320 380,140 520,280 650,170 700,230 700,420" fill="#475569"/>
  <polygon points="380,140 350,190 410,190" fill="#ffffff"/>
  <polygon points="120,200 95,240 145,240" fill="#f8fafc"/>
  <polygon points="650,170 630,205 670,205" fill="#f8fafc"/>
  <polygon points="0,420 180,310 360,400 560,290 700,380 700,420" fill="#1e293b"/>
</svg>"""

# Save all SVGs
for filename, content in svgs.items():
    filepath = os.path.join(assets_dir, filename)
    with open(filepath, "w") as f:
        f.write(content.strip())
    print(f"Generated {filepath}")

print(f"Successfully generated {len(svgs)} SVG visual assets.")
