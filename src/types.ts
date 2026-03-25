export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string;
  avatar?: string;
  color: string;
  initial: string;
  role: UserRole;
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
  timestamp: any; // Firestore Timestamp
  fileUrl?: string;
  fileName?: string;
  threadId?: string;
}

export interface TypingStatus {
  userId: string;
  isTyping: boolean;
  channelId?: string;
  receiverId?: string;
}
