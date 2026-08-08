const fs = require('fs');

let content = fs.readFileSync('src/routes/index.tsx', 'utf8');

if (!content.includes('import { ConsistencyTab }')) {
    content = 'import { ConsistencyTab } from "../components/tabs/ConsistencyTab";\n' + content;
    fs.writeFileSync('src/routes/index.tsx', content);
    console.log("Added ConsistencyTab import.");
} else {
    console.log("Import already exists.");
}
