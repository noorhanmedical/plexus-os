import type { Conversation, Message } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

const conversationsStore: Map<number, Conversation> = new Map();
const messagesStore: Map<number, Message[]> = new Map();
let conversationIdCounter = 1;
let messageIdCounter = 1;

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    return conversationsStore.get(id);
  },

  async getAllConversations() {
    return Array.from(conversationsStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async createConversation(title: string) {
    const conversation: Conversation = {
      id: conversationIdCounter++,
      title,
      createdAt: new Date(),
    };
    conversationsStore.set(conversation.id, conversation);
    messagesStore.set(conversation.id, []);
    return conversation;
  },

  async deleteConversation(id: number) {
    conversationsStore.delete(id);
    messagesStore.delete(id);
  },

  async getMessagesByConversation(conversationId: number) {
    return messagesStore.get(conversationId) ?? [];
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const message: Message = {
      id: messageIdCounter++,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    const messages = messagesStore.get(conversationId) ?? [];
    messages.push(message);
    messagesStore.set(conversationId, messages);
    return message;
  },
};
