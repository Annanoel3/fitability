import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get request to extract timezone if provided
    const url = new URL(req.url);
    const providedTz = url.searchParams.get('timezone');

    // Update user's last activity timestamp and timezone if provided
    const profiles = await base44.entities.UserProfile.filter({ created_by_id: user.id });
    if (profiles.length > 0) {
      const updateData = { last_activity_date: new Date().toISOString() };
      if (providedTz) {
        updateData.timezone = providedTz;
      }
      await base44.entities.UserProfile.update(profiles[0].id, updateData);
    }

    // Determine if ad should show based on veteran status and app opens
    const today = new Date().toISOString().split('T')[0];
    const profile = profiles[0];
    const isVeteran = profile?.is_veteran === true;
    
    let showAd = false;
    
    if (!isVeteran) {
      // Non-veterans: ads on 2nd open, then up to 2 times per day max
      let appOpens = parseInt(localStorage.getItem('app_opens') || '0') + 1;
      localStorage.setItem('app_opens', appOpens.toString());
      
      let adsToday = parseInt(localStorage.getItem('ads_today') || '0');
      const lastAdDateForDay = localStorage.getItem('last_ad_day');
      
      if (lastAdDateForDay !== today) {
        adsToday = 0;
        localStorage.setItem('last_ad_day', today);
      }
      
      if ((appOpens === 2 || appOpens > 2) && adsToday < 2) {
        showAd = true;
        adsToday += 1;
        localStorage.setItem('ads_today', adsToday.toString());
      }
    } else {
      // Veterans: one ad every 3 opens, but max once per day
      let veteranOpens = parseInt(localStorage.getItem('veteran_opens') || '0') + 1;
      localStorage.setItem('veteran_opens', veteranOpens.toString());
      
      let adsToday = parseInt(localStorage.getItem('veteran_ads_today') || '0');
      const lastAdDateForDay = localStorage.getItem('veteran_last_ad_day');
      
      if (lastAdDateForDay !== today) {
        adsToday = 0;
        localStorage.setItem('veteran_last_ad_day', today);
      }
      
      if (veteranOpens % 3 === 0 && adsToday < 1) {
        showAd = true;
        adsToday += 1;
        localStorage.setItem('veteran_ads_today', adsToday.toString());
      }
    }

    return Response.json({ success: true, showAd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});