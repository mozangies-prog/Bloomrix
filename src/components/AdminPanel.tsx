import React, { useState } from 'react';
import { User, Channel, UserRole, ChannelType, Workspace } from '../types';
import { cn } from '../lib/utils';
import { 
  X, 
  UserPlus, 
  Trash2, 
  PlusCircle, 
  Hash, 
  Lock, 
  Shield, 
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  users: User[];
  channels: Channel[];
  workspaces: Workspace[];
  onCreateUser: (name: string, username: string, password: string, avatar: string, role: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  onCreateChannel: (name: string, type: ChannelType) => void;
  onDeleteChannel: (channelId: string) => void;
  onCreateWorkspace: (name: string, color: string, initial: string) => void;
  onUpdateMembership: (type: 'workspace' | 'channel', id: string, userId: string, action: 'add' | 'remove') => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onClose: () => void;
}

export default function AdminPanel({
  users,
  channels,
  workspaces,
  onCreateUser,
  onDeleteUser,
  onCreateChannel,
  onDeleteChannel,
  onCreateWorkspace,
  onUpdateMembership,
  onUpdateUser,
  onClose
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'channels' | 'workspaces'>('users');
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('public');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('bg-indigo-600');
  
  const [managingMembers, setManagingMembers] = useState<{ type: 'workspace' | 'channel', id: string } | null>(null);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim() && newUserUsername.trim() && newUserPassword.trim()) {
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUserName}`;
      onCreateUser(newUserName, newUserUsername, newUserPassword, avatar, newUserRole);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
    }
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName, newChannelType);
      setNewChannelName('');
    }
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      onCreateWorkspace(newWorkspaceName, newWorkspaceColor, newWorkspaceName[0].toUpperCase());
      setNewWorkspaceName('');
    }
  };

  const currentManagingItem = managingMembers 
    ? (managingMembers.type === 'workspace' 
        ? workspaces.find(w => w.id === managingMembers.id)
        : channels.find(c => c.id === managingMembers.id))
    : null;

  const workspaceColors = [
    'bg-indigo-600', 'bg-blue-600', 'bg-teal-600', 'bg-green-600', 
    'bg-orange-600', 'bg-red-600', 'bg-pink-600', 'bg-purple-600'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#4A154B] rounded-lg text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
              <p className="text-sm text-gray-500">Manage workspace users and channels</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-6 py-4 text-sm font-semibold transition-all border-b-2",
              activeTab === 'users' ? "border-[#4A154B] text-[#4A154B]" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('workspaces')}
            className={cn(
              "px-6 py-4 text-sm font-semibold transition-all border-b-2",
              activeTab === 'workspaces' ? "border-[#4A154B] text-[#4A154B]" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Workspaces
          </button>
          <button 
            onClick={() => setActiveTab('channels')}
            className={cn(
              "px-6 py-4 text-sm font-semibold transition-all border-b-2",
              activeTab === 'channels' ? "border-[#4A154B] text-[#4A154B]" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Channels
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white relative">
          <AnimatePresence>
            {managingMembers && currentManagingItem && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-0 z-10 bg-white p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setManagingMembers(null)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                    <h3 className="text-xl font-bold text-gray-900">Manage Members: {currentManagingItem.name}</h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => {
                      const isMember = (currentManagingItem.members || []).includes(user.id);
                      return (
                        <div key={user.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-lg mr-3" />
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>
                          <button 
                            onClick={() => onUpdateMembership(managingMembers.type, managingMembers.id, user.id, isMember ? 'remove' : 'add')}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                              isMember 
                                ? "bg-red-100 text-red-600 hover:bg-red-200" 
                                : "bg-green-100 text-green-600 hover:bg-green-200"
                            )}
                          >
                            {isMember ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'users' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create User Form */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-[#4A154B]" />
                  Add New User
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
                    <input 
                      type="text" 
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="e.g. jdoe"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                    <input 
                      type="password" 
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-[#4A154B] text-white font-bold rounded-lg hover:bg-[#350D36] transition-colors shadow-md"
                  >
                    Create User
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span>Current Users</span>
                </h3>
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 flex items-center">
                            {user.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-lg mr-3 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={cn("w-8 h-8 rounded-lg mr-3 flex items-center justify-center text-white font-bold", user.color)}>
                                {user.initial}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{user.name}</span>
                              <input 
                                type="text" 
                                placeholder="Avatar URL"
                                className="text-[10px] text-gray-400 bg-transparent border-none p-0 focus:ring-0 w-32"
                                defaultValue={user.avatar}
                                onBlur={(e) => onUpdateUser(user.id, { avatar: e.target.value || undefined })}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => onDeleteUser(user.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'workspaces' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Workspace Form */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <LayoutGrid className="w-5 h-5 mr-2 text-[#4A154B]" />
                  New Workspace
                </h3>
                <form onSubmit={handleCreateWorkspace} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workspace Name</label>
                    <input 
                      type="text" 
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="e.g. Engineering"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color</label>
                    <div className="grid grid-cols-4 gap-2">
                      {workspaceColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewWorkspaceColor(color)}
                          className={cn(
                            "w-full aspect-square rounded-lg border-2 transition-all",
                            color,
                            newWorkspaceColor === color ? "border-black scale-110" : "border-transparent"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-[#4A154B] text-white font-bold rounded-lg hover:bg-[#350D36] transition-colors shadow-md"
                  >
                    Create Workspace
                  </button>
                </form>
              </div>

              {/* Workspaces List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span>Active Workspaces ({workspaces.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaces.map(ws => (
                    <div key={ws.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                      <div className="flex items-center">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mr-3", ws.color)}>
                          {ws.initial}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{ws.name}</h4>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{(ws.members || []).length} members</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setManagingMembers({ type: 'workspace', id: ws.id })}
                          className="p-2 text-gray-400 hover:text-[#4A154B] hover:bg-purple-50 rounded-lg transition-all"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Channel Form */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <PlusCircle className="w-5 h-5 mr-2 text-[#4A154B]" />
                  New Channel
                </h3>
                <form onSubmit={handleCreateChannel} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channel Name</label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="e.g. marketing"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                    <div className="flex space-x-2">
                      <button 
                        type="button"
                        onClick={() => setNewChannelType('public')}
                        className={cn(
                          "flex-1 flex items-center justify-center py-2 rounded-lg border transition-all",
                          newChannelType === 'public' ? "bg-white border-[#4A154B] text-[#4A154B] shadow-sm" : "bg-gray-50 border-gray-200 text-gray-500"
                        )}
                      >
                        <Hash className="w-4 h-4 mr-2" />
                        Public
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewChannelType('private')}
                        className={cn(
                          "flex-1 flex items-center justify-center py-2 rounded-lg border transition-all",
                          newChannelType === 'private' ? "bg-white border-[#4A154B] text-[#4A154B] shadow-sm" : "bg-gray-50 border-gray-200 text-gray-500"
                        )}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Private
                      </button>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-[#4A154B] text-white font-bold rounded-lg hover:bg-[#350D36] transition-colors shadow-md"
                  >
                    Create Channel
                  </button>
                </form>
              </div>

              {/* Channels List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span>Active Channels ({channels.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {channels.map(channel => (
                    <div key={channel.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                      <div className="flex items-center">
                        <div className={cn(
                          "p-2 rounded-lg mr-3",
                          channel.type === 'private' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {channel.type === 'private' ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{channel.name}</h4>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{(channel.members || []).length} members</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setManagingMembers({ type: 'channel', id: channel.id })}
                          className="p-2 text-gray-400 hover:text-[#4A154B] hover:bg-purple-50 rounded-lg transition-all"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteChannel(channel.id)}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            Changes are saved instantly to the workspace
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
