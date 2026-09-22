// Types for the public-website data that now lives in the CRM API.
// These collections are shared with the marketing site (silifton.com):
// the site reads them anonymously, the CRM edits them.

export type ContentCollection =
  | "services"
  | "portfolio"
  | "posts"
  | "team"
  | "testimonials"
  | "careers";

export const CONTENT_COLLECTIONS: readonly ContentCollection[] = [
  "services",
  "portfolio",
  "posts",
  "team",
  "testimonials",
  "careers",
] as const;

// Content items are schemaless apart from the `id` key; the admin UI decides
// which fields each collection carries.
export interface ContentDoc {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

export type InquiryStatus = "New" | "In review" | "Replied" | "Won" | "Closed";
export type InquiryPriority = "Low" | "Medium" | "High" | "Critical";

export interface Inquiry {
  id: string; // INQ-2419
  name: string;
  company: string;
  email: string;
  subject: string;
  budget: string;
  message: string;
  date: string; // ISO
  status: InquiryStatus;
  priority: InquiryPriority;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApplicationStage =
  | "New"
  | "Tech screen"
  | "Portfolio review"
  | "Hiring manager"
  | "Onsite"
  | "Offer"
  | "Hired"
  | "Rejected";

export interface Application {
  id: string; // APP-1043
  candidate: string;
  email: string;
  role: string;
  stage: ApplicationStage;
  score: number;
  date: string; // YYYY-MM-DD
  source: string;
  linkedin?: string;
  portfolio?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PageView {
  path: string;
  referrer: string;
  source: string; // Direct | Search | Social | Referrals
  day: string; // YYYY-MM-DD
  ua: string;
  visitor: string; // hashed ip+ua+day
  createdAt: Date;
}

export interface SettingDoc {
  key: string;
  value: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
