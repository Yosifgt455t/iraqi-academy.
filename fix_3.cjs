const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// replace the button with div directly where it fails
content = content.replace("                                </button>\n                              ))}\n\n                          {activeTab === \"reviews\" && (", "                                </div>\n                              ))}\n\n                          {activeTab === \"reviews\" && (");

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
