export type ReportReason =
  | "inappropriate_content"
  | "spam"
  | "harassment"
  | "false_information"
  | "violence"
  | "hate_speech"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface Report {
  id: string;
  confession_id?: string | null;
  reply_id?: string | null;
  reporter_user_id: string;
  reason: ReportReason;
  additional_details?: string | null;
  status: ReportStatus;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface CreateReportRequest {
  confession_id?: string | null;
  reply_id?: string | null;
  reason: ReportReason;
  additional_details?: string | null;
}

export interface ReportState {
  reports: Report[];
  is_loading: boolean;
  error: string | null;

  // Actions
  create_report: (report: CreateReportRequest) => Promise<void>;
  get_user_reports: () => Promise<void>;
  clear_error: () => void;
}

// Human-readable labels for report reasons
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_content: "Inappropriate Content",
  spam: "Spam",
  harassment: "Harassment",
  false_information: "False Information",
  violence: "Violence",
  hate_speech: "Hate Speech",
  other: "Other",
};

// Descriptions for report reasons
export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
  inappropriate_content: "Content that violates community guidelines",
  spam: "Repetitive or promotional content",
  harassment: "Bullying or targeted harassment",
  false_information: "Misleading or false information",
  violence: "Content promoting or depicting violence",
  hate_speech: "Discriminatory or hateful language",
  other: "Other reason not listed above",
};

export interface ReportApiResponse {
  report: Report;
  success: boolean;
  message?: string;
}

export interface ReportApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface ReportListApiResponse {
  reports: Report[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}
