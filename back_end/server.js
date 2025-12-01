const express = require('express');
const cors = require('cors');
const floodRoutes = require('./routes/floodR');
const hospitalRoutes = require('./routes/hospitalR');
const shelterRoutes = require('./routes/shelterR');
const vulernabilityRoutes = require('./routes/vulernabilityR');
const safePathRoutes = require('./routes/safepathR');
const authRoutes = require('./routes/authR');
//const geocodeRoutes = require('./routes/geocodeR');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', floodRoutes);
app.use('/api', hospitalRoutes);
app.use('/api', shelterRoutes);
app.use('/api', vulernabilityRoutes);
app.use('/api', safePathRoutes);
app.use('/api',authRoutes)


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
