import express from 'express';

const router = express.Router();

// Global delay setting (in milliseconds) - for simulating healthcare system latency
let globalDelay = 0;

// Simulated load metrics - for healthcare system monitoring
let simulatedLoad = {
  cpuUsage: 0,
  memoryUsage: 0,
  requestsPerSecond: 0,
  activeConnections: 0,
  overloaded: false
};

// Middleware to add artificial delay
export const delayMiddleware = (req, res, next) => {
  if (globalDelay > 0) {
    setTimeout(next, globalDelay);
  } else {
    next();
  }
};

// Get current delay setting
router.get('/delay', (req, res) => {
  res.json({
    delay: globalDelay,
    enabled: globalDelay > 0,
    message: globalDelay > 0 
      ? `Artificial delay of ${globalDelay}ms is active` 
      : 'No artificial delay'
  });
});

// Set delay (for demo purposes)
router.post('/delay', (req, res) => {
  const { delay } = req.body;
  
  if (typeof delay !== 'number' || delay < 0) {
    return res.status(400).json({ error: 'Delay must be a positive number' });
  }
  
  globalDelay = delay;
  
  res.json({
    delay: globalDelay,
    enabled: globalDelay > 0,
    message: globalDelay > 0 
      ? `Artificial delay set to ${globalDelay}ms` 
      : 'Artificial delay disabled'
  });
});

// Reset delay to 0
router.delete('/delay', (req, res) => {
  globalDelay = 0;
  res.json({
    delay: 0,
    enabled: false,
    message: 'Artificial delay disabled'
  });
});

// Get current load metrics
router.get('/metrics', (req, res) => {
  res.json({
    ...simulatedLoad,
    timestamp: new Date().toISOString(),
    message: simulatedLoad.overloaded
      ? '⚠️ Server is overloaded! Scaling recommended.'
      : '✅ Server load is normal'
  });
});

// Set simulated load (for demo purposes)
router.post('/load', (req, res) => {
  const { cpuUsage, memoryUsage, requestsPerSecond, activeConnections, overloaded } = req.body;
  
  if (cpuUsage !== undefined) simulatedLoad.cpuUsage = cpuUsage;
  if (memoryUsage !== undefined) simulatedLoad.memoryUsage = memoryUsage;
  if (requestsPerSecond !== undefined) simulatedLoad.requestsPerSecond = requestsPerSecond;
  if (activeConnections !== undefined) simulatedLoad.activeConnections = activeConnections;
  if (overloaded !== undefined) simulatedLoad.overloaded = overloaded;
  
  res.json({
    ...simulatedLoad,
    message: simulatedLoad.overloaded
      ? 'Server load set to overloaded state'
      : 'Server load metrics updated'
  });
});

// Reset load metrics
router.delete('/load', (req, res) => {
  simulatedLoad = {
    cpuUsage: 0,
    memoryUsage: 0,
    requestsPerSecond: 0,
    activeConnections: 0,
    overloaded: false
  };
  
  res.json({
    ...simulatedLoad,
    message: 'Load metrics reset to normal'
  });
});

export default router;

// Made with Bob
