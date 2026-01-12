// Storage interface for Plexus Clinical Dashboard
// Note: This app uses an external API (Plexus) for data storage
// The storage interface is kept minimal as all data operations go through the API

export interface IStorage {
  // Placeholder interface - all data operations use the Plexus API
}

export class MemStorage implements IStorage {
  constructor() {
    // No local storage needed - using external Plexus API
  }
}

export const storage = new MemStorage();
