import React from 'react';
import { User, Channel, Workspace } from '../types';
import { cn } from '../lib/utils';
import { 
  Hash, 
  Lock, 
  Plus, 
  MessageSquare, 
  Settings, 
  LogOut,
  ChevronDown,
  Circle,
  Home,
  Bell,
  Files,
  Bookmark,
  MoreHorizontal,
  Star,
  Search,
  Clock,
  User as UserIcon,
  LayoutGrid
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  workspaces: Workspace[];
  channels: Channel[];
  users: User[];
  activeWorkspaceId?: string;
  activeChannelId?: string;
  activeDMUserId?: string;
  activeView: 'home' | 'dms' | 'activity' | 'files';
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
  onSelectView: (view: 'home' | 'dms' | 'activity' | 'files') => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUser,
  workspaces,
  channels,
  users,
  activeWorkspaceId,
  activeChannelId,
  activeDMUserId,
  activeView,
  onSelectWorkspace,
  onSelectChannel,
  onSelectDM,
  onSelectView,
  onOpenAdmin,
  onLogout
}: SidebarProps) {
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const navItems = [
    { icon: Home, label: 'Home', id: 'home' as const },
    { icon: MessageSquare, label: 'DMs', id: 'dms' as const },
    { icon: Bell, label: 'Activity', id: 'activity' as const },
    { icon: Files, label: 'Files', id: 'files' as const },
    { icon: Settings, label: 'Admin', id: 'admin' as const, onClick: onOpenAdmin },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Workspace Rail */}
      <div className="w-[70px] bg-[#19171d] flex flex-col items-center py-4 space-y-4 border-r border-white/10">
        {workspaces.map(ws => (
          <div 
            key={ws.id} 
            onClick={() => onSelectWorkspace(ws.id)}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg cursor-pointer hover:rounded-lg transition-all",
              ws.color,
              ws.id === activeWorkspaceId ? "ring-2 ring-white ring-offset-2 ring-offset-[#19171d]" : ""
            )}
          >
            {ws.initial}
          </div>
        ))}
        {currentUser.role === 'admin' && (
          <button 
            onClick={onOpenAdmin}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Nav Rail */}
      <div className="w-[70px] bg-[#3f0e40] flex flex-col items-center py-4 justify-between border-r border-white/10">
        <div className="flex flex-col items-center space-y-6 w-full">
          {navItems.map((item, idx) => {
            const isActive = item.id === activeView;
            return (
              <button 
                key={idx} 
                onClick={() => item.onClick ? item.onClick() : onSelectView(item.id as any)}
                className={cn(
                  "flex flex-col items-center space-y-1 w-full group",
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive ? "bg-white/10" : "group-hover:bg-white/5"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button 
          onClick={onLogout}
          className="w-10 h-10 rounded-lg overflow-hidden border-2 border-transparent hover:border-green-500 transition-all relative group"
        >
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-white font-bold", currentUser.color)}>
              {currentUser.initial}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#3f0e40]" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <LogOut className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* Main Sidebar */}
      <div className="w-64 bg-[#3f0e40] text-gray-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer group">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-white truncate max-w-[140px]">{activeWorkspace?.name || 'Select Workspace'}</h1>
            <ChevronDown className="w-4 h-4 ml-1 opacity-60 group-hover:opacity-100" />
          </div>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 opacity-60" />
            {currentUser.role === 'admin' && (
              <div onClick={onOpenAdmin} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10">
                <Plus className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Starred Section */}
          <div className="mb-4">
            <div className="px-4 py-1 flex items-center text-sm font-medium group cursor-pointer hover:text-white">
              <ChevronDown className="w-3 h-3 mr-2 opacity-60" />
              <Star className="w-3 h-3 mr-2 opacity-60" />
              Starred
            </div>
            <div className="space-y-[1px]">
              {channels.filter(c => currentUser.starredChannels?.includes(c.id)).map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center px-8 py-1 text-sm transition-colors",
                    activeChannelId === channel.id 
                      ? "bg-[#1164A3] text-white" 
                      : "hover:bg-white/10 hover:text-white"
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="w-3 h-3 mr-2 opacity-60" />
                  ) : (
                    <Hash className="w-3 h-3 mr-2 opacity-60" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
              {otherUsers.filter(u => currentUser.starredDMs?.includes(u.id)).map(user => (
                <button
                  key={user.id}
                  onClick={() => onSelectDM(user.id)}
                  className={cn(
                    "w-full flex items-center px-8 py-1 text-sm transition-colors",
                    activeDMUserId === user.id 
                      ? "bg-[#1164A3] text-white" 
                      : "hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="relative mr-2">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-5 h-5 rounded object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] text-white font-bold", user.color)}>
                        {user.initial}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#3F0E40]" />
                  </div>
                  <span className="truncate">{user.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channels Section */}
          <div className="mb-4">
            <div className="px-4 py-1 flex items-center justify-between group cursor-pointer hover:text-white">
              <div className="flex items-center text-sm font-medium">
                <ChevronDown className="w-3 h-3 mr-2 opacity-60" />
                <Hash className="w-3 h-3 mr-2 opacity-60" />
                Channels
              </div>
              {currentUser.role === 'admin' && (
                <button onClick={(e) => { e.stopPropagation(); onOpenAdmin(); }} className="p-1 hover:bg-white/10 rounded">
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-[1px]">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center px-8 py-1 text-sm transition-colors",
                    activeChannelId === channel.id 
                      ? "bg-[#1164A3] text-white" 
                      : "hover:bg-white/10 hover:text-white"
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="w-3 h-3 mr-2 opacity-60" />
                  ) : (
                    <Hash className="w-3 h-3 mr-2 opacity-60" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

            {/* Direct messages Section */}
            <div className="mb-4">
              <div className="px-4 py-1 flex items-center justify-between group cursor-pointer hover:text-white">
                <div className="flex items-center text-sm font-medium">
                  <ChevronDown className="w-3 h-3 mr-2 opacity-60" />
                  <MessageSquare className="w-3 h-3 mr-2 opacity-60" />
                  Direct messages
                </div>
                <button className="p-1 hover:bg-white/10 rounded">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-[1px]">
                {otherUsers
                  .filter(u => activeWorkspace?.members?.includes(u.id))
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => onSelectDM(user.id)}
                      className={cn(
                        "w-full flex items-center px-8 py-1 text-sm transition-colors",
                        activeDMUserId === user.id 
                          ? "bg-[#1164A3] text-white" 
                          : "hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="relative mr-2">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-5 h-5 rounded object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] text-white font-bold", user.color)}>
                            {user.initial}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#3F0E40]" />
                      </div>
                      <span className="truncate">{user.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
