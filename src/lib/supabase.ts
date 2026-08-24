import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("SEU-PROJETO") && !anonKey.includes("SUA_ANON_KEY")
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

export type RaffleSettings = {
  id: boolean;
  title: string;
  price: number;
  quantity: number;
  prize_percent: number;
  draw_date: string;
  instagram_1: string;
  instagram_2: string;
  pix_key: string;
  pix_name: string;
  pix_city: string;
  pix_copy_paste?: string | null;
  intro: string;
};

export type Ticket = {
  number: number;
  status: "available" | "pending" | "paid";
  reservation_id: string | null;
};

export type Reservation = {
  id: string;
  buyer_name: string;
  relationship: string;
  message: string | null;
  quantity: number;
  total_amount: number;
  status: "pending" | "paid" | "cancelled";
  ticket_numbers: number[];
  created_at: string;
};
