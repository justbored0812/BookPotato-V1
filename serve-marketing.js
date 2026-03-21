const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// Serve the marketing website at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Marketing website running at: http://localhost:${PORT}`);
  console.log(`External URL: https://${process.env.REPL_ID || 'your-repl'}-00-marketing.${process.env.REPL_OWNER || 'user'}.replit.dev:${PORT}`);
});