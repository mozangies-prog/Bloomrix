/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Component } from 'react';
import { User, Channel, Message, UserRole, ChannelType, Workspace } from './types';
import { cn } from './lib/utils';
import UserSelection from './components/UserSelection';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import DMsView from './components/DMsView';
import ActivityView from './components/ActivityView';
import FilesView from './components/FilesView';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';

const socket: Socket = io();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`API Error: ${operationType} on ${path}`, error);
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const fetchDB = useCallback(async () => {
    try {
      const res = await fetch('/api/db');
      const data = await res.json();
      setUsers(data.users);
      setChannels(data.channels);
      setWorkspaces(data.workspaces);
      setMessages(data.messages);

      // Update current user if it exists
      if (currentUser) {
        const updatedUser = data.users.find((u: User) => u.id === currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }

      if (data.workspaces.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(data.workspaces[0].id);
      }

      if (data.channels.length > 0 && !activeChannelId && !activeDMUserId) {
        const workspaceChannel = data.channels.find((c: Channel) => c.workspaceId === (activeWorkspaceId || data.workspaces[0].id));
        if (workspaceChannel) {
          setActiveChannelId(workspaceChannel.id);
        } else {
          setActiveChannelId(data.channels[0].id);
        }
      }
    } catch (err) {
      handleApiError(err, OperationType.GET, 'db');
    }
  }, [currentUser, activeWorkspaceId, activeChannelId, activeDMUserId]);

  // Initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('bloomrix_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('bloomrix_user');
      }
    }
    fetchDB();
  }, []);

  // Presence management
  useEffect(() => {
    if (!currentUser) return;

    const setPresence = async (isOnline: boolean) => {
      try {
        await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline, lastSeen: new Date().toISOString() })
        });
      } catch (err) {
        handleApiError(err, OperationType.WRITE, 'users');
      }
    };

    setPresence(true);

    const setOffline = () => setPresence(false);
    window.addEventListener('beforeunload', setOffline);
    return () => {
      window.removeEventListener('beforeunload', setOffline);
      setOffline();
    };
  }, [currentUser?.id]);

  // Socket events for real-time messages
  useEffect(() => {
    if (!currentUser) return;

    socket.emit('join_app', currentUser.id);

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
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

  const handleSendMessage = async (
    content: string, 
    files?: { url: string, name: string, type: string }[], 
    threadId?: string, 
    isVoiceNote?: boolean
  ) => {
    if (!currentUser) return;

    const messageId = Math.random().toString(36).substr(2, 9);
    const messageData: Message = {
      id: messageId,
      senderId: currentUser.id,
      content,
      timestamp: new Date().toISOString() as any,
      files: files || [],
      reactions: {},
      replyCount: 0,
      isVoiceNote: isVoiceNote || false
    };

    if (threadId) messageData.threadId = threadId;
    if (activeChannelId) messageData.channelId = activeChannelId;
    else if (activeDMUserId) messageData.receiverId = activeDMUserId;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      if (threadId) {
        const parent = messages.find(m => m.id === threadId);
        if (parent) {
          await fetch(`/api/messages/${threadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyCount: (parent.replyCount || 0) + 1 })
          });
        }
      }

      setMessages(prev => [...prev, messageData]);
      socket.emit('send_message', {
        ...messageData,
        channelId: activeChannelId,
        receiverId: activeDMUserId
      });
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'messages');
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = { ...(message.reactions || {}) };
    const userIds = [...(reactions[emoji] || [])];
    
    if (userIds.includes(currentUser.id)) {
      reactions[emoji] = userIds.filter(id => id !== currentUser.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userIds, currentUser.id];
    }

    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactions })
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
      socket.emit('message_reaction', { messageId, reactions });
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'messages');
    }
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

  const handleCreateUser = async (name: string, username: string, password: string, avatar: string, role: UserRole, gender?: 'male' | 'female') => {
    const id = Math.random().toString(36).substr(2, 9);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initial = name.trim().split(' ')[0][0];

    try {
      const newUser = { id, name, username, password, avatar: avatar || undefined, color, initial, role, gender };
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      setUsers(prev => [...prev, newUser as User]);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'users');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      handleApiError(err, OperationType.DELETE, 'users');
    }
  };

  const handleCreateChannel = async (name: string, type: ChannelType) => {
    if (!currentUser || !activeWorkspaceId || currentUser.role !== 'admin') return;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      const newChannel = { id, name, type, createdBy: currentUser.id, workspaceId: activeWorkspaceId, members: [currentUser.id] };
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel)
      });
      setChannels(prev => [...prev, newChannel as Channel]);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'channels');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    // Implement delete route if needed, for now just UI
    setChannels(prev => prev.filter(c => c.id !== channelId));
  };

  const handleCreateWorkspace = async (name: string, color: string, initial: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const id = Math.random().toString(36).substr(2, 9);
    const firstWordInitial = name.trim().split(' ')[0][0];
    try {
      const newWorkspace = { id, name, color, initial: firstWordInitial, members: [currentUser.id] };
      await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkspace)
      });
      setWorkspaces(prev => [...prev, newWorkspace as Workspace]);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'workspaces');
    }
  };

  const handleUpdateMembership = async (type: 'workspace' | 'channel', id: string, userId: string, action: 'add' | 'remove') => {
    const item = type === 'workspace' ? workspaces.find(w => w.id === id) : channels.find(c => c.id === id);
    if (!item) return;

    let newMembers = [...item.members];
    if (action === 'add') {
      if (!newMembers.includes(userId)) newMembers.push(userId);
    } else {
      newMembers = newMembers.filter(m => m !== userId);
    }

    try {
      const endpoint = type === 'workspace' ? `/api/workspaces/${id}` : `/api/channels/${id}`;
      // Note: Need to add PUT routes for workspaces/channels in server.ts if full CRUD is needed
      // For now, we'll just update local state to keep it "live" for testing
      if (type === 'workspace') setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, members: newMembers } : w));
      else setChannels(prev => prev.map(c => c.id === id ? { ...c, members: newMembers } : c));
    } catch (err) {
      handleApiError(err, OperationType.WRITE, type);
    }
  };

  const handleToggleStar = async (type: 'channel' | 'dm', id: string) => {
    if (!currentUser) return;
    const field = type === 'channel' ? 'starredChannels' : 'starredDMs';
    const currentStarred = currentUser[field] || [];
    const isStarred = currentStarred.includes(id);
    const newStarred = isStarred ? currentStarred.filter(itemId => itemId !== id) : [...currentStarred, id];

    handleUpdateUser(currentUser.id, { [field]: newStarred });
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        setActiveWorkspaceId(undefined);
        setActiveChannelId(undefined);
      }
    } catch (err) {
      handleApiError(err, OperationType.DELETE, 'workspaces');
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
      <div className="h-screen flex overflow-hidden bg-white relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
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
              setIsMobileSidebarOpen(false);
            }}
            onSelectDM={(id) => { 
              setActiveDMUserId(id); 
              setActiveChannelId(undefined); 
              setActiveView('home');
              setIsMobileSidebarOpen(false);
            }}
            onSelectView={(view) => {
              setActiveView(view);
              if (view !== 'home') {
                setActiveChannelId(undefined);
                setActiveDMUserId(undefined);
              }
              setIsMobileSidebarOpen(false);
            }}
            onOpenAdmin={() => {
              if (currentUser.role === 'admin') {
                setIsAdminOpen(true);
              }
            }}
            onLogout={handleLogout}
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
          {activeView === 'home' ? (
            <ChatPanel 
              currentUser={currentUser}
              users={users}
              activeChannel={channels.find(c => c.id === activeChannelId)}
              activeDMUser={users.find(u => u.id === activeDMUserId)}
              messages={messages}
              typingUsers={typingUsers}
              onSendMessage={handleSendMessage}
              onReact={handleReact}
              onTyping={handleTyping}
              onSearch={() => {}}
              onToggleStar={handleToggleStar}
              onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
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
              onDeleteWorkspace={handleDeleteWorkspace}
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
