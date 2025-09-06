export type ReportReason = 
  | 'inappropriate_content'
  | 'spam'
  | 'harassment'
  | 'false_information'
  | 'violence'
  | 'hate_speech'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  confessionId?: string;
  replyId?: string;
  reporterUserId: string;
  reason: ReportReason;
  additionalDetails?: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CreateReportRequest {
  confessionId?: string;
  replyId?: string;
  reason: ReportReason;
  additionalDetails?: string;
}

export interface ReportState {
  reports: Report[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createReport: (report: CreateReportRequest) => Promise<void>;
  getUserReports: () => Promise<void>;
  clearError: () => void;
}

// Human-readable labels for report reasons
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_content: 'Inappropriate Content',
  spam: 'Spam',
  harassment: 'Harassment',
  false_information: 'False Information',
  violence: 'Violence',
  hate_speech: 'Hate Speech',
  other: 'Other'
};

// Descriptions for report reasons
export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
  inappropriate_content: 'Content that violates community guidelines',
  spam: 'Repetitive or promotional content',
  harassment: 'Bullying or targeted harassment',
  false_information: 'Misleading or false information',
  violence: 'Content promoting or depicting violence',
  hate_speech: 'Discriminatory or hateful language',
  other: 'Other reason not listed above'
};
