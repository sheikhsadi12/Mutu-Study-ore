import { createClient } from '@supabase/supabase-js';

// Exam Routine JSON Array Example
export const EXAM_ROUTINE = [
  { "date": "2026-07-02", "subject": "কুরআন মাজিদ", "group": "all", "notification_msg": "আগামীকাল কুরআন মাজিদ পরীক্ষা। ভালোভাবে প্রস্তুতি নাও!" },
  { "date": "2026-07-03", "subject": "পদার্থবিজ্ঞান", "group": "science", "notification_msg": "আগামীকাল পদার্থবিজ্ঞান পরীক্ষা। সূত্রগুলো ভালো করে রিভাইস দাও।" }
];

export async function triggerDailyExamNotifications() {
  // Initialize Supabase Client (Preferably use Service Role Key if running on a secure backend/Edge Function to bypass RLS)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing.");
    return { success: false, error: "Missing credentials" };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Determine "Next Day" Date (Format: YYYY-MM-DD)
  // Note: Adjust timezone logic if necessary based on your server's locale
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDayString = tomorrow.toISOString().split('T')[0];

  // 2. Find exams scheduled for tomorrow
  const upcomingExams = EXAM_ROUTINE.filter(exam => exam.date === nextDayString);

  if (upcomingExams.length === 0) {
    console.log(`No exams scheduled for tomorrow (${nextDayString}).`);
    return { success: true, message: "No exams tomorrow." };
  }

  let totalNotified = 0;

  // 3. Process each upcoming exam
  for (const exam of upcomingExams) {
    console.log(`Processing notifications for: ${exam.subject} (Group: ${exam.group})`);

    // 4. Fetch users matching the target group
    // Ensure your 'profiles' table has a 'group' column (e.g., 'science', 'arts', 'commerce', or 'all')
    let query = supabase.from('profiles').select('id, group');
    
    // If the exam is not for 'all', filter by the specific group
    if (exam.group && exam.group.toLowerCase() !== 'all') {
      query = query.eq('group', exam.group);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error("Error fetching users:", usersError);
      continue;
    }

    if (!users || users.length === 0) {
      console.log(`No users found for group: ${exam.group}`);
      continue;
    }

    // 5. Prepare notification payloads
    // Fetch a system bot/admin ID to act as the sender. (Replace with a dedicated Bot UUID if needed)
    const { data: adminData } = await supabase.from('profiles').select('id').eq('email', 'sadishekh671@gmail.com').single();
    const systemSenderId = adminData?.id;

    if (!systemSenderId) {
      console.error("Could not find system/admin user ID to send notifications from.");
      return { success: false, error: "No system sender ID" };
    }

    // Map users to notification objects for bulk insert
    const notificationsToInsert = users.map(user => ({
      sender_id: systemSenderId,
      receiver_id: user.id,
      content: exam.notification_msg || `Reminder: You have a ${exam.subject} exam tomorrow!`,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    // 6. Batch insert notifications into the direct_messages table
    const { error: insertError } = await supabase.from('direct_messages').insert(notificationsToInsert);

    if (insertError) {
      console.error(`Error inserting notifications for ${exam.subject}:`, insertError);
    } else {
      console.log(`Successfully sent ${notificationsToInsert.length} notifications for ${exam.subject}`);
      totalNotified += notificationsToInsert.length;
    }
  }

  return { success: true, notifiedCount: totalNotified, message: `Sent ${totalNotified} notifications for tomorrow's exams.` };
}
