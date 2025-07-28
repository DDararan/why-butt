export interface EditingUser {
  sessionId: string;
  staffId: string;
  userName: string;
  loginId?: string;
  startTime: Date;
  color?: string;
}

export interface EditingSession {
  pageId: number;
  users: EditingUser[];
}

class EditingSessionService {
  private currentSession: EditingSession | null = null;
  private sessionUpdateCallbacks: ((users: EditingUser[]) => void)[] = [];

  public startSession(pageId: number, user: EditingUser): void {
    this.currentSession = {
      pageId,
      users: [user]
    };
    this.notifySessionUpdate();
  }

  public endSession(): void {
    this.currentSession = null;
    this.notifySessionUpdate();
  }

  public addUser(user: EditingUser): void {
    if (!this.currentSession) return;
    
    const existingUser = this.currentSession.users.find(u => u.staffId === user.staffId);
    if (!existingUser) {
      this.currentSession.users.push(user);
      this.notifySessionUpdate();
    }
  }

  public removeUser(staffId: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.users = this.currentSession.users.filter(u => u.staffId !== staffId);
    this.notifySessionUpdate();
  }

  public getCurrentUsers(): EditingUser[] {
    return this.currentSession?.users || [];
  }

  public onSessionUpdate(callback: (users: EditingUser[]) => void): void {
    this.sessionUpdateCallbacks.push(callback);
  }

  private notifySessionUpdate(): void {
    const users = this.getCurrentUsers();
    this.sessionUpdateCallbacks.forEach(callback => callback(users));
  }
}

export const editingSessionService = new EditingSessionService();