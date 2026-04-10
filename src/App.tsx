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
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Supabase Error: ${operationType} on ${path}`, error);
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
      if (this.state.error?.message) {
        message = this.state.error.message;
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const fetchDB = useCallback(async () => {
    try {
      const [
        { data: usersData },
        { data: channelsData },
        { data: workspacesData },
        { data: messagesData }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('channels').select('*'),
        supabase.from('workspaces').select('*'),
        supabase.from('messages').select('*').order('timestamp', { ascending: true })
      ]);

      if (usersData) setUsers(usersData as User[]);
      if (channelsData) setChannels(channelsData as Channel[]);
      if (workspacesData) setWorkspaces(workspacesData as Workspace[]);
      if (messagesData) setMessages(messagesData as Message[]);

      if (workspacesData && workspacesData.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(workspacesData[0].id);
      }

      if (channelsData && channelsData.length > 0 && !activeChannelId && !activeDMUserId) {
        const workspaceChannel = channelsData.find((c: Channel) => c.workspaceId === (activeWorkspaceId || workspacesData[0].id));
        if (workspaceChannel) {
          setActiveChannelId(workspaceChannel.id);
        } else {
          setActiveChannelId(channelsData[0].id);
        }
      }
    } catch (err) {
      handleApiError(err, OperationType.GET, 'db');
    }
  }, [activeWorkspaceId, activeChannelId, activeDMUserId]);

  // Initial load & Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile as User);
        }
      }
      setIsAuthLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile as User);
        }
      } else {
        setCurrentUser(null);
      }
    });

    fetchDB();

    return () => subscription.unsubscribe();
  }, []);

  // Presence management
  useEffect(() => {
    if (!currentUser) return;

    const setPresence = async (isOnline: boolean) => {
      try {
        await supabase
          .from('users')
          .update({ is_online: isOnline, last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
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

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const messageSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updatedMessage = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
      })
      .subscribe();

    const userSubscription = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [...prev, payload.new as User]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
          if (currentUser && payload.new.id === currentUser.id) {
            setCurrentUser(prev => prev ? { ...prev, ...payload.new } : null);
          }
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      })
      .subscribe();

    const channelSubscription = supabase
      .channel('public:channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, payload => {
        if (payload.eventType === 'INSERT') {
          setChannels(prev => [...prev, payload.new as Channel]);
        } else if (payload.eventType === 'UPDATE') {
          setChannels(prev => prev.map(c => c.id === payload.new.id ? payload.new as Channel : c));
        } else if (payload.eventType === 'DELETE') {
          setChannels(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    const workspaceSubscription = supabase
      .channel('public:workspaces')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, payload => {
        if (payload.eventType === 'INSERT') {
          setWorkspaces(prev => [...prev, payload.new as Workspace]);
        } else if (payload.eventType === 'UPDATE') {
          setWorkspaces(prev => prev.map(w => w.id === payload.new.id ? payload.new as Workspace : w));
        } else if (payload.eventType === 'DELETE') {
          setWorkspaces(prev => prev.filter(w => w.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(channelSubscription);
      supabase.removeChannel(workspaceSubscription);
    };
  }, [currentUser]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleSendMessage = async (
    content: string, 
    files?: { url: string, name: string, type: string }[], 
    threadId?: string, 
    isVoiceNote?: boolean
  ) => {
    if (!currentUser) return;

    const messageData: Partial<Message> = {
      senderId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      files: files || [],
      reactions: {},
      replyCount: 0,
      isVoiceNote: isVoiceNote || false
    };

    if (threadId) messageData.threadId = threadId;
    if (activeChannelId) messageData.channelId = activeChannelId;
    else if (activeDMUserId) messageData.receiverId = activeDMUserId;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();
      
      if (error) throw error;

      if (threadId) {
        const parent = messages.find(m => m.id === threadId);
        if (parent) {
          await supabase
            .from('messages')
            .update({ replyCount: (parent.replyCount || 0) + 1 })
            .eq('id', threadId);
        }
      }
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
      await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', messageId);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'messages');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    // Supabase Realtime typing indicators can be implemented with Broadcast
    // For now, keeping it simple
  };

  const handleCreateUser = async (name: string, username: string, password: string, avatar: string, role: UserRole, gender?: 'male' | 'female') => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username,
          password,
          name,
          avatar,
          role,
          gender
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      // User created successfully, the real-time subscription will update the list
    } catch (err) {
      console.error('Error creating user:', err);
      alert(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (err) {
      handleApiError(err, OperationType.DELETE, 'users');
    }
  };

  const handleCreateChannel = async (name: string, type: ChannelType) => {
    if (!currentUser || !activeWorkspaceId || currentUser.role !== 'admin') return;
    try {
      const newChannel = { name, type, createdBy: currentUser.id, workspaceId: activeWorkspaceId, members: [currentUser.id] };
      await supabase.from('channels').insert([newChannel]);
    } catch (err) {
      handleApiError(err, OperationType.WRITE, 'channels');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      await supabase.from('channels').delete().eq('id', channelId);
    } catch (err) {
      handleApiError(err, OperationType.DELETE, 'channels');
    }
  };

  const handleCreateWorkspace = async (name: string, color: string, initial: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const firstWordInitial = name.trim().split(' ')[0][0].toUpperCase();
    try {
      const newWorkspace = { name, color, initial: firstWordInitial, members: [currentUser.id] };
      await supabase.from('workspaces').insert([newWorkspace]);
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
      const table = type === 'workspace' ? 'workspaces' : 'channels';
      await supabase.from(table).update({ members: newMembers }).eq('id', id);
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
      await supabase.from('workspaces').delete().eq('id', workspaceId);
      if (activeWorkspaceId === workspaceId) {
        setActiveWorkspaceId(undefined);
        setActiveChannelId(undefined);
      }
    } catch (err) {
      handleApiError(err, OperationType.DELETE, 'workspaces');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1A1D21]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4A154B]"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <UserSelection onSelect={setCurrentUser} />;
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
