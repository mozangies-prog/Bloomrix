export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  initial: string;
  role: UserRole;
  gender?: 'male' | 'female';
  is_online?: boolean;
  last_seen?: string;
  workspaces?: string[]; // IDs of workspaces the user is a member of
  starredChannels?: string[];
  starredDMs?: string[];
}

export type ChannelType = 'public' | 'private';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  initial: string;
  members: string[]; // User IDs
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  createdBy: string;
  members: string[]; // User IDs
  workspaceId: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  channelId?: string;
  receiverId?: string;
  timestamp: string;
  files?: {
    url: string;
    name: string;
    type: string;
  }[];
  threadId?: string;
  replyCount?: number;
  reactions?: {
    [emoji: string]: string[]; // Array of user IDs
  };
  mentions?: string[]; // Array of user IDs
  isVoiceNote?: boolean;
}

export interface TypingStatus {
  userId: string;
  isTyping: boolean;
  channelId?: string;
  receiverId?: string;
}
