const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const supabaseUrl = 'https://xhtqobjcbjgzxkgfyvdj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupReportsTable() {
  console.log('🚀 Setting up reports table...');
  
  try {
    // Step 1: Create the reports table
    console.log('📝 Creating reports table...');
    const { error: createError } = await supabase.rpc('exec_sql', {
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

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return false;
    }

    // Step 2: Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;'
    });

    // Step 3: Create policies
    console.log('📋 Creating RLS policies...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "reports_insert_authenticated" ON public.reports
        FOR INSERT TO authenticated 
        WITH CHECK (reporter_user_id = auth.uid());
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "reports_select_own" ON public.reports
        FOR SELECT TO authenticated 
        USING (reporter_user_id = auth.uid());
      `
    });

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
      await supabase.rpc('exec_sql', { sql: indexSQL });
    }

    // Step 5: Grant permissions
    console.log('🔑 Setting permissions...');
    await supabase.rpc('exec_sql', {
      sql: 'GRANT SELECT, INSERT ON public.reports TO authenticated;'
    });

    console.log('✅ Reports table setup completed successfully!');
    console.log('🎉 You can now use the report functionality in your app.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Alternative: Direct SQL execution (if RPC doesn't work)
async function setupReportsTableDirect() {
  console.log('🚀 Setting up reports table with direct SQL...');
  
  const sql = `
-- Create reports table
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

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies (drop first if they exist, then create)
DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.reports;
CREATE POLICY "reports_insert_authenticated" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
FOR SELECT TO authenticated
USING (reporter_user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS reports_confession_id_idx ON public.reports(confession_id);
CREATE INDEX IF NOT EXISTS reports_reply_id_idx ON public.reports(reply_id);
CREATE INDEX IF NOT EXISTS reports_reporter_user_id_idx ON public.reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_confession_user 
ON public.reports(reporter_user_id, confession_id) 
WHERE confession_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reply_user 
ON public.reports(reporter_user_id, reply_id) 
WHERE reply_id IS NOT NULL;

-- Grant permissions
GRANT SELECT, INSERT ON public.reports TO authenticated;
  `;

  console.log('📋 SQL to run in Supabase dashboard:');
  console.log('=====================================');
  console.log(sql);
  console.log('=====================================');
  console.log('');
  console.log('📝 Instructions:');
  console.log('1. Go to: https://supabase.com/dashboard/project/xhtqobjcbjgzxkgfyvdj/sql');
  console.log('2. Copy the SQL above');
  console.log('3. Paste it in the SQL Editor');
  console.log('4. Click "Run"');
  console.log('');
}

// Run the setup
if (require.main === module) {
  if (supabaseServiceKey === 'YOUR_SERVICE_KEY_HERE') {
    console.log('⚠️  Service key not provided. Showing SQL to run manually...');
    setupReportsTableDirect();
  } else {
    setupReportsTable()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
      });
  }
}

module.exports = { setupReportsTable, setupReportsTableDirect };
