const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// The elements we want to replace have specific signatures
// regex to match: <button key={...} onClick={...} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group...
// and their closing tag </button>
const regex = /<button(\s+key=\{[^\}]+\}\s+onClick=\{\(\) => \{\s*setEditingId[\s\S]*?className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group[\s\S]*?)<\/button>/g;

content = content.replace(regex, '<div$1</div>');

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
