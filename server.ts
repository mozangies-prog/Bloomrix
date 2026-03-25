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
