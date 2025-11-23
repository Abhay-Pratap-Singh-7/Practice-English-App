
import { UserIdentity } from '../types';

const USER_KEY = 'lingua_flow_identity';

export class UserService {
  
  getIdentity(): UserIdentity {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      name: 'Guest Learner',
      bio: 'Aspiring fluent speaker',
      level: 'Intermediate',
    };
  }

  saveIdentity(identity: UserIdentity) {
    localStorage.setItem(USER_KEY, JSON.stringify(identity));
  }

  updateName(name: string) {
    const current = this.getIdentity();
    this.saveIdentity({ ...current, name });
  }
  
  updateBio(bio: string) {
    const current = this.getIdentity();
    this.saveIdentity({ ...current, bio });
  }
}

export const userService = new UserService();
