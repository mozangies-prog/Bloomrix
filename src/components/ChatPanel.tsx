import React, { useState, useRef, useEffect } from 'react';
import { User, Channel, Message, TypingStatus } from '../types';
import { cn } from '../lib/utils';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Info, 
  Search, 
  Hash, 
  Lock, 
  User as UserIcon,
  Image as ImageIcon,
  FileText,
  X,
  Phone,
  Video,
  Bell,
  MoreVertical,
  AtSign,
  Mic,
  Type,
  Plus,
  ChevronDown,
  MessageSquare,
  Files,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ChatPanelProps {
  currentUser: User;
  users: User[];
  activeChannel?: Channel;
  activeDMUser?: User;
  messages: Message[];
  typingUsers: string[];
  onSendMessage: (content: string, file?: { url: string, name: string }) => void;
  onTyping: (isTyping: boolean) => void;
  onSearch: (query: string) => void;
  onToggleStar: (type: 'channel' | 'dm', id: string) => void;
}

export default function ChatPanel({
  currentUser,
  users,
  activeChannel,
  activeDMUser,
  messages,
  typingUsers,
  onSendMessage,
  onTyping,
  onSearch,
  onToggleStar
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ url: string, name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStarred = activeChannel 
    ? currentUser.starredChannels?.includes(activeChannel.id)
    : activeDMUser 
      ? currentUser.starredDMs?.includes(activeDMUser.id)
      : false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim() || uploadPreview) {
      onSendMessage(input, uploadPreview || undefined);
      setInput('');
      setUploadPreview(null);
      onTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setUploadPreview({ url: data.url, name: data.name });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const title = activeChannel ? activeChannel.name : activeDMUser?.name;
  const icon = activeChannel ? (activeChannel.type === 'private' ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />) : <UserIcon className="w-4 h-4" />;

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="h-12 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded">
              <div className="text-gray-500">{icon}</div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            <button 
              onClick={() => {
                if (activeChannel) onToggleStar('channel', activeChannel.id);
                else if (activeDMUser) onToggleStar('dm', activeDMUser.id);
              }}
              className={cn(
                "p-1 rounded hover:bg-gray-100 transition-colors",
                isStarred ? "text-yellow-500" : "text-gray-400"
              )}
            >
              <Star className={cn("w-4 h-4", isStarred && "fill-current")} />
            </button>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-4 flex items-center space-x-6 text-sm font-medium text-gray-500 pb-1">
          <button className="flex items-center space-x-2 border-b-2 border-[#1164A3] text-gray-900 pb-2">
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-gray-900 pb-2 border-b-2 border-transparent">
            <Files className="w-4 h-4" />
            <span>Files</span>
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
        <div className="flex flex-col justify-end min-h-full py-4">
          {filteredMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="p-6 bg-gray-50 rounded-full">
                {icon}
              </div>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const showAvatar = idx === 0 || filteredMessages[idx - 1].senderId !== msg.senderId;
              const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
              const prevMsgDate = filteredMessages[idx-1]?.timestamp?.toDate ? filteredMessages[idx-1].timestamp.toDate() : null;
              const showDateHeader = idx === 0 || (prevMsgDate && format(prevMsgDate, 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd'));

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <div className="flex items-center my-6 px-4">
                      <div className="flex-1 h-[1px] bg-gray-200" />
                      <div className="mx-4 px-3 py-1 border border-gray-200 rounded-full text-xs font-bold text-gray-500 bg-white shadow-sm">
                        {format(msgDate, 'EEEE, MMMM do')}
                        <ChevronDown className="w-3 h-3 inline ml-1" />
                      </div>
                      <div className="flex-1 h-[1px] bg-gray-200" />
                    </div>
                  )}
                  <div className={cn(
                    "flex px-4 py-1 hover:bg-gray-50 group transition-colors",
                    showAvatar ? "mt-2" : "mt-0"
                  )}>
                    <div className="w-10 mr-3 flex-shrink-0">
                      {showAvatar ? (
                        <div className="w-10 h-10 rounded overflow-hidden">
                          {users.find(u => u.id === msg.senderId)?.avatar ? (
                            <img 
                              src={users.find(u => u.id === msg.senderId)?.avatar} 
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={cn("w-full h-full flex items-center justify-center text-white font-bold", users.find(u => u.id === msg.senderId)?.color || 'bg-gray-400')}>
                              {users.find(u => u.id === msg.senderId)?.initial || '?'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 text-right pr-2 pt-1">
                          {format(msgDate, 'h:mm')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline space-x-2 mb-0.5">
                          <span className="font-black text-gray-900 hover:underline cursor-pointer">
                            {msg.senderId === currentUser.id ? 'You' : (users.find(u => u.id === msg.senderId)?.name || `User ${msg.senderId.slice(0, 4)}`)}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {format(msgDate, 'h:mm a')}
                          </span>
                        </div>
                      )}
                      <div className="text-[15px] text-gray-800 break-words leading-normal">
                        {msg.content}
                      </div>
                      {msg.fileUrl && (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center max-w-sm group/file">
                          {msg.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <div className="relative">
                              <img 
                                src={msg.fileUrl} 
                                alt={msg.fileName} 
                                className="max-h-60 rounded border border-gray-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded mr-3 text-blue-600">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{msg.fileName}</span>
                                <a href={msg.fileUrl} download className="text-xs text-blue-600 hover:underline">Download</a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="border border-gray-300 rounded-lg focus-within:border-gray-500 transition-colors overflow-hidden">
          <AnimatePresence>
            {uploadPreview && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center text-sm text-gray-600">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  <span className="truncate max-w-xs">{uploadPreview.name}</span>
                </div>
                <button onClick={() => setUploadPreview(null)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 pt-3 pb-1">
            <textarea 
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${title}`}
              className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[40px] text-[15px] text-gray-800 p-0"
              rows={1}
            />
          </div>
          
          <div className="px-2 py-1 flex items-center justify-between">
            <div className="flex items-center space-x-0.5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                disabled={isUploading}
              >
                <Plus className={cn("w-4 h-4", isUploading && "animate-pulse")} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <Type className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <Smile className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <AtSign className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                <FileText className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleSend}
                disabled={!input.trim() && !uploadPreview}
                className={cn(
                  "p-1.5 rounded transition-all",
                  (input.trim() || uploadPreview) ? "bg-[#007A5A] text-white hover:bg-[#005A44]" : "text-gray-300 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-1 h-4">
          {typingUsers.length > 0 && (
            <div className="text-[11px] text-gray-500 italic">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
