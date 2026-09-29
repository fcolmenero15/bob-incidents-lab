import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Made with Bob
