// Local development entry: `npm install && npm start` -> http://localhost:3000
const app = require('./app');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Profile cards running on http://localhost:${port}`));
