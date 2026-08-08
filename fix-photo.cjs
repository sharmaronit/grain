const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/ConsistencyTab.tsx', 'utf8');

// 1. Remove bgStyle state
content = content.replace(
    '  const [bgStyle, setBgStyle] = useState<"abstract" | "vector" | "photo">("photo");\n',
    ''
).replace(
    '  const [bgStyle, setBgStyle] = useState<"abstract" | "vector" | "photo">("abstract");\n',
    ''
);

// 2. Remove backgrounds and add just the photo
const returnStart = 'return (';
const replaceReturn = `return (
    <div className="animate-tab-fade pt-12 pb-24 relative min-h-screen">
      {/* Background - Photographic Peak */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <img 
          src="https://images.unsplash.com/photo-1522814201777-6d60db268bf0?auto=format&fit=crop&w=1200&q=80" 
          alt="" 
          className="w-full h-[60vh] min-h-[400px] object-cover opacity-20 grayscale" 
          style={{ 
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)", 
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            objectPosition: "center 20%" 
          }}
        />
      </div>

      <section className="px-5 relative z-10">`;

// I need to use regex to replace from 'return (' to '<section className="px-5 relative z-10">'
const regex = /return \(\s*<div className="animate-tab-fade pt-12 pb-24 relative min-h-screen">([\s\S]*?)<section className="px-5 relative z-10">/;
if (regex.test(content)) {
    content = content.replace(regex, replaceReturn);
}

// 3. Remove toggle at bottom
const toggleRegex = /\{\/\* Toggle \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
if (toggleRegex.test(content)) {
    content = content.replace(toggleRegex, '</div>');
}

fs.writeFileSync('src/components/tabs/ConsistencyTab.tsx', content);
console.log("Updated ConsistencyTab: Removed toggle and kept only the peak photo.");
