const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://radu:bubu2004@34.141.32.0:27017/CRM-NOU')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'projects.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/create-project', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-project.html'));
});

app.get('/swiper/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'swiper.html'));
});

app.get('/edit-project/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit-project.html'));
});

// Serve model images
app.use('/images/models', express.static(path.join(__dirname, 'public/images/models')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/models', require('./routes/models'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});