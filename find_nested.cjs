const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const regex = /<button[\s\S]*?<button[\s\S]*?<\/button>[\s\S]*?<\/button>/g;
const match = content.match(regex);
if (match) {
  console.log("Found nested buttons:");
  console.log(match[0].substring(0, 500));
} else {
  console.log("No nested buttons found in AdminDashboard.");
}
