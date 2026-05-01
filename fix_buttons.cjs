const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

content = content.replace(/<button\n type="button"\n onClick=\{\(e\) => \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*([\s\S]*?)\s*\}\}\n className="([^"]+)"\n>\n <Trash2([^>]*) \/>\n<\/button>/g, '<div\n onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1 }}\n className="$2"\n>\n <Trash2$3 />\n</div>');

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
