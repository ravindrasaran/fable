export interface Story {
  title: string;
  content: string;
  moral: string;
  category: string;
}

export interface User {
  name: string;
  avatar?: string;
  streak?: number;
  storiesRead?: number;
  readStories?: string[];
  wisdomXp?: number;
  unlockedBadges?: string[];
  preferences?: {
    immersiveAudio: boolean;
    dailyReminders: boolean;
  };
  lastReadDate?: string;
}

export type Language = 'en' | 'hi';
