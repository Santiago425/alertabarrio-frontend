/** Ilustracion de la ciudad: volcan, edificios y alertas sobre el mapa. */
export function CityArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 340" className={`city-art ${className}`} role="img" aria-label="Ilustración de la ciudad con alertas">
      <g className="art-sun">
        <circle cx="470" cy="70" r="34" fill="#fff" opacity=".9" />
        <circle cx="470" cy="70" r="52" fill="#fff" opacity=".15" />
      </g>
      <g className="art-cloud a" fill="#fff" opacity=".7">
        <ellipse cx="120" cy="64" rx="38" ry="13" />
        <ellipse cx="148" cy="56" rx="26" ry="14" />
      </g>
      <g className="art-cloud b" fill="#fff" opacity=".5">
        <ellipse cx="350" cy="40" rx="30" ry="10" />
        <ellipse cx="372" cy="34" rx="20" ry="11" />
      </g>

      <path d="M0 230 C90 200 150 214 220 196 C300 176 380 200 460 186 C520 176 570 190 600 184 V340 H0Z" fill="#fff" opacity=".14" />
      <path d="M150 238 L270 118 Q282 106 296 112 L312 120 Q324 110 338 118 L470 238Z" fill="#fff" opacity=".28" />
      <path d="M262 126 L270 118 Q282 106 296 112 L312 120 Q324 110 338 118 L350 130 Q330 140 312 132 Q292 144 262 126Z" fill="#fff" opacity=".85" />
      <g className="art-smoke" fill="#fff">
        <circle cx="300" cy="96" r="8" opacity=".55" />
        <circle cx="310" cy="80" r="11" opacity=".4" />
        <circle cx="296" cy="62" r="14" opacity=".28" />
      </g>

      <g fill="#fff" opacity=".9">
        <rect x="40" y="236" width="44" height="64" rx="4" />
        <rect x="92" y="214" width="34" height="86" rx="4" />
        <rect x="134" y="246" width="52" height="54" rx="4" />
        <rect x="400" y="226" width="40" height="74" rx="4" />
        <rect x="448" y="206" width="36" height="94" rx="4" />
        <rect x="492" y="240" width="56" height="60" rx="4" />
        <rect x="556" y="222" width="34" height="78" rx="4" />
      </g>
      <g fill="#c79a2c" opacity=".55">
        <rect x="50" y="248" width="8" height="8" rx="2" />
        <rect x="66" y="248" width="8" height="8" rx="2" />
        <rect x="50" y="266" width="8" height="8" rx="2" />
        <rect x="102" y="226" width="6" height="8" rx="2" />
        <rect x="112" y="226" width="6" height="8" rx="2" />
        <rect x="102" y="244" width="6" height="8" rx="2" />
        <rect x="112" y="262" width="6" height="8" rx="2" />
        <rect x="410" y="240" width="8" height="8" rx="2" />
        <rect x="424" y="258" width="8" height="8" rx="2" />
        <rect x="458" y="220" width="6" height="8" rx="2" />
        <rect x="470" y="238" width="6" height="8" rx="2" />
        <rect x="504" y="254" width="10" height="8" rx="2" />
        <rect x="524" y="254" width="10" height="8" rx="2" />
        <rect x="566" y="236" width="6" height="8" rx="2" />
      </g>

      <g fill="#fff">
        <rect x="236" y="214" width="128" height="86" rx="4" />
        <rect x="242" y="168" width="26" height="60" rx="3" />
        <rect x="332" y="168" width="26" height="60" rx="3" />
        <path d="M242 168 L255 146 L268 168Z" />
        <path d="M332 168 L345 146 L358 168Z" />
        <path d="M276 214 Q300 170 324 214Z" />
      </g>
      <g fill="#b5452b" opacity=".5">
        <path d="M288 300 V262 Q300 246 312 262 V300Z" />
        <circle cx="300" cy="232" r="7" />
        <rect x="250" y="186" width="10" height="14" rx="5" />
        <rect x="340" y="186" width="10" height="14" rx="5" />
      </g>

      <rect x="0" y="298" width="600" height="42" fill="#fff" opacity=".22" />
      <path className="art-route" d="M70 318 C160 296 220 330 300 312 C380 294 450 328 540 308" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />

      <g className="art-pin a">
        <path d="M110 214c-12 0-22 9.6-22 21.5 0 14.8 18.3 30.6 20.4 32.4a2.5 2.5 0 0 0 3.2 0c2.1-1.8 20.4-17.6 20.4-32.4 0-11.9-10-21.5-22-21.5Z" fill="#b5452b" />
        <circle cx="110" cy="235" r="8" fill="#fff" />
      </g>
      <g className="art-pin b">
        <path d="M466 176c-12 0-22 9.6-22 21.5 0 14.8 18.3 30.6 20.4 32.4a2.5 2.5 0 0 0 3.2 0c2.1-1.8 20.4-17.6 20.4-32.4 0-11.9-10-21.5-22-21.5Z" fill="#c79a2c" />
        <circle cx="466" cy="197" r="8" fill="#fff" />
      </g>
      <g className="art-pin c">
        <circle cx="300" cy="130" r="26" fill="#fff" />
        <path d="M300 114l-11 4v8c0 7 4.7 12.8 11 14.8 6.3-2 11-7.8 11-14.8v-8Z" fill="#1f5f4a" />
        <path d="M295 127l4 4 7-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Escudo con visto bueno para estados vacios y confirmaciones. */
export function ShieldArt({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="shield-art" aria-hidden="true">
      <defs>
        <linearGradient id="shieldArtGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#133d30" />
          <stop offset=".55" stopColor="#1f5f4a" />
          <stop offset="1" stopColor="#2c7458" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#1f5f4a" opacity=".08" />
      <circle cx="60" cy="60" r="42" fill="#1f5f4a" opacity=".1" />
      <path d="M60 26 36 35v18c0 15.4 10.2 28.4 24 32.6 13.8-4.2 24-17.2 24-32.6V35Z" fill="url(#shieldArtGrad)" />
      <path d="M48 56l8.5 8.5L73 48" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Estado vacio con ilustracion pequena. */
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ShieldArt size={84} />
      <p>{text}</p>
    </div>
  );
}
