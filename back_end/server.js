const express = require('express');
const cors = require('cors');
const floodRoutes = require('./routes/floodR');
const hospitalRoutes = require('./routes/hospitalR');
const shelterRoutes = require('./routes/shelterR');
const vulernabilityRoutes = require('./routes/vulernabilityR');
const safePathRoutes = require('./routes/safepathR');
const authRoutes = require('./routes/authR');
const forgotPasswordRoutes = require('./routes/fpR');
const chatbotRoutes = require('./routes/chatbotR');
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
app.use('/api', forgotPasswordRoutes);
app.use('/api', chatbotRoutes);

const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Ready to receive requests...`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log(`💡 Try: taskkill /F /IM node.exe`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Handle uncaught errors to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🚀 Server initialization complete');
