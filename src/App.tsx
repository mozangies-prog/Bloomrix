/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Component } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  where, 
  Timestamp,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Channel, Message, UserRole, ChannelType, Workspace } from './types';
import UserSelection from './components/UserSelection';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import DMsView from './components/DMsView';
import ActivityView from './components/ActivityView';
import FilesView from './components/FilesView';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { getDocFromServer } from 'firebase/firestore';

const socket: Socket = io();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
      } catch (e) {
        message = this.state.error.message || message;
      }
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Oops!</h1>
          <p className="text-red-800 mb-4">{message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | undefined>();
  const [activeDMUserId, setActiveDMUserId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<'home' | 'dms' | 'activity' | 'files'>('home');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Load users and channels
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      
      // Update current user if it exists
      if (currentUser) {
        const updatedUser = usersData.find(u => u.id === currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }
      
      // Bootstrap initial admin if no users exist
      if (snapshot.empty) {
        const adminId = 'admin-1';
        setDoc(doc(db, 'users', adminId), {
          id: adminId,
          name: 'System Admin',
          username: 'admin',
          password: 'admin123',
          color: 'bg-indigo-600',
          initial: 'S',
          role: 'admin'
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

    const unsubscribeChannels = onSnapshot(collection(db, 'channels'), (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
      setChannels(channelsData);
      
      // Bootstrap initial channel if no channels exist
      if (snapshot.empty) {
        const channelId = 'general';
        setDoc(doc(db, 'channels', channelId), {
          id: channelId,
          name: 'general',
          type: 'public',
          createdBy: 'system',
          members: [],
          workspaceId: 'default'
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'channels'));
      }

      if (channelsData.length > 0 && !activeChannelId && !activeDMUserId) {
        // Try to find a channel in the active workspace first
        const workspaceChannel = channelsData.find(c => c.workspaceId === activeWorkspaceId);
        if (workspaceChannel) {
          setActiveChannelId(workspaceChannel.id);
        } else {
          setActiveChannelId(channelsData[0].id);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'channels'));

    const unsubscribeWorkspaces = onSnapshot(collection(db, 'workspaces'), (snapshot) => {
      const workspacesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      setWorkspaces(workspacesData);
      
      if (snapshot.empty) {
        const workspaceId = 'default';
        setDoc(doc(db, 'workspaces', workspaceId), {
          id: workspaceId,
          name: 'General Workspace',
          color: 'bg-indigo-600',
          initial: 'G',
          members: []
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'workspaces'));
      }

      if (workspacesData.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(workspacesData[0].id);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'workspaces'));

    return () => {
      unsubscribeUsers();
      unsubscribeChannels();
      unsubscribeWorkspaces();
    };
  }, [activeChannelId, activeDMUserId, activeWorkspaceId]);

  // Load messages for active channel or DM
  useEffect(() => {
    if (!activeChannelId && !activeDMUserId) return;

    let q;
    if (activeChannelId) {
      q = query(
        collection(db, 'messages'),
        where('channelId', '==', activeChannelId),
        orderBy('timestamp', 'asc')
      );
    } else {
      // For DMs, we need to find messages between currentUser and activeDMUser
      // Firestore doesn't support OR queries easily for this, so we'll fetch all DMs and filter client-side
      // or use a composite key. For simplicity in this applet, we'll fetch all DMs for the current user.
      q = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'asc')
      );
    }

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      let messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      if (activeDMUserId && currentUser) {
        messagesData = messagesData.filter(m => 
          (m.senderId === currentUser.id && m.receiverId === activeDMUserId) ||
          (m.senderId === activeDMUserId && m.receiverId === currentUser.id)
        );
      }
      
      setMessages(messagesData);
    });

    return () => unsubscribeMessages();
  }, [activeChannelId, activeDMUserId, currentUser]);

  // Socket events
  useEffect(() => {
    if (!currentUser) return;

    socket.emit('join_app', currentUser.id);

    socket.on('receive_message', (data) => {
      // Messages are handled by Firestore onSnapshot, but we could use this for notifications
    });

    socket.on('typing', (data) => {
      const { userId, isTyping, channelId, receiverId } = data;
      if (channelId === activeChannelId || receiverId === currentUser.id) {
        setTypingUsers(prev => {
          const user = users.find(u => u.id === userId);
          if (!user) return prev;
          if (isTyping) {
            return prev.includes(user.name) ? prev : [...prev, user.name];
          } else {
            return prev.filter(name => name !== user.name);
          }
        });
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('typing');
    };
  }, [currentUser, activeChannelId, activeDMUserId, users]);

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    // Find first channel in this workspace
    const firstChannel = channels.find(c => c.workspaceId === workspaceId);
    if (firstChannel) {
      setActiveChannelId(firstChannel.id);
      setActiveDMUserId(undefined);
    } else {
      setActiveChannelId(undefined);
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('bloomrix_user', JSON.stringify(user));
    
    // Set initial workspace if not set
    if (!activeWorkspaceId && workspaces.length > 0) {
      const firstWorkspace = user.role === 'admin' 
        ? workspaces[0] 
        : workspaces.find(w => (w.members || []).includes(user.id));
      
      if (firstWorkspace) {
        handleSelectWorkspace(firstWorkspace.id);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bloomrix_user');
  };

  const handleSendMessage = async (content: string, file?: { url: string, name: string }) => {
    if (!currentUser) return;

    const messageId = Math.random().toString(36).substr(2, 9);
    const messageData: Partial<Message> = {
      id: messageId,
      senderId: currentUser.id,
      content,
      timestamp: serverTimestamp(),
    };

    if (file) {
      messageData.fileUrl = file.url;
      messageData.fileName = file.name;
    }

    if (activeChannelId) {
      messageData.channelId = activeChannelId;
    } else if (activeDMUserId) {
      messageData.receiverId = activeDMUserId;
    }

    try {
      await setDoc(doc(db, 'messages', messageId), messageData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messages');
    }
    
    socket.emit('send_message', {
      ...messageData,
      channelId: activeChannelId,
      receiverId: activeDMUserId
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentUser) return;
    socket.emit('typing', {
      userId: currentUser.id,
      isTyping,
      channelId: activeChannelId,
      receiverId: activeDMUserId
    });
  };

  const handleCreateUser = async (name: string, username: string, password: string, avatar: string, role: UserRole) => {
    const id = Math.random().toString(36).substr(2, 9);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initial = name.charAt(0).toUpperCase();

    try {
      await setDoc(doc(db, 'users', id), { 
        id, 
        name, 
        username,
        password,
        avatar: avatar || undefined, 
        color,
        initial,
        role 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', userId), { ...user, ...updates });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'users');
    }
  };

  const handleCreateChannel = async (name: string, type: ChannelType) => {
    if (!currentUser || !activeWorkspaceId) return;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'channels', id), { 
        id, 
        name, 
        type, 
        createdBy: currentUser.id,
        workspaceId: activeWorkspaceId,
        members: [currentUser.id] // Creator is always a member
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'channels');
    }
  };

  const handleCreateWorkspace = async (name: string, color: string, initial: string) => {
    if (!currentUser) return;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'workspaces', id), { 
        id, 
        name, 
        color, 
        initial, 
        members: [currentUser.id] 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'workspaces');
    }
  };

  const handleUpdateMembership = async (type: 'workspace' | 'channel', id: string, userId: string, action: 'add' | 'remove') => {
    const collectionName = type === 'workspace' ? 'workspaces' : 'channels';
    const item = type === 'workspace' 
      ? workspaces.find(w => w.id === id) 
      : channels.find(c => c.id === id);
    
    if (!item) return;

    let newMembers = [...item.members];
    if (action === 'add') {
      if (!newMembers.includes(userId)) newMembers.push(userId);
    } else {
      newMembers = newMembers.filter(m => m !== userId);
    }

    try {
      await setDoc(doc(db, collectionName, id), { ...item, members: newMembers });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, collectionName);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteDoc(doc(db, 'channels', channelId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'channels');
    }
  };

  const handleToggleStar = async (type: 'channel' | 'dm', id: string) => {
    if (!currentUser) return;

    const field = type === 'channel' ? 'starredChannels' : 'starredDMs';
    const currentStarred = currentUser[field] || [];
    const isStarred = currentStarred.includes(id);

    const newStarred = isStarred 
      ? currentStarred.filter(itemId => itemId !== id)
      : [...currentStarred, id];

    try {
      await setDoc(doc(db, 'users', currentUser.id), { ...currentUser, [field]: newStarred });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  if (!currentUser) {
    return <UserSelection users={users} onSelect={handleSelectUser} />;
  }

  const filteredWorkspaces = currentUser?.role === 'admin' 
    ? workspaces 
    : workspaces.filter(w => (w.members || []).includes(currentUser?.id || ''));

  const filteredChannels = currentUser?.role === 'admin'
    ? channels.filter(c => c.workspaceId === activeWorkspaceId)
    : channels.filter(c => c.workspaceId === activeWorkspaceId && (c.members || []).includes(currentUser?.id || ''));

  return (
    <ErrorBoundary>
      <div className="h-screen flex overflow-hidden bg-white">
        <Sidebar 
          currentUser={currentUser}
          workspaces={filteredWorkspaces}
          channels={filteredChannels}
          users={users}
          activeWorkspaceId={activeWorkspaceId}
          activeChannelId={activeChannelId}
          activeDMUserId={activeDMUserId}
          activeView={activeView}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectChannel={(id) => { 
            setActiveChannelId(id); 
            setActiveDMUserId(undefined); 
            setActiveView('home');
          }}
          onSelectDM={(id) => { 
            setActiveDMUserId(id); 
            setActiveChannelId(undefined); 
            setActiveView('home');
          }}
          onSelectView={(view) => {
            setActiveView(view);
            if (view !== 'home') {
              setActiveChannelId(undefined);
              setActiveDMUserId(undefined);
            }
          }}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {activeView === 'home' ? (
            <ChatPanel 
              currentUser={currentUser}
              users={users}
              activeChannel={channels.find(c => c.id === activeChannelId)}
              activeDMUser={users.find(u => u.id === activeDMUserId)}
              messages={messages}
              typingUsers={typingUsers}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onSearch={() => {}}
              onToggleStar={handleToggleStar}
            />
          ) : activeView === 'dms' ? (
            <DMsView 
              currentUser={currentUser}
              users={users}
              messages={messages}
              activeWorkspaceId={activeWorkspaceId}
              workspaces={workspaces}
              onSelectDM={(id) => {
                setActiveDMUserId(id);
                setActiveChannelId(undefined);
                setActiveView('home');
              }}
              activeDMUserId={activeDMUserId || null}
            />
          ) : activeView === 'activity' ? (
            <ActivityView 
              currentUser={currentUser}
              users={users}
              messages={messages}
              channels={channels}
              activeWorkspaceId={activeWorkspaceId}
              workspaces={workspaces}
              onSelectChannel={(id) => {
                setActiveChannelId(id);
                setActiveDMUserId(undefined);
                setActiveView('home');
              }}
              onSelectDM={(id) => {
                setActiveDMUserId(id);
                setActiveChannelId(undefined);
                setActiveView('home');
              }}
            />
          ) : activeView === 'files' ? (
            <FilesView 
              currentUser={currentUser}
              users={users}
              messages={messages}
              channels={channels}
              activeWorkspaceId={activeWorkspaceId}
              workspaces={workspaces}
              onSelectChannel={(id) => {
                setActiveChannelId(id);
                setActiveDMUserId(undefined);
                setActiveView('home');
              }}
              onSelectDM={(id) => {
                setActiveDMUserId(id);
                setActiveChannelId(undefined);
                setActiveView('home');
              }}
            />
          ) : null}
        </div>

        <AnimatePresence>
          {isAdminOpen && (
            <AdminPanel 
              users={users}
              channels={channels}
              workspaces={workspaces}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
              onCreateChannel={handleCreateChannel}
              onDeleteChannel={handleDeleteChannel}
              onCreateWorkspace={handleCreateWorkspace}
              onUpdateMembership={handleUpdateMembership}
              onUpdateUser={handleUpdateUser}
              onClose={() => setIsAdminOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
