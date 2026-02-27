const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'skatepark');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the asset path
    content = content.replace(/useGLTF\('\//g, "useGLTF('/models/skatepark-transformed/");
    content = content.replace(/useGLTF\.preload\('\//g, "useGLTF.preload('/models/skatepark-transformed/");

    fs.writeFileSync(filePath, content);
    console.log(`Updated paths in ${file}`);
}
