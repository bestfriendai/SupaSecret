import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { Report, ReportState, CreateReportRequest } from "../types/report";

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: [],
      isLoading: false,
      error: null,

      createReport: async (reportRequest: CreateReportRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          // Get current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error("User must be authenticated to create a report");
          }

          // Validate that either confessionId or replyId is provided
          if (!reportRequest.confessionId && !reportRequest.replyId) {
            throw new Error("Either confessionId or replyId must be provided");
          }

          if (reportRequest.confessionId && reportRequest.replyId) {
            throw new Error("Cannot report both confession and reply at the same time");
          }

          // Create the report in Supabase
          const { data, error } = await supabase
            .from('reports')
            .insert({
              confession_id: reportRequest.confessionId || null,
              reply_id: reportRequest.replyId || null,
              reporter_user_id: user.id,
              reason: reportRequest.reason,
              additional_details: reportRequest.additionalDetails || null,
            })
            .select()
            .single();

          if (error) {
            // Handle duplicate report error
            if (error.code === '23505') {
              throw new Error("You have already reported this content");
            }
            throw error;
          }

          // Convert database format to app format
          const newReport: Report = {
            id: data.id,
            confessionId: data.confession_id || undefined,
            replyId: data.reply_id || undefined,
            reporterUserId: data.reporter_user_id,
            reason: data.reason,
            additionalDetails: data.additional_details || undefined,
            status: data.status,
            createdAt: data.created_at,
            reviewedAt: data.reviewed_at || undefined,
            reviewedBy: data.reviewed_by || undefined,
          };

          // Add to local state
          set((state) => ({
            reports: [newReport, ...state.reports],
            isLoading: false,
          }));

        } catch (error) {
          console.error('Error creating report:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create report',
            isLoading: false 
          });
          throw error;
        }
      },

      getUserReports: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Get current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error("User must be authenticated to view reports");
          }

          // Fetch user's reports
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('reporter_user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Convert database format to app format
          const reports: Report[] = data.map((item) => ({
            id: item.id,
            confessionId: item.confession_id || undefined,
            replyId: item.reply_id || undefined,
            reporterUserId: item.reporter_user_id,
            reason: item.reason,
            additionalDetails: item.additional_details || undefined,
            status: item.status,
            createdAt: item.created_at,
            reviewedAt: item.reviewed_at || undefined,
            reviewedBy: item.reviewed_by || undefined,
          }));

          set({ reports, isLoading: false });

        } catch (error) {
          console.error('Error fetching reports:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch reports',
            isLoading: false 
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "report-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist reports, not loading/error states
      partialize: (state) => ({ reports: state.reports }),
    }
  )
);
