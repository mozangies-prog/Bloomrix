import React from 'react';
import { User, Message, Channel, Workspace } from '../types';
import { format } from 'date-fns';
import { MessageSquare, AtSign, Star, Hash } from 'lucide-react';
import { cn } from '../lib/utils';

interface ActivityViewProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  channels: Channel[];
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  onSelectChannel: (id: string) => void;
  onSelectDM: (id: string) => void;
}

export default function ActivityView({
  currentUser,
  users,
  messages,
  channels,
  activeWorkspaceId,
  workspaces,
  onSelectChannel,
  onSelectDM
}: ActivityViewProps) {
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const parseTimestamp = (ts: any) => {
    if (!ts) return new Date();
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Filter messages where user is mentioned or it's a DM to them, and it's in the current workspace
  const activity = messages
    .filter(msg => {
      const isMentioned = msg.content.includes(`@${currentUser.name}`);
      const isDM = !msg.channelId && msg.receiverId === currentUser.id;
      
      // Check if the message belongs to the current workspace
      if (msg.channelId) {
        const channel = channels.find(c => c.id === msg.channelId);
        if (channel?.workspaceId !== activeWorkspaceId) return false;
      } else if (msg.receiverId) {
        // For DMs, check if the sender is in the current workspace
        if (!activeWorkspace?.members?.includes(msg.senderId)) return false;
      }

      return isMentioned || isDM;
    })
    .sort((a, b) => {
      const aDate = parseTimestamp(a.timestamp).getTime();
      const bDate = parseTimestamp(b.timestamp).getTime();
      return bDate - aDate;
    });

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="h-12 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
        <h2 className="font-bold text-lg">Activity</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <AtSign className="w-12 h-12 opacity-20" />
            <p>No mentions or direct messages yet.</p>
          </div>
        ) : (
          activity.map(msg => {
            const sender = users.find(u => u.id === msg.senderId);
            const channel = channels.find(c => c.id === msg.channelId);
            const date = parseTimestamp(msg.timestamp);

            return (
              <div 
                key={msg.id}
                onClick={() => msg.channelId ? onSelectChannel(msg.channelId) : onSelectDM(msg.senderId)}
                className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded overflow-hidden shrink-0">
                    {sender?.avatar ? (
                      <img src={sender.avatar} alt={sender.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : sender?.gender ? (
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.gender === 'male' ? 'Felix' : 'Aneka'}`} 
                        alt={sender.name} 
                        className="w-full h-full object-cover bg-gray-200" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className={cn("w-full h-full flex items-center justify-center text-white font-bold text-xs", sender?.color || 'bg-gray-400')}>
                        {sender?.initial || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{sender?.name}</span>
                      <span className="text-[11px] text-gray-400">{format(date, 'MMM d, h:mm a')}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 flex items-center">
                      {msg.channelId ? (
                        <>
                          <Hash className="w-3 h-3 mr-1" />
                          <span>{channel?.name}</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3 h-3 mr-1" />
                          <span>Direct Message</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
