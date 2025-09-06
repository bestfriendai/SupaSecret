import { supabase } from '../lib/supabase';

/**
 * Run the reports table migration directly from the app
 * This function can be called from your app to create the reports table
 */
export async function runReportsMigration(): Promise<boolean> {
  console.log('🚀 Starting reports table migration...');
  
  try {
    // Step 1: Create the reports table
    console.log('📝 Creating reports table...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.reports (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE,
          reply_id uuid REFERENCES public.replies(id) ON DELETE CASCADE,
          reporter_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          reason text NOT NULL CHECK (reason IN (
            'inappropriate_content',
            'spam',
            'harassment',
            'false_information',
            'violence',
            'hate_speech',
            'other'
          )),
          additional_details text,
          status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
          created_at timestamp with time zone DEFAULT now(),
          reviewed_at timestamp with time zone,
          reviewed_by uuid REFERENCES auth.users(id),
          
          CONSTRAINT reports_target_check CHECK (
            (confession_id IS NOT NULL AND reply_id IS NULL) OR
            (confession_id IS NULL AND reply_id IS NOT NULL)
          )
        );
      `
    });

    if (createTableError) {
      console.error('❌ Error creating reports table:', createTableError);
      return false;
    }

    // Step 2: Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
      return false;
    }

    // Step 3: Create RLS policies
    console.log('📋 Creating RLS policies...');
    const policies = [
      {
        name: 'reports_insert_authenticated',
        sql: `
          CREATE POLICY "reports_insert_authenticated" ON public.reports
          FOR INSERT TO authenticated 
          WITH CHECK (reporter_user_id = auth.uid());
        `
      },
      {
        name: 'reports_select_own',
        sql: `
          CREATE POLICY "reports_select_own" ON public.reports
          FOR SELECT TO authenticated 
          USING (reporter_user_id = auth.uid());
        `
      }
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error creating policy ${policy.name}:`, error);
        return false;
      }
    }

    // Step 4: Create indexes
    console.log('⚡ Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS reports_confession_id_idx ON public.reports(confession_id);',
      'CREATE INDEX IF NOT EXISTS reports_reply_id_idx ON public.reports(reply_id);',
      'CREATE INDEX IF NOT EXISTS reports_reporter_user_id_idx ON public.reports(reporter_user_id);',
      'CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);',
      'CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at DESC);',
      `CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_confession_user 
       ON public.reports(reporter_user_id, confession_id) 
       WHERE confession_id IS NOT NULL;`,
      `CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reply_user 
       ON public.reports(reporter_user_id, reply_id) 
       WHERE reply_id IS NOT NULL;`
    ];

    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error creating index:', error);
        return false;
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('🎉 Reports table and all related objects have been created.');
    console.log('📱 You can now test the report functionality in your app.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

/**
 * Alternative migration approach using direct SQL execution
 * Use this if the exec_sql RPC function is not available
 */
export async function runReportsMigrationDirect(): Promise<boolean> {
  console.log('🚀 Starting direct reports table migration...');
  
  try {
    // Try to create the table using a direct insert approach
    // This will fail if the table doesn't exist, which tells us we need to create it
    const { error: testError } = await supabase
      .from('reports')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      // Table doesn't exist, we need to create it manually
      console.log('❌ Reports table does not exist.');
      console.log('📝 Please run the following SQL in your Supabase dashboard:');
      console.log('');
      console.log('Go to: https://supabase.com/dashboard/project/xhtqobjcbjgzxkgfyvdj/sql');
      console.log('');
      console.log('Copy and paste the contents of: supabase/reports-migration.sql');
      console.log('');
      return false;
    } else if (testError) {
      console.error('❌ Error checking reports table:', testError);
      return false;
    } else {
      console.log('✅ Reports table already exists!');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    return false;
  }
}

/**
 * Test the reports table setup
 */
export async function testReportsTable(): Promise<boolean> {
  console.log('🧪 Testing reports table...');
  
  try {
    // Test if we can query the reports table
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Reports table test failed:', error);
      return false;
    }

    console.log('✅ Reports table is accessible!');
    return true;
    
  } catch (error) {
    console.error('❌ Reports table test error:', error);
    return false;
  }
}
