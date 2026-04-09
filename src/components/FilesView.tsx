import React from 'react';
import { User, Message, Channel, Workspace } from '../types';
import { format } from 'date-fns';
import { FileText, Download, Hash, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilesViewProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  channels: Channel[];
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  onSelectChannel: (id: string) => void;
  onSelectDM: (id: string) => void;
}

export default function FilesView({
  currentUser,
  users,
  messages,
  channels,
  activeWorkspaceId,
  workspaces,
  onSelectChannel,
  onSelectDM
}: FilesViewProps) {
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const parseTimestamp = (ts: any) => {
    if (!ts) return new Date();
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Filter messages with files and in the current workspace
  const files = messages
    .filter(msg => {
      if (!msg.files || msg.files.length === 0) return false;

      // Check if the message belongs to the current workspace
      if (msg.channelId) {
        const channel = channels.find(c => c.id === msg.channelId);
        if (channel?.workspaceId !== activeWorkspaceId) return false;
      } else if (msg.receiverId) {
        // For DMs, check if the sender is in the current workspace
        if (!activeWorkspace?.members?.includes(msg.senderId)) return false;
      }

      return true;
    })
    .flatMap(msg => msg.files!.map(file => ({ ...file, msg }))) // Flatten to show each file
    .sort((a, b) => {
      const aDate = parseTimestamp(a.msg.timestamp).getTime();
      const bDate = parseTimestamp(b.msg.timestamp).getTime();
      return bDate - aDate;
    });

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="h-12 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
        <h2 className="font-bold text-lg">Files</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <FileText className="w-12 h-12 opacity-20" />
            <p>No files shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file, idx) => {
              const msg = file.msg;
              const sender = users.find(u => u.id === msg.senderId);
              const channel = channels.find(c => c.id === msg.channelId);
              const date = parseTimestamp(msg.timestamp);

              return (
                <div 
                  key={`${msg.id}-${idx}`}
                  className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group relative"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{file.name || 'Untitled File'}</p>
                      <p className="text-[11px] text-gray-500">{format(date, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-5 h-5 rounded overflow-hidden shrink-0">
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
                        <div className={cn("w-full h-full flex items-center justify-center text-white font-bold text-[8px]", sender?.color || 'bg-gray-400')}>
                          {sender?.initial || '?'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{sender?.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[10px] text-gray-400">
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
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
