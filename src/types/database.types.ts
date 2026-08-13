/**
 * DB の型定義。
 * スキーマを変更したら、以下のコマンドで再生成できます:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.types.ts
 *
 * ⚠️ ここは必ず `type`（`interface` ではなく）で書くこと。
 *    interface は暗黙のインデックスシグネチャを持たないため、
 *    supabase-js の `Record<string, unknown>` 制約を満たさず、
 *    クエリの結果型が `never` に落ちます。
 */

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'completion_requested'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type VolunteerStatus = 'draft' | 'published' | 'closed';
export type UserRole = 'user' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Volunteer = {
  id: string;
  title: string;
  description: string;
  category: string;
  area: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  points: number;
  max_capacity: number;
  current_applicants: number;
  deadline: string;
  beginner_friendly: boolean;
  status: VolunteerStatus;
  org_name: string;
  org_description: string;
  org_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  user_id: string;
  volunteer_id: string;
  status: ApplicationStatus;
  applied_at: string;
  approved_at: string | null;
  completion_requested_at: string | null;
  completed_at: string | null;
  awarded_points: number | null;
  celebrated_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PointTransaction = {
  id: string;
  user_id: string;
  application_id: string | null;
  points: number;
  reason: string;
  created_at: string;
};

/** マイページ用: 応募 + 案件 */
export type ApplicationWithVolunteer = Application & { volunteer: Volunteer };
/** 管理画面の応募者一覧用: 応募 + ユーザー */
export type ApplicationWithProfile = Application & { profile: Profile };

type Table<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      volunteers: Table<Volunteer>;
      applications: Table<Application>;
      point_transactions: Table<PointTransaction>;
    };
    Views: { [_ in never]: never };
    Functions: {
      apply_to_volunteer: { Args: { p_volunteer_id: string }; Returns: Application };
      cancel_application: { Args: { p_application_id: string }; Returns: Application };
      request_completion: { Args: { p_application_id: string }; Returns: Application };
      mark_points_celebrated: { Args: { p_application_ids: string[] }; Returns: undefined };
      admin_approve_application: { Args: { p_application_id: string }; Returns: Application };
      admin_reject_application: {
        Args: { p_application_id: string; p_note?: string | null };
        Returns: Application;
      };
      admin_complete_application: { Args: { p_application_id: string }; Returns: Application };
      admin_revert_completion_request: {
        Args: { p_application_id: string; p_note?: string | null };
        Returns: Application;
      };
      admin_set_user_active: {
        Args: { p_user_id: string; p_active: boolean };
        Returns: Profile;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
