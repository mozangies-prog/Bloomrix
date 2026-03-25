import React from 'react';
import { User, Message, Channel, Workspace } from '../types';
import { format } from 'date-fns';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface DMsViewProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  onSelectDM: (id: string) => void;
  activeDMUserId: string | null;
}

export default function DMsView({
  currentUser,
  users,
  messages,
  activeWorkspaceId,
  workspaces,
  onSelectDM,
  activeDMUserId
}: DMsViewProps) {
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Filter other users by workspace membership
  const otherUsers = users.filter(u => 
    u.id !== currentUser.id && 
    activeWorkspace?.members?.includes(u.id)
  );

  // Get last message for each user
  const userLastMessages = otherUsers.map(user => {
    const lastMsg = messages
      .filter(msg => !msg.channelId && (
        (msg.senderId === currentUser.id && msg.receiverId === user.id) ||
        (msg.senderId === user.id && msg.receiverId === currentUser.id)
      ))
      .sort((a, b) => {
        const aDate = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const bDate = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return bDate - aDate;
      })[0];
    
    return { user, lastMsg };
  }).sort((a, b) => {
    const aDate = a.lastMsg?.timestamp?.toDate ? a.lastMsg.timestamp.toDate().getTime() : 0;
    const bDate = b.lastMsg?.timestamp?.toDate ? b.lastMsg.timestamp.toDate().getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="h-12 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
        <h2 className="font-bold text-lg">Direct Messages</h2>
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search direct messages"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1164A3] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {userLastMessages.map(({ user, lastMsg }) => {
          const date = lastMsg?.timestamp?.toDate ? lastMsg.timestamp.toDate() : null;

          return (
            <div 
              key={user.id}
              onClick={() => onSelectDM(user.id)}
              className={cn(
                "p-4 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50",
                activeDMUserId === user.id && "bg-gray-50 border-l-4 border-[#1164A3]"
              )}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={cn("w-full h-full flex items-center justify-center text-white font-bold text-lg", user.color)}>
                      {user.initial}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900">{user.name}</span>
                  {date && <span className="text-[11px] text-gray-400">{format(date, 'MMM d')}</span>}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {lastMsg ? (
                    <>
                      {lastMsg.senderId === currentUser.id ? 'You: ' : ''}
                      {lastMsg.content}
                    </>
                  ) : (
                    'No messages yet'
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
