import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // File upload configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  app.use('/uploads', express.static('uploads'));

  const DB_PATH = path.join(process.cwd(), 'db.json');

  const readDB = () => {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading DB:', err);
      return { users: [], workspaces: [], channels: [], messages: [] };
    }
  };

  const writeDB = (data: any) => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing DB:', err);
    }
  };

  app.get('/api/db', (req, res) => {
    res.json(readDB());
  });

  app.post('/api/users', (req, res) => {
    const db = readDB();
    const newUser = req.body;
    db.users.push(newUser);
    writeDB(db);
    res.json(newUser);
  });

  app.put('/api/users/:id', (req, res) => {
    const db = readDB();
    const index = db.users.findIndex((u: any) => u.id === req.params.id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...req.body };
      writeDB(db);
      res.json(db.users[index]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const db = readDB();
    db.users = db.users.filter((u: any) => u.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  app.post('/api/channels', (req, res) => {
    const db = readDB();
    const newChannel = req.body;
    db.channels.push(newChannel);
    writeDB(db);
    res.json(newChannel);
  });

  app.put('/api/channels/:id', (req, res) => {
    const db = readDB();
    const index = db.channels.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index] = { ...db.channels[index], ...req.body };
      writeDB(db);
      res.json(db.channels[index]);
    } else {
      res.status(404).json({ error: 'Channel not found' });
    }
  });

  app.delete('/api/channels/:id', (req, res) => {
    const db = readDB();
    db.channels = db.channels.filter((c: any) => c.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  app.post('/api/workspaces', (req, res) => {
    const db = readDB();
    const newWorkspace = req.body;
    db.workspaces.push(newWorkspace);
    writeDB(db);
    res.json(newWorkspace);
  });

  app.put('/api/workspaces/:id', (req, res) => {
    const db = readDB();
    const index = db.workspaces.findIndex((w: any) => w.id === req.params.id);
    if (index !== -1) {
      db.workspaces[index] = { ...db.workspaces[index], ...req.body };
      writeDB(db);
      res.json(db.workspaces[index]);
    } else {
      res.status(404).json({ error: 'Workspace not found' });
    }
  });

  app.delete('/api/workspaces/:id', (req, res) => {
    const db = readDB();
    db.workspaces = db.workspaces.filter((w: any) => w.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  app.post('/api/messages', (req, res) => {
    const db = readDB();
    const newMessage = req.body;
    db.messages.push(newMessage);
    writeDB(db);
    res.json(newMessage);
  });

  app.put('/api/messages/:id', (req, res) => {
    const db = readDB();
    const index = db.messages.findIndex((m: any) => m.id === req.params.id);
    if (index !== -1) {
      db.messages[index] = { ...db.messages[index], ...req.body };
      writeDB(db);
      res.json(db.messages[index]);
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  });

  app.post('/api/upload', upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname });
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_app', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined app`);
    });

    socket.on('join_channel', (channelId) => {
      socket.join(channelId);
      console.log(`User joined channel: ${channelId}`);
    });

    socket.on('send_message', (data) => {
      const { channelId, receiverId } = data;
      if (channelId) {
        socket.to(channelId).emit('receive_message', data);
      } else if (receiverId) {
        socket.to(receiverId).emit('receive_message', data);
      }
    });

    socket.on('typing', (data) => {
      const { channelId, receiverId, userId, isTyping } = data;
      if (channelId) {
        socket.to(channelId).emit('typing', { userId, isTyping, channelId });
      } else if (receiverId) {
        socket.to(receiverId).emit('typing', { userId, isTyping, receiverId });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
