// Quiz HTTP-level interfaces

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateQuizRequestBody { title: string; content?: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QuizDto { id: string; title: string; content: any; live: boolean; createdAt: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AppendScreensRequestBody { screens: any[] }



