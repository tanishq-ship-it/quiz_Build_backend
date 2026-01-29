export interface WebQuizDto {
  id: string;
  quizId: string;
  isActive: boolean;
  setBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetWebQuizRequestBody {
  quizId: string;
}

export interface WebQuizWithQuizDto {
  id: string;
  quizId: string;
  isActive: boolean;
  setBy: string;
  createdAt: string;
  updatedAt: string;
  quiz: {
    id: string;
    title: string;
    content: any;
    live: boolean;
  } | null;
}
