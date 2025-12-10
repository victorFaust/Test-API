const express = require('express');
const app = express();

app.use(express.json());

// In-memory stores
let users = [];
let items = [];
let userIdCounter = 1;
let itemIdCounter = 1;

// AUTH ENDPOINTS

// Register
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const user = {
    id: userIdCounter++,
    username,
    password, // In production, hash this!
    email,
    createdAt: new Date()
  };
  
  users.push(user);
  res.status(201).json({ 
    id: user.id, 
    username: user.username,
    email: user.email 
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    message: 'Login successful',
    userId: user.id,
    username: user.username
  });
});

// CRUD ENDPOINTS

// Create item
app.post('/api/items', (req, res) => {
  const { name, description, price } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const item = {
    id: itemIdCounter++,
    name,
    description,
    price: price || 0,
    createdAt: new Date()
  };
  
  items.push(item);
  res.status(201).json(item);
});

// Read all items
app.get('/api/items', (req, res) => {
  res.json(items);
});

// Read single item
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  res.json(item);
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  item.name = req.body.name || item.name;
  item.description = req.body.description || item.description;
  item.price = req.body.price !== undefined ? req.body.price : item.price;
  item.updatedAt = new Date();
  
  res.json(item);
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  items.splice(index, 1);
  res.json({ message: 'Item deleted successfully' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});