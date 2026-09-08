import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  public isConnected = false;

  async onModuleInit() {
    await this.initializeClient();
  }

  public async initializeClient(): Promise<boolean> {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Prefer secret/service-role key for backend operations, fallback to publishable
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Database credentials missing in backend/.env. Running with local in-memory fallback.',
      );
      return false;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Quick ping test to verify connection
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        // Table might not exist yet if schema hasn't been run
        this.logger.warn(
          `Database reached but query returned: ${error.message}. Please run schema migration. Using resilient fallback.`,
        );
        this.isConnected = true; // Connection is valid even if table needs migration
      } else {
        this.isConnected = true;
        this.logger.log('Connected to database successfully.');
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to connect to database: ${err?.message}`);
      this.isConnected = false;
      return false;
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getStatus() {
    return {
      configured: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)),
      connected: this.isConnected,
      url: process.env.SUPABASE_URL || null,
    };
  }

  // --- Data Access Helpers ---

  async findUserByIdentifier(identifier: string) {
    if (!this.client || !this.isConnected) return null;
    try {
      const lower = identifier.toLowerCase().trim();
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .or(`email.ilike.${lower},phone.eq.${lower}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.debug(`Supabase user lookup notice: ${error.message}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  async upsertUser(user: any) {
    if (!this.client || !this.isConnected) return null;
    try {
      const { data, error } = await this.client
        .from('users')
        .upsert(user, { onConflict: 'email' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      this.logger.warn(`Supabase upsertUser failed: ${err.message}`);
      return null;
    }
  }

  async getSavedLocations() {
    if (!this.client || !this.isConnected) return [];
    try {
      const { data, error } = await this.client
        .from('saved_locations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  async saveLocation(loc: any) {
    if (!this.client || !this.isConnected) return null;
    try {
      const { data, error } = await this.client
        .from('saved_locations')
        .insert(loc)
        .select()
        .single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }

  async getTasks() {
    if (!this.client || !this.isConnected) return [];
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  async createTask(task: any) {
    if (!this.client || !this.isConnected) return null;
    try {
      const { data, error } = await this.client
        .from('tasks')
        .insert(task)
        .select()
        .single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }
}
