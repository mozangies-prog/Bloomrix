import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  
  // Initialize Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV,
      supabaseConfigured: !!supabaseAdmin 
    });
  });

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

  // Simplified Login with Admin Bootstrapping
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(`Login attempt for: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const loginEmail = email.toLowerCase() === 'admin' ? 'admin@bloomrix.com' : email;

      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin SDK not configured. Check SUPABASE_SERVICE_ROLE_KEY.' });
      }

      // 1. Check if it's the hardcoded admin
      if (email.toLowerCase() === 'admin' && password === 'admin123') {
        // Ensure admin user exists in Auth
        const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
        let adminUser = existingUsers.find(u => u.email === 'admin@bloomrix.com');

        if (!adminUser) {
          const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: 'admin@bloomrix.com',
            password: 'admin123',
            email_confirm: true
          });
          if (createError) throw createError;
          adminUser = newAuth.user;
        } else if (!adminUser.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUserById(adminUser.id, { email_confirm: true });
        }

        // Ensure admin profile exists in 'users' table
        const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', adminUser!.id).single();
        if (!profile) {
          await supabaseAdmin.from('users').insert([{
            id: adminUser!.id,
            name: 'Administrator',
            email: 'admin@bloomrix.com',
            role: 'admin',
            color: 'bg-purple-600',
            initial: 'A'
          }]);
        }
      }

      // 2. Perform standard sign in
      let { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      // 3. Handle "Email not confirmed" error by auto-confirming via Admin SDK
      if (authError && authError.message.includes('Email not confirmed')) {
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const userToConfirm = allUsers.find(u => u.email === loginEmail);
        
        if (userToConfirm) {
          await supabaseAdmin.auth.admin.updateUserById(userToConfirm.id, { email_confirm: true });
          const retry = await supabaseAdmin.auth.signInWithPassword({
            email: loginEmail,
            password
          });
          authData = retry.data;
          authError = retry.error;
        }
      }

      if (authError) {
        return res.status(401).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(401).json({ error: 'Login failed' });
      }

      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        return res.status(500).json({ error: 'User profile not found in database' });
      }

      return res.json({ user: userProfile });
    } catch (err: any) {
      console.error('Login Error:', err);
      return res.status(500).json({ error: err.message || 'An internal server error occurred' });
    }
  });

  // Admin: Create User with Auth
  app.post('/api/admin/create-user', async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase Admin SDK not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your environment variables.' });
    }

    const { email, password, name, avatar, role, gender } = req.body;

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');

      // 2. Create user profile in 'users' table
      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const initial = name.trim().split(' ')[0][0].toUpperCase();

      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            id: authData.user.id,
            name,
            email,
            color,
            initial,
            role: role || 'user',
            avatar,
            gender
          }
        ]);

      if (profileError) throw profileError;

      res.json({ success: true, user: authData.user });
    } catch (err: any) {
      console.error('Admin Create User Error:', err);
      res.status(400).json({ error: err.message });
    }
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
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });

  return { app, httpServer };
}

export const serverPromise = startServer();
