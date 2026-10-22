export type SavingsGoal = {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
  saved_amount: number;
  remaining_amount: number;
  progress_percent: number;
  target_reached: boolean;
};

export type Contribution = {
  id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type SavingsGoalDetail = SavingsGoal & { contributions: Contribution[] };

export type SavingsGoalsResponse = {
  goals: SavingsGoal[];
  summary: {
    total_goals: number;
    completed_goals: number;
    total_saved: number;
    total_target: number;
  };
};
