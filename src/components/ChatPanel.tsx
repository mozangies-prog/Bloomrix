import React, { useState, useRef, useEffect } from 'react';
import { User, Channel, Message, TypingStatus } from '../types';
import { cn } from '../lib/utils';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Hash, 
  Lock, 
  User as UserIcon,
  Image as ImageIcon,
  X,
  AtSign,
  Mic,
  Type,
  Plus,
  ChevronDown,
  MessageSquare,
  Reply,
  MoreHorizontal,
  StopCircle,
  Play,
  Pause,
  Download,
  File as FileIcon,
  Menu
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
  onSendMessage: (content: string, files?: { url: string, name: string, type: string }[], threadId?: string, isVoiceNote?: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  onSearch: (query: string) => void;
  onToggleStar: (type: 'channel' | 'dm', id: string) => void;
  onToggleSidebar?: () => void;
}

export default function ChatPanel({
  currentUser,
  users,
  activeChannel,
  activeDMUser,
  messages,
  typingUsers,
  onSendMessage,
  onReact,
  onTyping,
  onSearch,
  onToggleStar,
  onToggleSidebar
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviews, setUploadPreviews] = useState<{ url: string, name: string, type: string }[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(-1);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSend = (threadId?: string) => {
    if (input.trim() || uploadPreviews.length > 0) {
      onSendMessage(input, uploadPreviews.length > 0 ? uploadPreviews : undefined, threadId);
      setInput('');
      setUploadPreviews([]);
      onTyping(false);
      setMentionSearch(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    onTyping(value.length > 0);

    const lastAtPos = value.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || value[lastAtPos - 1] === ' ')) {
      const search = value.slice(lastAtPos + 1);
      if (!search.includes(' ')) {
        setMentionSearch(search);
        setMentionIndex(lastAtPos);
      } else {
        setMentionSearch(null);
      }
    } else {
      setMentionSearch(null);
    }
  };

  const handleMentionSelect = (user: User) => {
    if (mentionIndex !== -1) {
      const before = input.slice(0, mentionIndex);
      const after = input.slice(mentionIndex + mentionSearch!.length + 1);
      setInput(`${before}@${user.name} ${after}`);
      setMentionSearch(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    const newPreviews: { url: string, name: string, type: string }[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        newPreviews.push({ url: data.url, name: data.name || file.name, type: file.type });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadPreviews(prev => [...prev, ...newPreviews]);
    setIsUploading(false);
    if (e.target) e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          onSendMessage('Voice Note', [{ url: data.url, name: data.name, type: 'audio/webm' }], undefined, true);
        } catch (error) {
          console.error('Voice note upload failed:', error);
        } finally {
          setIsUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Could not start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMessages = messages.filter(m => 
    !m.threadId && m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const threadMessages = messages.filter(m => m.threadId === activeThreadId);
  const parentMessage = messages.find(m => m.id === activeThreadId);

  const title = activeChannel ? activeChannel.name : activeDMUser?.name;
  const icon = activeChannel ? (activeChannel.type === 'private' ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />) : <UserIcon className="w-4 h-4" />;

  return (
    <div className="flex-1 flex bg-white h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <div className="h-12 px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              {onToggleSidebar && (
                <button 
                  onClick={onToggleSidebar}
                  className="md:hidden p-1.5 hover:bg-gray-100 rounded text-gray-500 flex-shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <button className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded min-w-0">
                <div className="text-gray-500 flex-shrink-0">{icon}</div>
                <h2 className="text-base font-bold text-gray-900 truncate">{title}</h2>
                {activeDMUser && (
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", activeDMUser.is_online ? "bg-green-500" : "bg-gray-500")} />
                )}
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>
            </div>
            <div className="flex items-center space-x-1">
            </div>
          </div>
          <div className="px-4 flex items-center space-x-6 text-sm font-medium text-gray-500 pb-1">
            <button className="flex items-center space-x-2 border-b-2 border-[#1164A3] text-gray-900 pb-2">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
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
                const parseTimestamp = (ts: any) => {
                  if (!ts) return new Date();
                  if (typeof ts.toDate === 'function') return ts.toDate();
                  if (ts.seconds) return new Date(ts.seconds * 1000);
                  const d = new Date(ts);
                  return isNaN(d.getTime()) ? new Date() : d;
                };

                const showAvatar = idx === 0 || filteredMessages[idx - 1].senderId !== msg.senderId;
                const msgDate = parseTimestamp(msg.timestamp);
                const prevMsgDate = idx > 0 ? parseTimestamp(filteredMessages[idx-1].timestamp) : null;
                const showDateHeader = idx === 0 || (prevMsgDate && format(prevMsgDate, 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd'));

                return (
                  <MessageItem 
                    key={msg.id}
                    msg={msg}
                    showAvatar={showAvatar}
                    showDateHeader={showDateHeader}
                    msgDate={msgDate}
                    users={users}
                    currentUser={currentUser}
                    onReply={() => setActiveThreadId(msg.id)}
                    onReact={(emoji) => onReact(msg.id, emoji)}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="border border-gray-300 rounded-lg focus-within:border-gray-500 transition-colors overflow-hidden relative">
            {mentionSearch !== null && (
              <div className="absolute bottom-full left-0 w-64 bg-white border border-gray-200 rounded-t-lg shadow-xl mb-1 overflow-hidden z-20">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                  Mention someone
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {users
                    .filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                    .map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleMentionSelect(user)}
                          className="w-full px-3 py-2 flex items-center hover:bg-gray-100 text-left"
                        >
                          {user.avatar ? (
                            <img src={user.avatar} className="w-6 h-6 rounded mr-2" />
                          ) : user.gender ? (
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.gender === 'male' ? 'Felix' : 'Aneka'}`} 
                              className="w-6 h-6 rounded mr-2 bg-gray-200" 
                            />
                          ) : (
                            <div className={cn("w-6 h-6 rounded mr-2 flex items-center justify-center text-[10px] text-white font-bold", user.color)}>
                              {user.initial}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </button>
                    ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {uploadPreviews.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2"
                >
                  {uploadPreviews.map((preview, i) => (
                    <div key={i} className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[100px]">{preview.name}</span>
                      <button onClick={() => setUploadPreviews(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 p-0.5 hover:bg-gray-100 rounded">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-4 pt-3 pb-1">
              <textarea 
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
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
                  multiple
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
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={cn(
                    "p-2 rounded transition-colors",
                    isRecording ? "bg-red-50 text-red-600" : "hover:bg-gray-100 text-gray-500"
                  )}
                >
                  {isRecording ? <StopCircle className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </button>
                {isRecording && (
                  <span className="text-xs font-mono text-red-600 ml-2">{formatTime(recordingTime)}</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() && uploadPreviews.length === 0}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    (input.trim() || uploadPreviews.length > 0) ? "bg-[#007A5A] text-white hover:bg-[#005A44]" : "text-gray-300 cursor-not-allowed"
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

      {/* Thread Sidebar */}
      <AnimatePresence>
        {activeThreadId && parentMessage && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: window.innerWidth < 768 ? '100%' : 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "border-l border-gray-200 bg-white flex flex-col z-30",
              window.innerWidth < 768 ? "fixed inset-0" : "relative"
            )}
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">Thread</h2>
              <button onClick={() => setActiveThreadId(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(() => {
                const parseTimestamp = (ts: any) => {
                  if (!ts) return new Date();
                  if (typeof ts.toDate === 'function') return ts.toDate();
                  if (ts.seconds) return new Date(ts.seconds * 1000);
                  const d = new Date(ts);
                  return isNaN(d.getTime()) ? new Date() : d;
                };
                
                return (
                  <MessageItem 
                    msg={parentMessage}
                    showAvatar={true}
                    showDateHeader={false}
                    msgDate={parseTimestamp(parentMessage.timestamp)}
                    users={users}
                    currentUser={currentUser}
                    isThreadParent={true}
                  />
                );
              })()}
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-[1px] bg-gray-200" />
                <span className="text-xs text-gray-500 font-medium">{threadMessages.length} replies</span>
                <div className="flex-1 h-[1px] bg-gray-200" />
              </div>
              {threadMessages.map((msg, idx) => {
                const parseTimestamp = (ts: any) => {
                  if (!ts) return new Date();
                  if (typeof ts.toDate === 'function') return ts.toDate();
                  if (ts.seconds) return new Date(ts.seconds * 1000);
                  const d = new Date(ts);
                  return isNaN(d.getTime()) ? new Date() : d;
                };

                return (
                  <MessageItem 
                    key={msg.id}
                    msg={msg}
                    showAvatar={idx === 0 || threadMessages[idx - 1].senderId !== msg.senderId}
                    showDateHeader={false}
                    msgDate={parseTimestamp(msg.timestamp)}
                    users={users}
                    currentUser={currentUser}
                  />
                );
              })}
              <div ref={threadEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="border border-gray-300 rounded-lg focus-within:border-gray-500 transition-colors overflow-hidden">
                <div className="px-4 py-2">
                  <textarea 
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(activeThreadId);
                      }
                    }}
                    placeholder="Reply..."
                    className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[40px] text-[15px] text-gray-800 p-0"
                    rows={1}
                  />
                </div>
                <div className="px-2 py-1 flex items-center justify-end">
                  <button 
                    onClick={() => handleSend(activeThreadId)}
                    disabled={!input.trim()}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      input.trim() ? "bg-[#007A5A] text-white hover:bg-[#005A44]" : "text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MessageItemProps {
  key?: string | number;
  msg: Message;
  showAvatar: boolean;
  showDateHeader: boolean;
  msgDate: Date;
  users: User[];
  currentUser: User;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  isThreadParent?: boolean;
}

function MessageItem({ 
  msg, 
  showAvatar, 
  showDateHeader, 
  msgDate, 
  users, 
  currentUser, 
  onReply, 
  onReact,
  isThreadParent
}: MessageItemProps) {
  const sender = users.find(u => u.id === msg.senderId);
  
  return (
    <React.Fragment>
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
        "flex px-4 py-1 hover:bg-gray-50 group transition-colors relative",
        showAvatar ? "mt-2" : "mt-0",
        isThreadParent && "bg-gray-50"
      )}>
        <div className="w-10 mr-3 flex-shrink-0">
          {showAvatar ? (
            <div className="w-10 h-10 rounded overflow-hidden relative">
              {sender?.avatar ? (
                <img 
                  src={sender.avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : sender?.gender ? (
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.gender === 'male' ? 'Felix' : 'Aneka'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover bg-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center text-white font-bold", sender?.color || 'bg-gray-400')}>
                  {sender?.initial || '?'}
                </div>
              )}
              {sender?.is_online && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
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
                {msg.senderId === currentUser.id ? 'You' : (sender?.name || `User ${msg.senderId.slice(0, 4)}`)}
              </span>
              <span className="text-[11px] text-gray-500">
                {format(msgDate, 'h:mm a')}
              </span>
            </div>
          )}
          <div className="text-[15px] text-gray-800 break-words leading-normal">
            {msg.content}
          </div>
          
          {msg.files && msg.files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.files.map((file, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center max-w-sm group/file">
                  {file.type.startsWith('image/') ? (
                    <div className="relative">
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="max-h-60 rounded border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : file.type.startsWith('audio/') ? (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded text-purple-600">
                        <Mic className="w-6 h-6" />
                      </div>
                      <audio src={file.url} controls className="h-8 w-48" />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded mr-3 text-blue-600">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</span>
                        <a href={file.url} download className="text-xs text-blue-600 hover:underline flex items-center">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {msg.reactions && Object.values(msg.reactions).some(userIds => userIds.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                if (userIds.length === 0) return null;
                return (
                  <button
                    key={emoji}
                    onClick={() => onReact?.(emoji)}
                    className={cn(
                      "px-1.5 py-0.5 rounded-full border text-xs flex items-center space-x-1 transition-all",
                      userIds.includes(currentUser.id) ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="font-bold">{userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {(msg.replyCount ?? 0) > 0 && !isThreadParent && (
            <button 
              onClick={onReply}
              className="mt-1 flex items-center space-x-2 text-xs font-bold text-blue-600 hover:underline"
            >
              <div className="flex -space-x-1">
                {/* Mock avatars for replies */}
                <div className="w-4 h-4 rounded bg-gray-200 border border-white" />
                <div className="w-4 h-4 rounded bg-gray-300 border border-white" />
              </div>
              <span>{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>

        {/* Message Actions */}
        <div className="absolute right-4 top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-lg shadow-sm flex items-center overflow-hidden z-10">
          <button 
            onClick={() => onReact?.('👍')}
            className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            👍
          </button>
          <button 
            onClick={() => onReact?.('❤️')}
            className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            ❤️
          </button>
          <button 
            onClick={() => onReact?.('🔥')}
            className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            🔥
          </button>
          <div className="w-[1px] h-4 bg-gray-200 mx-0.5" />
          <button 
            onClick={onReply}
            className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Reply className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}
