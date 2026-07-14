const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './functions/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('trips')
        .select('status, id, start_time, end_time')
        .order('start_time', { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Recent Trips Statuses:');
    data.forEach(t => console.log(`ID: ${t.id} | Status: '${t.status}' | Start: ${t.start_time} | End: ${t.end_time}`));

    // Check unique statuses
    const statuses = [...new Set(data.map(t => t.status))];
    console.log('\nUnique Statuses found:', statuses);
}

check();
