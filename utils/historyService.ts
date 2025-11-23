
import { SessionRecord, UserStats } from '../types';

const HISTORY_KEY = 'lingua_flow_history';

export class HistoryService {
  
  getHistory(): SessionRecord[] {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse history", e);
      return [];
    }
  }

  saveSession(record: SessionRecord) {
    const history = this.getHistory();
    history.unshift(record); // Add to top
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  getStats(): UserStats {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return { streakDays: 0, totalMinutes: 0, averageScore: 0, sessionsCompleted: 0 };
    }

    // Calculate Total Minutes
    const totalSeconds = history.reduce((acc, curr) => acc + curr.durationSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Calculate Average Score
    const totalScore = history.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = Math.round(totalScore / history.length);

    // Calculate Streak
    // Sort by date descending just in case
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    if (sortedHistory.length > 0) {
      const today = new Date().setHours(0,0,0,0);
      const lastSessionDate = new Date(sortedHistory[0].date).setHours(0,0,0,0);

      // If last session was today or yesterday, streak is alive
      if (today === lastSessionDate || today - lastSessionDate === 86400000) {
        streak = 1;
        let currentDateToCheck = lastSessionDate;

        // Check backwards
        for (let i = 1; i < sortedHistory.length; i++) {
          const sessionDate = new Date(sortedHistory[i].date).setHours(0,0,0,0);
          if (sessionDate === currentDateToCheck) {
            continue; // Multiple sessions same day
          } else if (currentDateToCheck - sessionDate === 86400000) {
            streak++;
            currentDateToCheck = sessionDate;
          } else {
            break; // Streak broken
          }
        }
      }
    }

    return {
      streakDays: streak,
      totalMinutes,
      averageScore,
      sessionsCompleted: history.length
    };
  }
}

export const historyService = new HistoryService();
