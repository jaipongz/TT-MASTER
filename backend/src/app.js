const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend (ปรับ path ตามจริง)
app.use(express.static(path.join(__dirname, '../../frontend/src')));

// Routes
const projectRoutes = require('./routes/projectRoutes');
const jsonRoutes = require('./routes/jsonRoutes');

app.use('/api/projects', projectRoutes);
app.use('/api/json', jsonRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Something went wrong!'
  });
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/src/index.html'));
});

app.listen(port, () => {
  console.log(`✅ Server running: http://localhost:${port}`);
  console.log(`📡 API: http://localhost:${port}/api/projects`);
});
