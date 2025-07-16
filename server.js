const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Starting server
const server = app.listen(PORT, ()=> {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📍 Health check: http://localhost:${PORT}/api/health');
});

// Handle server errors-yesss
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});


// wth graceful shutdown
process.on('SIGINT', () =>{
    console.log('/n Shutting down server');
    server.close(()=> {
        console.log('Server closed');
        process.exit(0);
    });
});