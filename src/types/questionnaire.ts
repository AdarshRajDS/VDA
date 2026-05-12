export interface BilingualString {
  en: string;
  de?: string;
}

export interface QuestionnaireQuestion {
  questionId: string;
  globalQuestionCounter: number;
  questionNumber: string;
  processElement: string;
  sectionHeadingFromReport: string;
  assessmentContext: string | null;
  isStarQuestion: boolean;
  title: BilingualString;
  reportTitleLine?: BilingualString;
  minimumRequirements: BilingualString[];
  implementationExamples: BilingualString[];
  allowedScores: number[];
}

export interface QuestionnaireFile {
  schemaVersion: string;
  standard: {
    name: string;
    edition: string;
    year: number;
    sourceDocument?: string;
  };
  questionCount: number;
  questions: QuestionnaireQuestion[];
}
