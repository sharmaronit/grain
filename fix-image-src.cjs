const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/ConsistencyTab.tsx', 'utf8');

content = content.replace(
    'src="https://images.unsplash.com/photo-1522814201777-6d60db268bf0?auto=format&fit=crop&w=1200&q=80"',
    'src="/mountain.jpg"'
);

fs.writeFileSync('src/components/tabs/ConsistencyTab.tsx', content);
console.log("Updated ConsistencyTab to use local /mountain.jpg");
