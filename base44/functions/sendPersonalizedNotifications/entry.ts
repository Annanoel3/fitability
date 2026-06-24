import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify admin (optional — remove if calling from automation)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    
    if (!onesignalAppId || !onesignalApiKey) {
      return Response.json({ error: 'OneSignal credentials missing' }, { status: 500 });
    }

    // Fetch all users with profiles
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const allProfiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 1000);

    const now = new Date();
    const notificationsSent = { inactive_3d: 0, inactive_5d: 0, inactive_weekly: 0, coach_weekly: 0 };

    for (const profile of allProfiles) {
      const userEmail = allUsers.find(u => u.id === profile.created_by_id)?.email;
      if (!userEmail) continue;

      const lastActivity = profile.last_activity_date ? new Date(profile.last_activity_date) : null;
      const daysSinceActivity = lastActivity ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)) : 999;

      // INACTIVE USER LOGIC
      if (daysSinceActivity >= 3) {
        // 3-day inactivity notification
        if (daysSinceActivity >= 3 && daysSinceActivity < 5) {
          const last3dNotif = profile.last_inactivity_notification_3d ? new Date(profile.last_inactivity_notification_3d) : null;
          const daysSinceLast3d = last3dNotif ? Math.floor((now - last3dNotif) / (1000 * 60 * 60 * 24)) : 999;

          if (daysSinceLast3d > 7) {
            // Send 3-day notification
            const message = buildInactivityMessage(profile, 3);
            await sendOneSignalNotification(onesignalAppId, onesignalApiKey, userEmail, message, "3-day inactivity");
            
            // Update last sent time
            await base44.asServiceRole.entities.UserProfile.update(profile.id, {
              last_inactivity_notification_3d: now.toISOString()
            });
            notificationsSent.inactive_3d++;
          }
        }
        // 5-day inactivity notification
        else if (daysSinceActivity >= 5) {
          const last5dNotif = profile.last_inactivity_notification_5d ? new Date(profile.last_inactivity_notification_5d) : null;
          const daysSinceLast5d = last5dNotif ? Math.floor((now - last5dNotif) / (1000 * 60 * 60 * 24)) : 999;

          if (daysSinceLast5d > 7) {
            // Send 5-day notification
            const message = buildInactivityMessage(profile, 5);
            await sendOneSignalNotification(onesignalAppId, onesignalApiKey, userEmail, message, "5-day inactivity");
            
            await base44.asServiceRole.entities.UserProfile.update(profile.id, {
              last_inactivity_notification_5d: now.toISOString()
            });
            notificationsSent.inactive_5d++;
          }
          // Weekly inactivity notification (for 5+ day inactive)
          else {
            const lastWeeklyNotif = profile.last_inactivity_notification_weekly ? new Date(profile.last_inactivity_notification_weekly) : null;
            const daysSinceLastWeekly = lastWeeklyNotif ? Math.floor((now - lastWeeklyNotif) / (1000 * 60 * 60 * 24)) : 999;

            if (daysSinceLastWeekly > 7) {
              const message = buildInactivityMessage(profile, 7);
              await sendOneSignalNotification(onesignalAppId, onesignalApiKey, userEmail, message, "weekly inactivity");
              
              await base44.asServiceRole.entities.UserProfile.update(profile.id, {
                last_inactivity_notification_weekly: now.toISOString()
              });
              notificationsSent.inactive_weekly++;
            }
          }
        }
      }
      // ACTIVE USER LOGIC (opened app within 2–3 days)
      else if (daysSinceActivity <= 3 && daysSinceActivity >= 0) {
        const lastCoachNotif = profile.last_coach_reminder_notification ? new Date(profile.last_coach_reminder_notification) : null;
        const daysSinceLastCoachNotif = lastCoachNotif ? Math.floor((now - lastCoachNotif) / (1000 * 60 * 60 * 24)) : 999;

        if (daysSinceLastCoachNotif > 7) {
          const message = buildCoachReminderMessage(profile);
          await sendOneSignalNotification(onesignalAppId, onesignalApiKey, userEmail, message, "coach reminder");
          
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            last_coach_reminder_notification: now.toISOString()
          });
          notificationsSent.coach_weekly++;
        }
      }
    }

    return Response.json({ 
      success: true,
      message: "Notification batch sent",
      sent: notificationsSent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildInactivityMessage(profile, daysSinceActive) {
  const displayName = profile.display_name || "there";
  const goals = (profile.goals || []).slice(0, 2).join(" and ");
  const abilities = Object.entries(profile.current_abilities || {})
    .filter(([_, v]) => v)
    .map(([k, _]) => k.replace(/_/g, " "))
    .slice(0, 2);

  let message = `Hey ${displayName}! 💪`;
  
  if (daysSinceActive === 3) {
    message += ` We miss you!\n\nEven a short session works for your abilities. `;
    if (goals) message += `Your goal is to ${goals}. `;
    message += `Get back in and let's keep the momentum going!`;
  } else if (daysSinceActive === 5) {
    message += ` It's been 5 days!\n\nYour body doesn't need to be perfect—it just needs movement. `;
    if (abilities.length > 0) {
      message += `You can ${abilities.join(", ")}—that's your starting point. `;
    }
    message += `Open the app and grab a workout tailored for you.`;
  } else {
    message += ` 1 week without moving!\n\nWe get it—life happens. But your adaptive exercises are waiting. `;
    if (abilities.length > 0) {
      message += `Start small with what you CAN do. `;
    }
    message += `Your body will thank you!`;
  }

  return message;
}

function buildCoachReminderMessage(profile) {
  const displayName = profile.display_name || "there";
  const mode = profile.fitness_mode || "Standard";
  
  let message = `Hey ${displayName}! 👋\n\nDoing great with consistency! `;
  
  if (mode === "Wheelchair") {
    message += `Your coach can help fine-tune wheelchair exercises or just chat about how you're feeling. `;
  } else if (mode === "Chair") {
    message += `Your coach is ready to tweak seated exercises or discuss your progress. `;
  } else {
    message += `Your coach can adjust your workouts or chat about your fitness journey. `;
  }
  
  message += `Pop into Coach Chat anytime! 🚀`;
  
  return message;
}

async function sendOneSignalNotification(appId, apiKey, userEmail, message, type) {
  const payload = {
    app_id: appId,
    filters: [
      { field: "email", value: userEmail }
    ],
    headings: { en: "FitAbility" },
    contents: { en: message },
    priority: 10,
    data: { notification_type: type }
  };

  try {
    const resp = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.error(`OneSignal error for ${userEmail}:`, await resp.text());
    }
  } catch (e) {
    console.error(`Failed to send OneSignal notification:`, e.message);
  }
}