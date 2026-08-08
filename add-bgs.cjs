const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/ConsistencyTab.tsx', 'utf8');

// 1. Add bgStyle state
if (!content.includes('bgStyle')) {
    content = content.replace(
        'const [filterOpen, setFilterOpen] = useState(false);',
        'const [filterOpen, setFilterOpen] = useState(false);\n  const [bgStyle, setBgStyle] = useState<"abstract" | "vector" | "photo">("photo");'
    );
}

// 2. Add backgrounds
const returnStart = 'return (';
const replaceReturn = `return (
    <div className="animate-tab-fade pt-12 pb-24 relative min-h-screen">
      {/* Backgrounds */}
      {bgStyle === "abstract" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] z-0">
          <div className="absolute bottom-0 left-0 w-full h-[60%] bg-ink" style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />
          <div className="absolute bottom-0 left-[-20%] w-[80%] h-[40%] bg-ink" style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />
          <div className="absolute bottom-0 right-[-20%] w-[80%] h-[50%] bg-ink opacity-50" style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />
        </div>
      )}

      {bgStyle === "vector" && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-end justify-center overflow-hidden z-0">
          <svg viewBox="0 0 1440 320" className="w-[150%] min-w-[800px] h-auto fill-current text-ink">
            <path d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,213.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            <path d="M0,160L60,170.7C120,181,240,203,360,186.7C480,171,600,117,720,128C840,139,960,213,1080,245.3C1200,277,1320,267,1380,261.3L1440,256L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" fillOpacity="0.5"></path>
          </svg>
        </div>
      )}

      {bgStyle === "photo" && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" 
            alt="" 
            className="w-full h-[70vh] object-cover opacity-20 grayscale" 
            style={{ maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)" }}
          />
        </div>
      )}

      <section className="px-5 relative z-10">`;

if (content.includes(returnStart) && !content.includes('bgStyle === "abstract"')) {
    content = content.replace(`return (\n    <div className="animate-tab-fade pt-12 pb-24">\n      <section className="px-5">`, replaceReturn);
}

// 3. Add toggle at bottom
const endMarker = `      </section>\n    </div>`;
const replaceEnd = `      </section>

      {/* Toggle */}
      <div className="fixed bottom-24 left-0 w-full flex justify-center z-50 pointer-events-none">
        <div className="bg-canvas border border-[color:var(--hairline)] rounded-full flex gap-1 p-1 shadow-lg pointer-events-auto">
           <button onClick={() => setBgStyle("abstract")} className={\`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full \${bgStyle === 'abstract' ? 'bg-ink text-canvas' : 'text-body hover:text-ink'}\`}>Abstract</button>
           <button onClick={() => setBgStyle("vector")} className={\`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full \${bgStyle === 'vector' ? 'bg-ink text-canvas' : 'text-body hover:text-ink'}\`}>Vector</button>
           <button onClick={() => setBgStyle("photo")} className={\`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full \${bgStyle === 'photo' ? 'bg-ink text-canvas' : 'text-body hover:text-ink'}\`}>Photo</button>
        </div>
      </div>
    </div>`;

if (content.includes(endMarker) && !content.includes('setBgStyle("abstract")')) {
    content = content.replace(endMarker, replaceEnd);
}

fs.writeFileSync('src/components/tabs/ConsistencyTab.tsx', content);
console.log("Updated ConsistencyTab with background toggles.");
